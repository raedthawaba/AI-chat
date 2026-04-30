/**
 * نظام تسجيل العميل (Client-side Logger)
 * ----------------------------------------
 * - واجهة مماثلة للـ logger في السيرفر (debug/info/warn/error)
 * - يطبع في console المتصفح أثناء التطوير
 * - يجمّع الأخطاء والتحذيرات في batch ويرسلها للسيرفر (/api/logs)
 * - يلتقط أخطاء window.onerror و unhandledrejection تلقائياً
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  meta?: Record<string, unknown>;
  ts: string;
  url: string;
}

interface LoggerOptions {
  /** المسار الكامل لاستقبال السجلات على السيرفر */
  endpoint?: string;
  /** كم من الإدخالات نتراكم قبل الإرسال */
  batchSize?: number;
  /** كم millisecond ننتظر قبل flush تلقائي */
  flushIntervalMs?: number;
  /** أدنى مستوى يتم إرساله للسيرفر */
  remoteLevel?: LogLevel;
}

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const IS_DEV = import.meta.env?.DEV ?? false;

class ClientLogger {
  private endpoint: string;
  private batchSize: number;
  private flushIntervalMs: number;
  private remotePriority: number;
  private buffer: LogEntry[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private installed = false;

  constructor(opts: LoggerOptions = {}) {
    const baseUrl = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? "";
    this.endpoint = opts.endpoint ?? `${baseUrl}/api/logs`;
    this.batchSize = opts.batchSize ?? 20;
    this.flushIntervalMs = opts.flushIntervalMs ?? 5000;
    const remote: LogLevel = opts.remoteLevel ?? (IS_DEV ? "warn" : "info");
    this.remotePriority = LEVEL_PRIORITY[remote];
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.log("debug", message, meta);
  }
  info(message: string, meta?: Record<string, unknown>) {
    this.log("info", message, meta);
  }
  warn(message: string, meta?: Record<string, unknown>) {
    this.log("warn", message, meta);
  }
  error(message: string, meta?: Record<string, unknown> | Error) {
    const safe =
      meta instanceof Error
        ? { name: meta.name, message: meta.message, stack: meta.stack }
        : meta;
    this.log("error", message, safe);
  }

  private log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    // 1) console (دائماً في dev، فقط warn/error في prod)
    if (IS_DEV || LEVEL_PRIORITY[level] >= LEVEL_PRIORITY.warn) {
      const fn =
        level === "error"
          ? console.error
          : level === "warn"
            ? console.warn
            : level === "debug"
              ? console.debug
              : console.log;
      fn(`[${level.toUpperCase()}]`, message, meta ?? "");
    }

    // 2) buffer للإرسال للسيرفر
    if (LEVEL_PRIORITY[level] >= this.remotePriority) {
      this.buffer.push({
        level,
        message,
        meta,
        ts: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : "",
      });
      if (this.buffer.length >= this.batchSize) {
        void this.flush();
      } else {
        this.scheduleFlush();
      }
    }
  }

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.flushIntervalMs);
  }

  /** إرسال الـ buffer الحالي للسيرفر (يستعمل sendBeacon عند إغلاق الصفحة) */
  async flush(useBeacon = false): Promise<void> {
    if (this.buffer.length === 0) return;
    const entries = this.buffer.splice(0, this.buffer.length);
    const payload = JSON.stringify({ entries });

    try {
      if (useBeacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(this.endpoint, blob);
        return;
      }
      await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    } catch {
      // فشل إرسال السجلات لا يجب أن يكسر التطبيق
      // (نتجنّب console.error هنا حتى لا ندخل في loop)
    }
  }

  /** ربط window.onerror و unhandledrejection و beforeunload */
  install() {
    if (this.installed || typeof window === "undefined") return;
    this.installed = true;

    window.addEventListener("error", (event) => {
      this.error("window.onerror", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      const reason = event.reason;
      this.error("unhandledrejection", {
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
      });
    });

    window.addEventListener("beforeunload", () => {
      void this.flush(true);
    });

    // بعض المتصفحات لا تطلق beforeunload في mobile — استخدم visibilitychange
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        void this.flush(true);
      }
    });
  }
}

/** الـ logger الافتراضي (singleton) */
export const logger = new ClientLogger();

/** للحالات المتقدمة يمكن إنشاء instance مخصص */
export function createLogger(opts?: LoggerOptions) {
  return new ClientLogger(opts);
}
