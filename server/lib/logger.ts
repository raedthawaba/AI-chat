/**
 * نظام التسجيل المركزي (Centralized Logging System)
 * ----------------------------------------------------
 * - Production: JSON منظم + كتابة في ملفات يومية (logs/)
 * - Development: ألوان وقراءة سهلة في الـ console
 * - يدعم 4 مستويات: debug | info | warn | error
 * - بدون أي مكتبات خارجية (يستعمل fs المضمّن في Node)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----------------------------------------------------------------------------
// الإعدادات (من متغيرات البيئة)
// ----------------------------------------------------------------------------

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const NODE_ENV = process.env.NODE_ENV ?? "development";
const IS_PROD = NODE_ENV === "production";

const ENV_LEVEL = (process.env.LOG_LEVEL as LogLevel | undefined) ?? (IS_PROD ? "info" : "debug");
const MIN_PRIORITY = LEVEL_PRIORITY[ENV_LEVEL] ?? LEVEL_PRIORITY.info;

const LOG_TO_FILE = (process.env.LOG_TO_FILE ?? (IS_PROD ? "true" : "false")) === "true";
const LOG_DIR = path.resolve(__dirname, "..", "..", process.env.LOG_DIR ?? "logs");

// ألوان ANSI للـ console (تطوير فقط)
const COLORS = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
} as const;

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: COLORS.gray,
  info: COLORS.cyan,
  warn: COLORS.yellow,
  error: COLORS.red,
};

// ----------------------------------------------------------------------------
// إدارة ملفات السجل (Daily Rotation)
// ----------------------------------------------------------------------------

let cachedDate = "";
let appStream: fs.WriteStream | null = null;
let errorStream: fs.WriteStream | null = null;

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getStreams(): { app: fs.WriteStream; err: fs.WriteStream } | null {
  if (!LOG_TO_FILE) return null;

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (today !== cachedDate || !appStream || !errorStream) {
    ensureLogDir();
    appStream?.end();
    errorStream?.end();

    appStream = fs.createWriteStream(path.join(LOG_DIR, `app-${today}.log`), { flags: "a" });
    errorStream = fs.createWriteStream(path.join(LOG_DIR, `error-${today}.log`), { flags: "a" });
    cachedDate = today;
  }

  return { app: appStream, err: errorStream };
}

// ----------------------------------------------------------------------------
// تنسيق الرسائل
// ----------------------------------------------------------------------------

interface LogEntry {
  ts: string;
  level: LogLevel;
  module?: string;
  message: string;
  meta?: Record<string, unknown>;
  requestId?: string;
}

function formatPretty(entry: LogEntry): string {
  const color = LEVEL_COLORS[entry.level];
  const tag = `${color}${COLORS.bold}[${entry.level.toUpperCase()}]${COLORS.reset}`;
  const time = `${COLORS.gray}${entry.ts}${COLORS.reset}`;
  const mod = entry.module ? ` ${COLORS.magenta}(${entry.module})${COLORS.reset}` : "";
  const reqId = entry.requestId ? ` ${COLORS.gray}[req=${entry.requestId}]${COLORS.reset}` : "";
  const meta =
    entry.meta && Object.keys(entry.meta).length > 0
      ? ` ${COLORS.gray}${JSON.stringify(entry.meta)}${COLORS.reset}`
      : "";
  return `${time} ${tag}${mod}${reqId} ${entry.message}${meta}`;
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

// ----------------------------------------------------------------------------
// دالة الكتابة الأساسية
// ----------------------------------------------------------------------------

function write(level: LogLevel, message: string, meta?: Record<string, unknown>, module?: string, requestId?: string): void {
  if (LEVEL_PRIORITY[level] < MIN_PRIORITY) return;

  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    module,
    requestId,
    message,
    meta,
  };

  // 1) Console
  const line = IS_PROD ? formatJson(entry) : formatPretty(entry);
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }

  // 2) ملفات (إن كان مفعّلاً)
  const streams = getStreams();
  if (streams) {
    const jsonLine = formatJson(entry) + "\n";
    streams.app.write(jsonLine);
    if (level === "error" || level === "warn") {
      streams.err.write(jsonLine);
    }
  }
}

// ----------------------------------------------------------------------------
// واجهة الـ Logger العامة
// ----------------------------------------------------------------------------

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown> | Error): void;
  child(bindings: { module?: string; requestId?: string }): Logger;
}

function buildLogger(boundModule?: string, boundRequestId?: string): Logger {
  return {
    debug: (msg, meta) => write("debug", msg, meta, boundModule, boundRequestId),
    info: (msg, meta) => write("info", msg, meta, boundModule, boundRequestId),
    warn: (msg, meta) => write("warn", msg, meta, boundModule, boundRequestId),
    error: (msg, meta) => {
      // قبول Error كـ meta وتحويله إلى كائن قابل للتسلسل
      const safe =
        meta instanceof Error
          ? { name: meta.name, message: meta.message, stack: meta.stack }
          : meta;
      write("error", msg, safe, boundModule, boundRequestId);
    },
    child: (bindings) =>
      buildLogger(bindings.module ?? boundModule, bindings.requestId ?? boundRequestId),
  };
}

/** الـ logger الافتراضي (singleton) */
export const logger: Logger = buildLogger();

// ----------------------------------------------------------------------------
// التقاط الأخطاء غير المعالجة (آخر خط دفاع)
// ----------------------------------------------------------------------------

process.on("uncaughtException", (err) => {
  logger.error("uncaughtException", err);
});

process.on("unhandledRejection", (reason) => {
  logger.error("unhandledRejection", reason instanceof Error ? reason : { reason: String(reason) });
});

// إغلاق نظيف للملفات عند الخروج
function flushAndExit(signal: string) {
  logger.info("server shutting down", { signal });
  appStream?.end();
  errorStream?.end();
}
process.on("SIGINT", () => flushAndExit("SIGINT"));
process.on("SIGTERM", () => flushAndExit("SIGTERM"));
