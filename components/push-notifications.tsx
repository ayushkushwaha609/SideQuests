"use client";
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type PermissionStatus = "default" | "granted" | "denied" | "unsupported";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

export default function PushNotificationsCard() {
  const [permission, setPermission] = useState<PermissionStatus>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission as PermissionStatus);

    if (Notification.permission === "granted") {
      ensureSubscription();
    }
  }, []);

  async function ensureSubscription(forceSubscribe = false) {
    if (!vapidPublicKey) return;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription && forceSubscribe) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    if (subscription) {
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      setSubscribed(true);
    }
  }

  async function handleEnable() {
    if (!vapidPublicKey) {
      alert("Missing VAPID public key. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to enable notifications.");
      return;
    }

    setLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionStatus);
      if (result !== "granted") return;

      await ensureSubscription(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/notifications/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
    } finally {
      setLoading(false);
    }
  }

  const isBlocked = permission === "denied";
  const isUnsupported = permission === "unsupported";

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <div className="btn-icon" aria-hidden="true">
          {subscribed ? <Bell size={18} /> : <BellOff size={18} />}
        </div>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: "var(--weight-semibold)" }}>Push notifications</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Get notified about friend requests, messages, and quest completions.
          </p>
        </div>
      </div>

      {isUnsupported ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Your browser does not support push notifications.
        </p>
      ) : isBlocked ? (
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Notifications are blocked in your browser settings.
        </p>
      ) : (
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          {!subscribed ? (
            <button className="btn btn-primary btn-sm" onClick={handleEnable} disabled={loading}>
              {loading ? "Enabling..." : "Enable notifications"}
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" onClick={handleDisable} disabled={loading}>
              {loading ? "Disabling..." : "Disable notifications"}
            </button>
          )}
          <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
            Status: {subscribed ? "Enabled" : "Not enabled"}
          </span>
        </div>
      )}
    </div>
  );
}
