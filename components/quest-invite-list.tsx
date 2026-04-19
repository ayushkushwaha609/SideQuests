"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, Check, Clock } from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

export type InviteFriend = {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
  level: number;
  status: "available" | "pending" | "accepted" | "declined";
};

export default function QuestInviteList({
  questId,
  friends,
}: {
  questId: string;
  friends: InviteFriend[];
}) {
  const [items, setItems] = useState(friends);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!pusherClient) return;
    const channel = pusherClient.subscribe(`quest-invite-status-${questId}`);

    channel.bind("invite-status", (data: { userId: string; status: "accepted" | "declined" | "pending" }) => {
      setItems((prev) => prev.map((item) =>
        item.id === data.userId ? { ...item, status: data.status } : item
      ));
    });

    return () => {
      pusherClient.unsubscribe(`quest-invite-status-${questId}`);
    };
  }, [questId]);

  async function invite(friendId: string) {
    if (sendingId) return;
    setSendingId(friendId);
    try {
      const res = await fetch(`/api/quests/${questId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ friendId }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) =>
          prev.map((f) =>
            f.id === friendId ? { ...f, status: data.status ?? "pending" } : f
          )
        );
      }
    } finally {
      setSendingId(null);
    }
  }

  return (
    <div className="seamless-stack">
      {items.map((f) => (
        <div
          key={f.id}
          className="seamless-item seamless-item-compact"
          style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {f.avatarUrl ? (
              <img
                src={f.avatarUrl}
                alt={f.username}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <span>👤</span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <Link href={`/profile/${f.username}`} style={{ textDecoration: "none" }}>
              <div style={{ fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
                {f.displayName ?? f.username}
              </div>
            </Link>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Level {f.level}</div>
          </div>
          {f.status === "accepted" ? (
            <div className="badge badge-completed" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={12} /> Member
            </div>
          ) : f.status === "pending" ? (
            <div className="badge badge-one-time" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Clock size={12} /> Pending
            </div>
          ) : f.status === "declined" ? (
            <div className="badge badge-one-time" style={{ display: "flex", alignItems: "center", gap: 4 }}>
              Rejected
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => invite(f.id)}
              disabled={sendingId === f.id}
            >
              <UserPlus size={14} /> Invite
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
