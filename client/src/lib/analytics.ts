/**
 * نظام التحليلات الخاص بالعميل (Client Analytics)
 * ------------------------------------------------
 * - واجهة بسيطة: track('event_name', { ...props })
 * - يجمّع الأحداث على دفعات ويرسلها للسيرفر (/api/analytics)
 * - يحفظ sessionId محلياً (sessionStorage) لربط الأحداث بنفس الجلسة
 * - يستخدم sendBeacon عند إغلاق الصفحة
 */

const SESSION_KEY = "ai-chat-pro:analytics:sessionId";

interface TrackProps {
  [key: string]: unknown;
}

interface QueuedEvent {
  name: string;
  props?: TrackProps;
  ts: string;
  sessionId: string;
  userId?: string;
}

interface AnalyticsOptions {
  endpoint?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  enabled?: boolean;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getSessionId(): string {
  if (typeof window === "undefined") return makeId();
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = makeId();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return makeId();
  }
}

class ClientAnalytics {
  private endpoint: string;
  private batchSize: number;
  private flushIntervalMs: number;
  private enabled: boolean;
  private sessionId: string;
  private userId?: string;
  private buffer: QueuedEvent[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private installed = false;

  constructor(opts: AnalyticsOptions = {}) {
    const baseUrl = (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? "";
    this.endpoint = opts.endpoint ?? `${baseUrl}/api/analytics`;
    this.batchSize = opts.batchSize ?? 15;
    this.flushIntervalMs = opts.flushIntervalMs ?? 10_000;
    this.enabled = opts.enabled ?? true;
    this.sessionId = getSessionId();
  }

  /** ربط معرّف مستخدم اختياري */
  identify(userId: string) {
    this.userId = userId;
  }

  /** تسجيل حدث */
  track(name: string, props?: TrackProps): void {
    if (!this.enabled || !name) return;
    this.buffer.push({
      name,
      props,
      ts: new Date().toISOString(),
      sessionId: this.sessionId,
      userId: this.userId,
    });
    if (this.buffer.length >= this.batchSize) {
      void this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  /** اختصار لتتبّع زمن العمليات */
  trackTiming(name: string, durationMs: number, props?: TrackProps): void {
    this.track(name, { ...props, durationMs: Math.round(durationMs * 100) / 100 });
  }

  /** تسجيل page_view مع المسار الحالي */
  trackPageView(path?: string): void {
    this.track("page_view", {
      path: path ?? (typeof location !== "undefined" ? location.pathname : ""),
      referrer: typeof document !== "undefined" ? document.referrer : "",
      title: typeof document !== "undefined" ? document.title : "",
    });
  }

  private scheduleFlush() {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.flushIntervalMs);
  }

  /** إرسال الـ buffer للسيرفر */
  async flush(useBeacon = false): Promise<void> {
    if (this.buffer.length === 0) return;
    const events = this.buffer.splice(0, this.buffer.length);
    const payload = JSON.stringify({ events });

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
      // فشل الإرسال لا يكسر التطبيق
    }
  }

  /** ربط الأحداث الافتراضية: page_view + flush عند الإغلاق */
  install(): void {
    if (this.installed || typeof window === "undefined") return;
    this.installed = true;

    this.trackPageView();

    window.addEventListener("beforeunload", () => {
      void this.flush(true);
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        void this.flush(true);
      }
    });
  }
}

export const analytics = new ClientAnalytics();

export function createAnalytics(opts?: AnalyticsOptions) {
  return new ClientAnalytics(opts);
}
