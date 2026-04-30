/**
 * نقطة استقبال سجلات العميل (Client → Server logs)
 * --------------------------------------------------
 * يستقبل دفعات من الـ logs من الواجهة الأمامية (errors, warnings)
 * ويعيد كتابتها بنفس نظام التسجيل المركزي على السيرفر.
 */

import type { Request, Response, Router } from "express";
import { Router as createRouter } from "express";
import { logger, type LogLevel } from "../lib/logger.js";

interface ClientLogEntry {
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  ts?: string;
  url?: string;
}

const ALLOWED_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];
const MAX_BATCH = 50;
const MAX_MESSAGE_LEN = 2000;

export function createLogsRouter(): Router {
  const router = createRouter();
  const clientLog = logger.child({ module: "client" });

  router.post("/", (req: Request, res: Response) => {
    const body = req.body as { entries?: ClientLogEntry[] } | ClientLogEntry;
    const entries = Array.isArray((body as any)?.entries)
      ? (body as { entries: ClientLogEntry[] }).entries
      : [body as ClientLogEntry];

    if (!entries || entries.length === 0) {
      return res.status(400).json({ error: "no entries" });
    }
    if (entries.length > MAX_BATCH) {
      return res.status(413).json({ error: `too many entries (max ${MAX_BATCH})` });
    }

    let accepted = 0;
    for (const entry of entries) {
      if (!entry || typeof entry.message !== "string") continue;
      const level: LogLevel = ALLOWED_LEVELS.includes(entry.level) ? entry.level : "info";
      const message = entry.message.slice(0, MAX_MESSAGE_LEN);
      clientLog[level](message, {
        ...entry.meta,
        clientTs: entry.ts,
        clientUrl: entry.url,
        requestId: req.requestId,
      });
      accepted++;
    }

    res.status(204).end();
    void accepted;
  });

  return router;
}
