/**
 * مسار التحليلات (Analytics Endpoint)
 * -----------------------------------
 * - POST /api/analytics       → استقبال أحداث من العميل (دفعة)
 * - GET  /api/analytics/summary → ملخّص حيّ من الذاكرة
 */

import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { track, getSummary, type EventName } from "../lib/analytics.js";

interface ClientAnalyticsEvent {
  name: EventName;
  props?: Record<string, unknown>;
  ts?: string;
  sessionId?: string;
  userId?: string;
}

const MAX_BATCH = 50;
const MAX_NAME_LEN = 80;

export function createAnalyticsRouter(): Router {
  const router = createRouter();

  router.post("/", (req: Request, res: Response) => {
    const body = req.body as
      | { events?: ClientAnalyticsEvent[] }
      | ClientAnalyticsEvent;
    const events = Array.isArray((body as any)?.events)
      ? (body as { events: ClientAnalyticsEvent[] }).events
      : [body as ClientAnalyticsEvent];

    if (!events || events.length === 0) {
      return res.status(400).json({ error: "no events" });
    }
    if (events.length > MAX_BATCH) {
      return res.status(413).json({ error: `too many events (max ${MAX_BATCH})` });
    }

    let accepted = 0;
    for (const e of events) {
      if (!e || typeof e.name !== "string" || e.name.length === 0) continue;
      const name = e.name.slice(0, MAX_NAME_LEN);
      track(name, e.props, {
        sessionId: e.sessionId,
        userId: e.userId,
        requestId: req.requestId,
        source: "client",
      });
      accepted++;
    }

    res.status(202).json({ accepted });
  });

  router.get("/summary", (_req: Request, res: Response) => {
    const s = getSummary();
    // نحسب المتوسط بشكل آمن
    const avgChatMs =
      s.latency.chatStream.count > 0
        ? Math.round((s.latency.chatStream.sumMs / s.latency.chatStream.count) * 100) / 100
        : 0;
    res.json({
      ...s,
      latency: {
        chatStream: {
          ...s.latency.chatStream,
          avgMs: avgChatMs,
          minMs: s.latency.chatStream.minMs === Infinity ? 0 : s.latency.chatStream.minMs,
        },
      },
    });
  });

  return router;
}
