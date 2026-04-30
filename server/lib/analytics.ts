/**
 * نظام التحليلات (Analytics System)
 * ----------------------------------
 * - يبني على نفس فلسفة الـ logger: بدون مكتبات خارجية
 * - يحفظ الأحداث كـ JSONL (سطر واحد لكل حدث) في analytics-YYYY-MM-DD.jsonl
 * - يحتفظ بعدّادات في الذاكرة لاستعلام سريع عبر /api/analytics/summary
 * - مصمم ليكون pluggable: يمكن إضافة sinks خارجية لاحقاً (GA4, Plausible, ...)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------------------------------
// الأنواع
// ----------------------------------------------------------------------------

export type EventName =
  | "page_view"
  | "chat_sent"
  | "chat_received"
  | "chat_error"
  | "feature_used"
  | "error"
  | string; // نسمح بأحداث مخصّصة

export interface AnalyticsEvent {
  name: EventName;
  props?: Record<string, unknown>;
  ts: string;
  sessionId?: string;
  userId?: string;
  source: "server" | "client";
  requestId?: string;
}

/** Sink قابل للاستبدال — يمكن إرسال الأحداث لخدمة خارجية لاحقاً */
export type AnalyticsSink = (event: AnalyticsEvent) => void | Promise<void>;

// ----------------------------------------------------------------------------
// الإعدادات
// ----------------------------------------------------------------------------

const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_PROD = NODE_ENV === "production";
const ENABLED = (process.env.ANALYTICS_ENABLED ?? "true") === "true";
const PERSIST_TO_FILE =
  (process.env.ANALYTICS_TO_FILE ?? (IS_PROD ? "true" : "true")) === "true";
const ANALYTICS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  process.env.ANALYTICS_DIR ?? "logs"
);

// ----------------------------------------------------------------------------
// إدارة الكتابة (Daily Rotation)
// ----------------------------------------------------------------------------

let cachedDate = "";
let stream: fs.WriteStream | null = null;

function ensureDir(): void {
  if (!fs.existsSync(ANALYTICS_DIR)) {
    fs.mkdirSync(ANALYTICS_DIR, { recursive: true });
  }
}

function getStream(): fs.WriteStream | null {
  if (!PERSIST_TO_FILE) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (today !== cachedDate || !stream) {
    ensureDir();
    stream?.end();
    stream = fs.createWriteStream(
      path.join(ANALYTICS_DIR, `analytics-${today}.jsonl`),
      { flags: "a" }
    );
    cachedDate = today;
  }
  return stream;
}

// ----------------------------------------------------------------------------
// عدّادات في الذاكرة (rolling counters)
// ----------------------------------------------------------------------------

interface Summary {
  startedAt: string;
  totalEvents: number;
  byName: Record<string, number>;
  bySource: { server: number; client: number };
  uniqueSessions: number;
  uniqueUsers: number;
  latency: {
    chatStream: { count: number; sumMs: number; minMs: number; maxMs: number };
  };
  errors: number;
  lastEvents: AnalyticsEvent[]; // آخر 50 حدث
}

const MAX_LAST_EVENTS = 50;

const summary: Summary = {
  startedAt: new Date().toISOString(),
  totalEvents: 0,
  byName: {},
  bySource: { server: 0, client: 0 },
  uniqueSessions: 0,
  uniqueUsers: 0,
  latency: {
    chatStream: { count: 0, sumMs: 0, minMs: Infinity, maxMs: 0 },
  },
  errors: 0,
  lastEvents: [],
};

const seenSessions = new Set<string>();
const seenUsers = new Set<string>();

function updateSummary(event: AnalyticsEvent): void {
  summary.totalEvents++;
  summary.byName[event.name] = (summary.byName[event.name] ?? 0) + 1;
  summary.bySource[event.source]++;

  if (event.sessionId && !seenSessions.has(event.sessionId)) {
    seenSessions.add(event.sessionId);
    summary.uniqueSessions++;
  }
  if (event.userId && !seenUsers.has(event.userId)) {
    seenUsers.add(event.userId);
    summary.uniqueUsers++;
  }

  if (event.name === "chat_received" && typeof event.props?.durationMs === "number") {
    const ms = event.props.durationMs as number;
    const l = summary.latency.chatStream;
    l.count++;
    l.sumMs += ms;
    if (ms < l.minMs) l.minMs = ms;
    if (ms > l.maxMs) l.maxMs = ms;
  }

  if (event.name === "chat_error" || event.name === "error") {
    summary.errors++;
  }

  summary.lastEvents.push(event);
  if (summary.lastEvents.length > MAX_LAST_EVENTS) {
    summary.lastEvents.shift();
  }
}

// ----------------------------------------------------------------------------
// Sinks
// ----------------------------------------------------------------------------

const sinks: AnalyticsSink[] = [];

/** تسجيل sink مخصّص (مفيد للاختبارات أو خدمات خارجية) */
export function registerSink(sink: AnalyticsSink): () => void {
  sinks.push(sink);
  return () => {
    const i = sinks.indexOf(sink);
    if (i >= 0) sinks.splice(i, 1);
  };
}

// ----------------------------------------------------------------------------
// الواجهة العامة
// ----------------------------------------------------------------------------

export interface TrackOptions {
  sessionId?: string;
  userId?: string;
  requestId?: string;
  source?: "server" | "client";
}

/** تسجيل حدث واحد */
export function track(
  name: EventName,
  props?: Record<string, unknown>,
  opts: TrackOptions = {}
): void {
  if (!ENABLED) return;

  const event: AnalyticsEvent = {
    name,
    props,
    ts: new Date().toISOString(),
    sessionId: opts.sessionId,
    userId: opts.userId,
    requestId: opts.requestId,
    source: opts.source ?? "server",
  };

  // 1) ذاكرة
  updateSummary(event);

  // 2) ملف JSONL
  try {
    const s = getStream();
    if (s) s.write(JSON.stringify(event) + "\n");
  } catch (err) {
    logger.error("analytics file write failed", err as Error);
  }

  // 3) Sinks خارجية
  for (const sink of sinks) {
    try {
      void sink(event);
    } catch (err) {
      logger.error("analytics sink failed", err as Error);
    }
  }
}

/** Helper مختصر لتتبّع زمن العملية */
export function trackTiming(
  name: EventName,
  startHrTime: bigint,
  props?: Record<string, unknown>,
  opts?: TrackOptions
): void {
  const durationMs = Number(process.hrtime.bigint() - startHrTime) / 1_000_000;
  track(name, { ...props, durationMs: Math.round(durationMs * 100) / 100 }, opts);
}

/** الحصول على لقطة من الـ summary الحالي */
export function getSummary(): Summary {
  // نُرجع نسخة لتجنّب التعديل من الخارج
  return JSON.parse(JSON.stringify(summary));
}

/** إعادة ضبط (مفيد للاختبارات) */
export function _resetForTests(): void {
  summary.totalEvents = 0;
  summary.byName = {};
  summary.bySource = { server: 0, client: 0 };
  summary.uniqueSessions = 0;
  summary.uniqueUsers = 0;
  summary.latency.chatStream = { count: 0, sumMs: 0, minMs: Infinity, maxMs: 0 };
  summary.errors = 0;
  summary.lastEvents = [];
  seenSessions.clear();
  seenUsers.clear();
  sinks.length = 0;
}
