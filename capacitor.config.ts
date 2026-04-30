/**
 * إعداد Capacitor — تحويل تطبيق الويب إلى APK
 * ============================================
 *
 * يوجد وضعان للاستخدام:
 *
 * 1) وضع الـ "Live URL" (الموصى به للتجربة السريعة):
 *    افتح المتغيّر CAPACITOR_SERVER_URL وضع رابط النشر (مثلاً https://my-app.replit.app)
 *    سيكون الـ APK مجرّد غلاف يفتح الموقع المنشور — تحديثاتك على السيرفر تظهر فوراً.
 *
 * 2) وضع "Bundled" (افتراضي):
 *    شغّل `pnpm build` ثم `pnpm cap:sync` — سيتم تعبئة الواجهة داخل الـ APK.
 *    ملاحظة: يحتاج هذا الوضع رابط API خارجي (VITE_API_BASE_URL) لأنّ السيرفر لا يُعبّأ.
 */

import type { CapacitorConfig } from "@capacitor/cli";

const liveUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.aichatpro.app",
  appName: "AI Chat Pro",
  webDir: "dist/public",

  // إذا تمّ تعيين رابط مباشر، يفتح التطبيق الموقع المنشور بدلاً من الملفات المحلية
  ...(liveUrl
    ? {
        server: {
          url: liveUrl,
          cleartext: false,
        },
      }
    : {}),

  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: process.env.NODE_ENV !== "production",
  },

  // شاشة البداية (Splash) — تظهر عند فتح التطبيق
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0f172a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#6366f1",
    },
  },
};

export default config;
