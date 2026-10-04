/**
 * TEDUHATI service worker.
 *
 * Deliberately small. It caches the app shell and static assets so the app
 * opens without a connection, and it never caches an authenticated page or an
 * API response — a parent must not be shown another session's data, and an
 * activity list cached yesterday would be wrong today.
 */

const VERSION = "teduhati-v1";
const SHELL = ["/id", "/en", "/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  // Static assets: cache first, they are content-hashed.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  // Pages: network first, falling back to the cached shell when offline.
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((hit) => hit ?? caches.match("/id")),
    ),
  );
});
