/**
 * إعداد Vitest الموحّد
 * --------------------
 * - بيئة node افتراضياً (لاختبارات السيرفر)
 * - بيئة jsdom للملفات داخل client/ (لاختبارات React)
 * - يحمّل setup مشترك لـ jest-dom + mocks للمتصفح
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["client/**/*.{test,spec}.{ts,tsx}", "jsdom"],
    ],
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    include: [
      "client/**/*.{test,spec}.{ts,tsx}",
      "server/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: ["node_modules", "dist", "build"],
    silent: false,
    testTimeout: 10_000,
  },
});
