/**
 * اختبارات نظام التحليلات على السيرفر
 */
import { describe, it, expect, beforeEach } from "vitest";
import { track, trackTiming, getSummary, registerSink, _resetForTests } from "./analytics.js";
import type { AnalyticsEvent } from "./analytics.js";

describe("server analytics", () => {
  beforeEach(() => {
    _resetForTests();
  });

  it("should record a simple event in the summary", () => {
    track("page_view", { path: "/" });
    const s = getSummary();
    expect(s.totalEvents).toBe(1);
    expect(s.byName.page_view).toBe(1);
    expect(s.bySource.server).toBe(1);
  });

  it("should track unique sessions and users", () => {
    track("chat_sent", {}, { sessionId: "sess-1", userId: "user-A" });
    track("chat_sent", {}, { sessionId: "sess-1", userId: "user-A" });
    track("chat_sent", {}, { sessionId: "sess-2", userId: "user-B" });
    const s = getSummary();
    expect(s.uniqueSessions).toBe(2);
    expect(s.uniqueUsers).toBe(2);
  });

  it("should aggregate latency for chat_received events", () => {
    track("chat_received", { durationMs: 100 });
    track("chat_received", { durationMs: 300 });
    track("chat_received", { durationMs: 200 });
    const s = getSummary();
    expect(s.latency.chatStream.count).toBe(3);
    expect(s.latency.chatStream.minMs).toBe(100);
    expect(s.latency.chatStream.maxMs).toBe(300);
    expect(s.latency.chatStream.sumMs).toBe(600);
  });

  it("should count errors", () => {
    track("chat_error", { message: "boom" });
    track("error", { message: "bad" });
    track("chat_received", { durationMs: 10 });
    const s = getSummary();
    expect(s.errors).toBe(2);
  });

  it("trackTiming should compute durationMs from hrtime", async () => {
    const start = process.hrtime.bigint();
    await new Promise((r) => setTimeout(r, 10));
    trackTiming("chat_received", start);
    const s = getSummary();
    expect(s.latency.chatStream.count).toBe(1);
    expect(s.latency.chatStream.sumMs).toBeGreaterThanOrEqual(8);
  });

  it("should call registered sinks", () => {
    const received: AnalyticsEvent[] = [];
    registerSink((e) => {
      received.push(e);
    });
    track("feature_used", { feature: "copy" });
    expect(received).toHaveLength(1);
    expect(received[0].name).toBe("feature_used");
    expect(received[0].props).toEqual({ feature: "copy" });
  });

  it("should keep only the last 50 events in lastEvents", () => {
    for (let i = 0; i < 60; i++) track("page_view", { i });
    const s = getSummary();
    expect(s.lastEvents).toHaveLength(50);
    expect((s.lastEvents[0].props as any).i).toBe(10);
  });
});
