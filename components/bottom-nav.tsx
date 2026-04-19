"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Users, Trophy, User, MessageCircle } from "lucide-react";

export default function BottomNav({
  pendingRequests = 0,
  unreadMessages = 0,
}: {
  pendingRequests?: number;
  unreadMessages?: number;
}) {
  const pathname = usePathname();
  const pendingLabel = pendingRequests > 9 ? "9+" : String(pendingRequests);
  const [unreadCount, setUnreadCount] = useState(unreadMessages);
  const unreadLabel = unreadCount > 9 ? "9+" : String(unreadCount);

  useEffect(() => {
    setUnreadCount(unreadMessages);
  }, [unreadMessages]);

  useEffect(() => {
    let timer: number | undefined;

    async function refreshUnread() {
      try {
        const res = await fetch("/api/messages/unread", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        setUnreadCount(Number(data.count ?? 0));
      } catch {
        // Ignore network errors; retry on next interval.
      }
    }

    refreshUnread();
    timer = window.setInterval(refreshUnread, 15000);

    const onFocus = () => refreshUnread();
    window.addEventListener("focus", onFocus);

    return () => {
      if (timer) window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/quests", label: "Quests", icon: Swords },
    { href: "/friends", label: "Friends", icon: Users },
    { href: "/leaderboard", label: "Board", icon: Trophy },
    { href: "/profile", label: "Me", icon: User },
    { href: "/messages", label: "Messages", icon: MessageCircle },
  ];

  return (
    <nav className="bottom-nav" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        const showPending = label === "Friends" && pendingRequests > 0;
        const showUnread = label === "Messages" && unreadCount > 0;

        return (
          <Link key={label} href={href} className={`nav-item nav-${label.toLowerCase()}${active ? " active" : ""}`}>
            <span className="icon-badge" aria-hidden={!(showPending || showUnread)}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {showPending && <span className="badge-pill">{pendingLabel}</span>}
              {showUnread && <span className="badge-pill">{unreadLabel}</span>}
            </span>
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
