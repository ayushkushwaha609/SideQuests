"use client";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Zap, MessageCircle, Sun, Moon, Menu, X, User } from "lucide-react";

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
  const [menuOpen, setMenuOpen] = useState(false);
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

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, [menuOpen]);

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
        <div className="app-actions-row">
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
        <button
          type="button"
          className="btn-icon app-menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>
      {menuOpen && (
        <div className="app-menu-panel" role="dialog" aria-label="Navigation menu">
          <Link href="/profile" className="app-menu-item" onClick={() => setMenuOpen(false)}>
            <User size={16} />
            <span>Me</span>
          </Link>
          <Link href="/messages" className="app-menu-item" onClick={() => setMenuOpen(false)}>
            <span className="icon-badge">
              <MessageCircle size={16} />
              {unreadMessages > 0 && (
                <span className="badge-pill" aria-hidden="true">{unreadLabel}</span>
              )}
            </span>
            <span>Messages</span>
          </Link>
          <button
            type="button"
            className="app-menu-item"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {mounted && theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
          </button>
          <div className="app-menu-divider" />
          <div className="app-menu-item app-menu-account">
            <span>Account</span>
            <UserButton userProfileMode="navigation" userProfileUrl="/settings" />
          </div>
        </div>
      )}
    </header>
  );
}
