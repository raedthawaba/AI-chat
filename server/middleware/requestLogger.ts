/**
 * Express Middleware للتسجيل التلقائي لطلبات HTTP
 * --------------------------------------------------
 * - يولّد requestId فريد لكل طلب (correlation ID)
 * - يضيف req.log و req.requestId
 * - يسجّل بداية ونهاية كل طلب مع المدة وحالة الاستجابة
 * - يعرّض الـ requestId في الـ response header (X-Request-Id)
 */

import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";
import { logger, type Logger } from "../lib/logger.js";

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      log: Logger;
    }
  }
}

/** يحدد ما إذا كان المسار يجب تجاهله من السجل (مثل static assets) */
function shouldSkip(url: string): boolean {
  return (
    url.startsWith("/assets/") ||
    url.startsWith("/__manus__/") ||
    url === "/favicon.ico"
  );
}

export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1) requestId قابل للتمرير من العميل أو يولد جديد
    const incoming = req.header("x-request-id");
    const requestId = incoming && incoming.length <= 64 ? incoming : randomUUID();
    req.requestId = requestId;
    req.log = logger.child({ requestId, module: "http" });
    res.setHeader("X-Request-Id", requestId);

    if (shouldSkip(req.url)) {
      return next();
    }

    const startedAt = process.hrtime.bigint();

    req.log.info("request started", {
      method: req.method,
      url: req.url,
      ip: req.ip,
      ua: req.header("user-agent"),
    });

    res.on("finish", () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const meta = {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      };
      if (res.statusCode >= 500) {
        req.log.error("request failed", meta);
      } else if (res.statusCode >= 400) {
        req.log.warn("request completed with client error", meta);
      } else {
        req.log.info("request completed", meta);
      }
    });

    next();
  };
}

/**
 * Middleware لمعالجة الأخطاء المركزية
 * يُستخدم بعد كل مسارات الـ API
 */
export function errorLogger() {
  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    (req.log ?? logger).error("unhandled route error", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: "Internal Server Error",
        requestId: req.requestId,
      });
    }
  };
}
