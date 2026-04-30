import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { logger } from "./lib/logger";
import { analytics } from "./lib/analytics";

// تثبيت معالجات الأخطاء العامة (window.onerror, unhandledrejection, beforeunload)
logger.install();
logger.info("app boot", {
  env: import.meta.env.MODE,
  ua: navigator.userAgent,
});

// تثبيت التحليلات (يسجّل page_view + flush تلقائي عند إغلاق الصفحة)
analytics.install();

// تسجيل Service Worker لدعم PWA + إمكانية التثبيت كتطبيق
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => logger.info("sw registered", { scope: reg.scope }))
      .catch((err) => logger.warn("sw register failed", { err: String(err) }));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
