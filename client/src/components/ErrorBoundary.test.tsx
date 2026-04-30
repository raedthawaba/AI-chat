/**
 * اختبار مكوّن ErrorBoundary
 * - يتأكّد أنّه يعرض الـ fallback عند انهيار الابن
 * - يتأكّد أنّه يستدعي logger.error
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ErrorBoundary from "./ErrorBoundary";
import { logger } from "@/lib/logger";

function Boom(): never {
  throw new Error("intentional");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(logger, "error").mockImplementation(() => {});
    // اخفاء console.error من React عند الخطأ المتعمّد
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders the fallback UI when a child throws", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByText(/حدث خطأ غير متوقع/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /إعادة تحميل/ })).toBeInTheDocument();
  });

  it("forwards the error to the central logger", () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(logger.error).toHaveBeenCalled();
    const call = (logger.error as any).mock.calls[0];
    expect(call[0]).toMatch(/ErrorBoundary/);
    expect(call[1].message).toBe("intentional");
  });

  it("renders children normally when there is no error", () => {
    render(
      <ErrorBoundary>
        <div>healthy child</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("healthy child")).toBeInTheDocument();
  });
});
