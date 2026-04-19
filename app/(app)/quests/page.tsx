"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Users, Zap, ChevronRight } from "lucide-react";

type Recurrence = "daily" | "weekly" | "monthly" | "yearly" | "lifetime" | "one-time";

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

const TABS: { label: string; value: Recurrence | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Lifetime", value: "lifetime" },
];

export default function QuestsPage() {
  const [activeTab, setActiveTab] = useState<Recurrence | "all">("all");
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    fetchQuests();
  }, [activeTab]);

  async function fetchQuests() {
    setLoading(true);
    const params = activeTab !== "all" ? `?recurrence=${activeTab}` : "";
    const res = await fetch(`/api/quests${params}`);
    const data = await res.json();
    setQuests(data.quests ?? []);
    setLoading(false);
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
