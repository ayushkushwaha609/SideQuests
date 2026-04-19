"use client";

import { useCallback } from "react";
import type { KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star, Zap } from "lucide-react";
import CommentToggle from "@/components/comment-toggle";

type ActivityActor = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type ActivityQuest = {
  id: string;
  title: string;
  description: string | null;
  coverEmoji: string;
  recurrence: string;
  xpReward: number;
};

type ActivityCardProps = {
  activityType: string;
  timeLabel: string;
  actor: ActivityActor;
  quest?: ActivityQuest | null;
  variant: "friends" | "public";
};

export default function ActivityCard({ activityType, timeLabel, actor, quest, variant }: ActivityCardProps) {
  const router = useRouter();
  const displayName = actor.displayName ?? actor.username;
  const isQuestCompletion = activityType === "quest_completed" && !!quest;

  const handleNavigate = useCallback(() => {
    if (!isQuestCompletion || !quest) return;
    router.push(`/quests/${quest.id}`);
  }, [isQuestCompletion, quest, router]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!isQuestCompletion || !quest) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(`/quests/${quest.id}`);
    }
  }, [isQuestCompletion, quest, router]);

  const cardClassName = `seamless-item animate-slide-up stagger-item${isQuestCompletion ? " quest-tile-link" : ""}`;

  return (
    <div
      className={cardClassName}
      onClick={isQuestCompletion ? handleNavigate : undefined}
      onKeyDown={isQuestCompletion ? handleKeyDown : undefined}
      role={isQuestCompletion ? "button" : undefined}
      tabIndex={isQuestCompletion ? 0 : undefined}
    >
      {/* Header */}
      <div className="flex items-center gap-1" style={{ gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
        <Link
          href={`/profile/${actor.username}`}
          style={{ textDecoration: "none" }}
          onClick={(event) => event.stopPropagation()}
        >
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {actor.avatarUrl ? <img src={actor.avatarUrl} alt={actor.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
          </div>
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.875rem", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href={`/profile/${actor.username}`}
              style={{ fontWeight: "var(--weight-bold)", color: "var(--text-primary)", textDecoration: "none" }}
              onClick={(event) => event.stopPropagation()}
            >
              {displayName}
            </Link>
            <span style={{ color: "var(--text-secondary)" }}>
              {activityType === "quest_completed" && (variant === "public" ? "shared a quest win ⚔️" : "completed a quest ⚔️")}
              {activityType === "achievement_earned" && "earned a badge 🏅"}
              {activityType === "friend_joined" && "joined SideQuest!"}
            </span>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 2 }}>{timeLabel}</div>
        </div>
      </div>

      {/* Quest Context Block */}
      {isQuestCompletion && quest && (
        <div className="quest-tile quest-tile-compact" style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <span style={{ fontSize: "1.5rem" }}>{quest.coverEmoji}</span>
          <div>
            <div style={{ fontWeight: "var(--weight-semibold)", color: "var(--text-primary)", fontSize: "0.95rem" }}>
              {quest.title}
            </div>
            {quest.description && (
              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {quest.description}
              </div>
            )}
            <div className="flex items-center gap-1" style={{ gap: "var(--space-2)", marginTop: 6 }}>
              <span className={`badge badge-${quest.recurrence}`}>{quest.recurrence}</span>
              <span style={{ color: "var(--xp-purple-light)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 3 }}>
                <Zap size={11} fill="var(--xp-purple-light)" color="var(--xp-purple-light)" />
                {quest.xpReward} XP
              </span>
            </div>
          </div>
        </div>
      )}

      {activityType === "achievement_earned" && (
        <div className="quest-tile quest-tile-compact" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
          <Star size={24} color="var(--streak-amber)" />
          <div style={{ fontWeight: "var(--weight-medium)", color: "var(--streak-amber-light)", fontSize: "0.95rem" }}>
            New Achievement Unlocked
          </div>
        </div>
      )}

      {/* Comments */}
      {isQuestCompletion && quest && (
        <div onClick={(event) => event.stopPropagation()}>
          <CommentToggle questId={quest.id} />
        </div>
      )}
    </div>
  );
}
