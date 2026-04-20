"use client";
import { useEffect, useState } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { MessageCircle, Sun, Moon, User, Download } from "lucide-react";
import { useUnreadCount } from "@/components/use-unread-count";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

interface AppHeaderProps {
  xp?: number;
  level?: number;
  streak?: number;
  unreadMessages?: number;
}

export default function AppHeader({ xp = 0, level = 1, streak = 0, unreadMessages = 0 }: AppHeaderProps) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const unreadCount = useUnreadCount(unreadMessages);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

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

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIosStandalone = (window.navigator as any).standalone;
    setIsInstalled(Boolean(isStandalone || isIosStandalone));

    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
      setIsInstalled(true);
    }
  }

  return (
    <header className="app-header">
      <Link href="/" className="app-title" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", textDecoration: "none" }}>
        <span className="app-title-icon">⚔️</span>
        <span
          className="app-title-text"
          style={{
            fontWeight: "var(--weight-bold)",
            color: "var(--text-primary)",
            fontFamily: "var(--font-display)",
          }}
        >
          SideQuest
        </span>
      </Link>

      <div className="app-header-actions" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        {/* XP & level removed from header for small-screen clarity */}
        <Link
          href="/messages"
          className="icon-badge app-message"
          style={{ color: "var(--text-muted)" }}
          aria-label={unreadCount > 0 ? `Messages, ${unreadCount} unread` : "Messages"}
        >
          <MessageCircle size={20} />
          {unreadCount > 0 && (
            <span className="badge-pill" aria-hidden="true">{unreadCount > 9 ? "9+" : String(unreadCount)}</span>
          )}
        </Link>
        <div className="app-actions-row">
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
          <svg
            className="pixel-icon"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            aria-hidden="true"
          >
            <rect x="2" y="3" width="14" height="3" fill="currentColor" />
            <rect x="2" y="8" width="14" height="3" fill="currentColor" />
            <rect x="2" y="13" width="14" height="3" fill="currentColor" />
          </svg>
        </button>
      </div>
      {menuOpen && (
        <div className="app-menu-panel" role="dialog" aria-label="Navigation menu">
          <Link href="/profile" className="app-menu-item" onClick={() => setMenuOpen(false)}>
            <User size={16} />
            <span>Me</span>
          </Link>
          {installPrompt && !isInstalled && (
            <button type="button" className="app-menu-item" onClick={handleInstall}>
              <Download size={16} />
              <span>Install app</span>
            </button>
          )}
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
