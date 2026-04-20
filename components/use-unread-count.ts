"use client";

import { useEffect, useState } from "react";

let cachedCount = 0;
let lastUpdatedAt = 0;
let timerId: number | null = null;
let inFlight = false;
const subscribers = new Set<(count: number) => void>();
const POLL_INTERVAL_MS = 30000;
const FOCUS_REVALIDATE_MS = 5000;

function notify(count: number) {
  subscribers.forEach((listener) => listener(count));
}

async function refreshUnread() {
  if (inFlight) return;
  inFlight = true;
  try {
    const res = await fetch("/api/messages/unread", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const next = Number(data.count ?? 0);
    if (Number.isFinite(next) && next !== cachedCount) {
      cachedCount = next;
      lastUpdatedAt = Date.now();
      notify(cachedCount);
    } else if (Number.isFinite(next)) {
      lastUpdatedAt = Date.now();
    }
  } catch {
    // Ignore network errors; retry on next interval.
  } finally {
    inFlight = false;
  }
}

function startPolling() {
  if (timerId !== null) return;
  timerId = window.setInterval(() => {
    if (document.visibilityState !== "visible") return;
    refreshUnread();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (timerId === null) return;
  window.clearInterval(timerId);
  timerId = null;
}

function setupVisibilityHandlers() {
  const onFocus = () => {
    if (Date.now() - lastUpdatedAt > FOCUS_REVALIDATE_MS) {
      refreshUnread();
    }
  };

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      refreshUnread();
      startPolling();
    } else {
      stopPolling();
    }
  };

  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

let teardownVisibility: (() => void) | null = null;

export function useUnreadCount(initial = 0) {
  const [count, setCount] = useState(() => (cachedCount ? cachedCount : initial));

  useEffect(() => {
    cachedCount = Number.isFinite(initial) ? initial : 0;
    setCount(cachedCount);
  }, [initial]);

  useEffect(() => {
    const listener = (next: number) => setCount(next);
    subscribers.add(listener);

    if (subscribers.size === 1) {
      refreshUnread();
      startPolling();
      teardownVisibility = setupVisibilityHandlers();
    } else {
      setCount(cachedCount);
    }

    return () => {
      subscribers.delete(listener);
      if (subscribers.size === 0) {
        stopPolling();
        teardownVisibility?.();
        teardownVisibility = null;
      }
    };
  }, []);

  return count;
}
