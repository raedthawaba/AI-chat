/**
 * Service Worker بسيط لـ AI Chat Pro
 * --------------------------------------------
 * - يخزّن أصول الواجهة (الـ shell) للعمل دون اتصال
 * - استراتيجية: network-first للـ API و cache-first للأصول الساكنة
 * - يدعم تحديث تلقائي عند نشر إصدار جديد
 */

const CACHE_VERSION = "v1";
const CACHE_NAME = `ai-chat-pro-${CACHE_VERSION}`;
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

// تثبيت: تخزين الـ shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
      .then(() => self.skipWaiting()),
  );
});

// تفعيل: حذف الكاشات القديمة
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

// جلب: استراتيجية حسب نوع الطلب
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // طلبات API: network-first مع fallback للكاش
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // لا نحفظ ردود الـ stream أو الأخطاء
          if (res.ok && !res.headers.get("content-type")?.includes("event-stream")) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((r) => r ?? new Response("offline", { status: 503 }))),
    );
    return;
  }

  // الأصول الساكنة: cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        if (res.ok && url.origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
        }
        return res;
      }).catch(() => caches.match("/"));
    }),
  );
});

// رسالة من الصفحة لتفعيل تحديث فوري
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
