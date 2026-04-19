"use client";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Zap, MessageCircle, Sun, Moon } from "lucide-react";

interface AppHeaderProps {
  xp?: number;
  level?: number;
  streak?: number;
  unreadMessages?: number;
}

export default function AppHeader({ xp = 0, level = 1, streak = 0, unreadMessages = 0 }: AppHeaderProps) {
    const unreadLabel = unreadMessages > 9 ? "9+" : String(unreadMessages);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const xpForCurrentLevel = (level - 1) * 100;
  const xpForNextLevel = level * 100;
  const xpProgress = xp - xpForCurrentLevel;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const fillPercent = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      return;
    }
    const prefersLight = window.matchMedia?.("(prefers-color-scheme: light)").matches;
    setTheme(prefersLight ? "light" : "dark");
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  return (
    <header className="app-header">
      <Link href="/" className="app-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none" }}>
        <span style={{ fontSize: "1.4rem" }}>⚔️</span>
        <span
          className="app-title-text"
          style={{
            fontWeight: "var(--weight-bold)",
            fontSize: "0.95rem",
            color: "var(--text-primary)",
            letterSpacing: "0.08em",
            fontFamily: "var(--font-display)",
          }}
        >
          SideQuest
        </span>
      </Link>

      <div className="app-header-actions" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        {/* XP & level */}
        <div className="app-xp" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", minWidth: 100 }}>
          <div className="app-xp-text" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
        <Link
          href="/messages"
          className="icon-badge"
          style={{ color: "var(--text-muted)" }}
          aria-label={unreadMessages > 0 ? `Messages, ${unreadMessages} unread` : "Messages"}
        >
          <MessageCircle size={20} />
          {unreadMessages > 0 && (
            <span className="badge-pill" aria-hidden="true">{unreadLabel}</span>
          )}
        </Link>
        <button
          type="button"
          className="btn-icon theme-toggle"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {mounted && theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <UserButton userProfileMode="navigation" userProfileUrl="/settings" />
      </div>
    </header>
  );
}
