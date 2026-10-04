"use client";

import { useEffect } from "react";

/** Registers the service worker in production only, so dev reloads stay honest. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const timer = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // An unavailable service worker is not worth surfacing to a parent.
      });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
