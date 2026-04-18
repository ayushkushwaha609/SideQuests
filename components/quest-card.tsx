import Link from "next/link";
import { Zap, ChevronRight } from "lucide-react";

export default function QuestCard({ quest, isOwner = false, members = [] }: { quest: any, isOwner?: boolean, members?: any[] }) {
  return (
    <Link
      href={`/quests/${quest.id}`}
      className="animate-slide-up stagger-item quest-tile-link"
    >
      <div
        className={`quest-tile${quest.status === "completed" ? " quest-tile-completed" : ""}`}
        style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}
      >
        
        {/* Emoji + content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="flex items-center gap-1" style={{ gap: "var(--space-2)", marginBottom: 4 }}>
            <span style={{ fontSize: "1.2rem" }}>{quest.coverEmoji ?? "⚔️"}</span>
            <div style={{
              fontWeight: "var(--weight-medium)",
              color: quest.status === "completed" ? "var(--text-muted)" : "var(--text-primary)",
              fontSize: "0.95rem",
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
              textDecoration: quest.status === "completed" ? "line-through" : "none",
            }}>
              {quest.title}
            </div>
          </div>
          <div className="flex items-center gap-1" style={{ gap: "var(--space-2)", marginTop: 4 }}>
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
  );
}
