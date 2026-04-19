"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Users, Zap, ChevronRight, Check, X } from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

type Recurrence = "daily" | "weekly" | "monthly" | "yearly" | "lifetime" | "one-time";
type TabValue = Recurrence | "all" | "invites";

interface Quest {
  id: string;
  title: string;
  description: string | null;
  recurrence: Recurrence;
  status: string;
  xpReward: number;
  coverEmoji: string | null;
  createdAt: Date;
  memberCount?: number;
}

interface InviteItem {
  inviteId: string;
  questId: string;
  title: string;
  coverEmoji: string | null;
  recurrence: Recurrence;
  xpReward: number;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string | null;
}

const TABS: { label: string; value: TabValue }[] = [
  { label: "All", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Lifetime", value: "lifetime" },
  { label: "Invites", value: "invites" },
];

export default function QuestsPage() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [invites, setInvites] = useState<InviteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "invites") {
      fetchInvites();
    } else {
      fetchQuests();
    }
  }, [activeTab]);

  useEffect(() => {
    if (!pusherClient || !currentUserId || activeTab !== "invites") return;
    const channel = pusherClient.subscribe(`private-quest-invites-${currentUserId}`);

    channel.bind("invite-created", () => {
      fetchInvites();
    });

    channel.bind("invite-updated", () => {
      fetchInvites();
    });

    return () => {
      pusherClient.unsubscribe(`private-quest-invites-${currentUserId}`);
    };
  }, [activeTab, currentUserId]);

  useEffect(() => {
    if (!currentUserId) {
      fetch("/api/me")
        .then((res) => res.json())
        .then((data) => setCurrentUserId(data.user?.id ?? null))
        .catch(() => setCurrentUserId(null));
    }
  }, [currentUserId]);

  async function fetchQuests() {
    setLoading(true);
    const params = activeTab !== "all" ? `?recurrence=${activeTab}` : "";
    const res = await fetch(`/api/quests${params}`);
    const data = await res.json();
    setQuests(data.quests ?? []);
    setLoading(false);
  }

  async function fetchInvites() {
    setLoading(true);
    const res = await fetch("/api/quests/invites");
    const data = await res.json();
    const rows = (data.invites ?? []) as Array<any>;
    setInvites(
      rows.map((row) => ({
        inviteId: row.invite.id,
        questId: row.quest.id,
        title: row.quest.title,
        coverEmoji: row.quest.coverEmoji,
        recurrence: row.quest.recurrence,
        xpReward: row.quest.xpReward,
        creatorName: row.creator?.displayName ?? row.creator?.username ?? "Unknown",
        creatorUsername: row.creator?.username ?? "unknown",
        creatorAvatar: row.creator?.avatarUrl ?? null,
      }))
    );
    setLoading(false);
  }

  async function respondToInvite(inviteId: string, accept: boolean) {
    await fetch(`/api/quests/invites/${inviteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    setInvites((prev) => prev.filter((item) => item.inviteId !== inviteId));
    if (accept) {
      fetchQuests();
    }
  }

  async function completeQuest(questId: string, e: React.MouseEvent) {
    e.preventDefault();
    setCompleting(questId);
    await fetch(`/api/quests/${questId}/complete`, { method: "POST" });
    await fetchQuests();
    setCompleting(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="flex items-center justify-between">
        <h1>Sidequests</h1>
        <Link href="/quests/new" className="btn btn-primary btn-sm">+ New</Link>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            className={`tab-item${activeTab === tab.value ? " active" : ""}`}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Quest list */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      ) : activeTab === "invites" ? (
        invites.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📨</div>
            <h3>No pending invites</h3>
            <p>Quest invites will appear here.</p>
          </div>
        ) : (
          <div className="seamless-stack">
            {invites.map((invite) => (
              <div key={invite.inviteId} className="seamless-item seamless-item-compact">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <div style={{ fontSize: "1.6rem" }}>{invite.coverEmoji ?? "⚔️"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>
                      {invite.title}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginTop: 4 }}>
                      <span className={`badge badge-${invite.recurrence}`}>{invite.recurrence}</span>
                      <span style={{ color: "var(--xp-purple-light)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 3 }}>
                        <Zap size={11} fill="var(--xp-purple-light)" color="var(--xp-purple-light)" />
                        {invite.xpReward} XP
                      </span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                      invited by {invite.creatorName}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <button className="btn btn-primary btn-sm" onClick={() => respondToInvite(invite.inviteId, true)}>
                      <Check size={14} /> Accept
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => respondToInvite(invite.inviteId, false)}>
                      <X size={14} /> Decline
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: "var(--space-2)" }}>
                  <Link href={`/quests/${invite.questId}`} className="btn btn-ghost btn-sm" style={{ gap: "var(--space-2)" }}>
                    View quest
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : quests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚔️</div>
          <h3>No quests here</h3>
          <p>Create your first sidequest to get started!</p>
          <Link href="/quests/new" className="btn btn-primary">Create Quest</Link>
        </div>
      ) : (
        <div className="seamless-stack">
          {quests.map((quest, i) => (
            <Link
              key={quest.id}
              href={`/quests/${quest.id}`}
              className="animate-slide-up stagger-item quest-tile-link"
            >
              <div
                className={`quest-tile quest-tile-compact${quest.status === "completed" ? " quest-tile-completed" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
              >
                {/* Complete button */}
                <button
                  onClick={(e) => completeQuest(quest.id, e)}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}
                  aria-label="complete quest"
                >
                  {quest.status === "completed" ? (
                    <CheckCircle2 size={26} color="var(--success)" />
                  ) : completing === quest.id ? (
                    <Circle size={26} color="var(--xp-purple)" style={{ animation: "pulse-glow 1s infinite" }} />
                  ) : (
                    <Circle size={26} color="var(--text-muted)" />
                  )}
                </button>

                {/* Emoji + content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-1" style={{ gap: "var(--space-2)", marginBottom: 4 }}>
                    <span style={{ fontSize: "1.1rem" }}>{quest.coverEmoji ?? "⚔️"}</span>
                    <div style={{
                      fontWeight: "var(--weight-medium)",
                      color: quest.status === "completed" ? "var(--text-muted)" : "var(--text-primary)",
                      fontSize: "0.9375rem",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textDecoration: quest.status === "completed" ? "line-through" : "none",
                    }}>
                      {quest.title}
                    </div>
                  </div>
                  <div className="flex items-center gap-1" style={{ gap: "var(--space-2)" }}>
                    <span className={`badge badge-${quest.recurrence}`}>{quest.recurrence}</span>
                    <span style={{ color: "var(--xp-purple-light)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 3 }}>
                      <Zap size={11} fill="var(--xp-purple-light)" color="var(--xp-purple-light)" />
                      {quest.xpReward} XP
                    </span>
                  </div>
                </div>

                <ChevronRight size={18} color="var(--text-muted)" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
