/**
 * اختبارات نظام التحليلات على العميل (jsdom)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createAnalytics } from "./analytics";

describe("client analytics", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    fetchSpy = vi.fn(async () => new Response(null, { status: 202 }));
    // @ts-expect-error - test override
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flushes when batch size reached", async () => {
    const a = createAnalytics({ batchSize: 2, flushIntervalMs: 60_000 });
    a.track("page_view", { path: "/" });
    expect(fetchSpy).not.toHaveBeenCalled();
    a.track("page_view", { path: "/about" });
    // microtask to allow async flush
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.events).toHaveLength(2);
    expect(body.events[0].name).toBe("page_view");
  });

  it("flushes after the configured interval", async () => {
    vi.useFakeTimers();
    const a = createAnalytics({ batchSize: 100, flushIntervalMs: 1000 });
    a.track("feature_used", { feature: "copy" });
    expect(fetchSpy).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1100);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("persists session id across instances", () => {
    const a = createAnalytics();
    a.track("a");
    const stored = sessionStorage.getItem("ai-chat-pro:analytics:sessionId");
    expect(stored).toBeTruthy();

    const b = createAnalytics();
    b.track("b");
    const stored2 = sessionStorage.getItem("ai-chat-pro:analytics:sessionId");
    expect(stored2).toBe(stored);
  });

  it("identify attaches userId to subsequent events", async () => {
    const a = createAnalytics({ batchSize: 1, flushIntervalMs: 60_000 });
    a.identify("user-42");
    a.track("login");
    await new Promise((r) => setTimeout(r, 10));
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.events[0].userId).toBe("user-42");
  });

  it("disabled mode does not send events", async () => {
    const a = createAnalytics({ enabled: false, batchSize: 1 });
    a.track("page_view");
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
