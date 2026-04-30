/**
 * إعداد عام يعمل قبل كل ملف اختبار
 * - يحمّل matchers الخاصة بـ jest-dom (toBeInTheDocument ...)
 * - يضع بعض الـ mocks الأساسية للمتصفح
 */

import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// تنظيف DOM بعد كل اختبار
afterEach(() => {
  cleanup();
});

// Mock لمتغيرات البيئة الخاصة بـ Vite (للاختبارات في بيئة node-only)
if (typeof globalThis.fetch !== "function") {
  // @ts-expect-error - polyfill بسيط لاختبارات قد تحتاج fetch
  globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 }));
}

// scrollIntoView غير معرّف في jsdom
if (typeof window !== "undefined") {
  if (!("scrollIntoView" in Element.prototype)) {
    Element.prototype.scrollIntoView = function () {};
  }
  if (!("ResizeObserver" in window)) {
    // @ts-expect-error - polyfill بسيط
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!("matchMedia" in window)) {
    // @ts-expect-error - polyfill بسيط
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}
