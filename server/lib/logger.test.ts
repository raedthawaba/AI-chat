/**
 * اختبارات الـ logger الخاص بالسيرفر
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("server logger", () => {
  let stdoutWrite: ReturnType<typeof vi.spyOn>;
  let stderrWrite: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stdoutWrite = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    stderrWrite = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutWrite.mockRestore();
    stderrWrite.mockRestore();
  });

  it("should write info to stdout", async () => {
    const { logger } = await import("./logger.js");
    logger.info("hello world");
    expect(stdoutWrite).toHaveBeenCalled();
    const args = stdoutWrite.mock.calls.map((c) => c[0]).join("");
    expect(args).toContain("hello world");
  });

  it("should write errors to stderr", async () => {
    const { logger } = await import("./logger.js");
    logger.error("boom", new Error("explosion"));
    expect(stderrWrite).toHaveBeenCalled();
    const args = stderrWrite.mock.calls.map((c) => c[0]).join("");
    expect(args).toContain("boom");
    expect(args).toContain("explosion");
  });

  it("should support child loggers with bound module + requestId", async () => {
    const { logger } = await import("./logger.js");
    const child = logger.child({ module: "test-mod", requestId: "abc-123" });
    child.warn("careful");
    const args = [...stdoutWrite.mock.calls.flat(), ...stderrWrite.mock.calls.flat()].join("");
    expect(args).toContain("careful");
    expect(args).toContain("test-mod");
    expect(args).toContain("abc-123");
  });

  it("should serialize Error objects safely in error()", async () => {
    const { logger } = await import("./logger.js");
    const err = new Error("nope");
    logger.error("op failed", err);
    const args = stderrWrite.mock.calls.map((c) => c[0]).join("");
    expect(args).toContain("nope");
  });
});
