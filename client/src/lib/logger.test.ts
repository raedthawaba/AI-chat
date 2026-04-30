/**
 * اختبارات الـ logger الخاص بالعميل (jsdom)
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createLogger } from "./logger";

describe("client logger", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn(async () => new Response(null, { status: 204 }));
    // @ts-expect-error - test override
    globalThis.fetch = fetchSpy;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does NOT send debug entries by default in dev (remote level >= warn)", async () => {
    const log = createLogger({ batchSize: 1, flushIntervalMs: 60_000 });
    log.debug("verbose");
    log.info("ok");
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("sends warnings and errors to the server", async () => {
    const log = createLogger({ batchSize: 1, flushIntervalMs: 60_000, remoteLevel: "warn" });
    log.warn("careful");
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.entries[0].level).toBe("warn");
    expect(body.entries[0].message).toBe("careful");
  });

  it("serializes Error objects in error()", async () => {
    const log = createLogger({ batchSize: 1, flushIntervalMs: 60_000, remoteLevel: "error" });
    log.error("boom", new Error("kaboom"));
    await new Promise((r) => setTimeout(r, 10));
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
    expect(body.entries[0].meta.message).toBe("kaboom");
    expect(body.entries[0].meta.name).toBe("Error");
  });

  it("respects custom remoteLevel", async () => {
    const log = createLogger({ batchSize: 1, flushIntervalMs: 60_000, remoteLevel: "info" });
    log.info("hello");
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("does not crash if the server is unreachable", async () => {
    fetchSpy.mockRejectedValueOnce(new Error("network down"));
    const log = createLogger({ batchSize: 1, flushIntervalMs: 60_000, remoteLevel: "info" });
    expect(() => log.info("ping")).not.toThrow();
    await new Promise((r) => setTimeout(r, 10));
    expect(fetchSpy).toHaveBeenCalled();
  });
});
