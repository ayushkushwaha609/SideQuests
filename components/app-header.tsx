"use client";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Zap, MessageCircle } from "lucide-react";

interface AppHeaderProps {
  xp?: number;
  level?: number;
  streak?: number;
}

export default function AppHeader({ xp = 0, level = 1, streak = 0 }: AppHeaderProps) {
  const xpForCurrentLevel = (level - 1) * 100;
  const xpForNextLevel = level * 100;
  const xpProgress = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const fillPercent = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

  return (
    <header className="app-header">
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none" }}>
        <span style={{ fontSize: "1.4rem" }}>⚔️</span>
        <span style={{ fontWeight: "var(--weight-bold)", fontSize: "1.1rem", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          SideQuest
        </span>
      </Link>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        {/* XP & level */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", minWidth: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <Zap size={12} color="var(--xp-purple-light)" fill="var(--xp-purple-light)" />
            <span style={{ fontSize: "0.75rem", fontWeight: "var(--weight-medium)", color: "var(--xp-purple-light)" }}>
              Lv {level} · {xp} XP
            </span>
            {streak > 0 && (
              <span style={{ fontSize: "0.75rem", marginLeft: 4 }}>🔥{streak}</span>
            )}
          </div>
          <div className="xp-bar-track" style={{ width: 100 }}>
            <div className="xp-bar-fill" style={{ width: `${fillPercent}%` }} />
          </div>
        </div>
        <Link href="/messages" style={{ color: "var(--text-muted)" }}>
          <MessageCircle size={20} />
        </Link>
        <UserButton />
      </div>
    </header>
  );
}
