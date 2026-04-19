"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Users, Trophy, User } from "lucide-react";

export default function BottomNav({ pendingRequests = 0 }: { pendingRequests?: number }) {
  const pathname = usePathname();
  const pendingLabel = pendingRequests > 9 ? "9+" : String(pendingRequests);

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/quests", label: "Quests", icon: Swords },
    { href: "/friends", label: "Friends", icon: Users },
    { href: "/leaderboard", label: "Board", icon: Trophy },
    { href: "/profile", label: "Me", icon: User },
  ];

  return (
    <nav className="bottom-nav" style={{ gridTemplateColumns: "repeat(5, 1fr)" }}>
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        const showBadge = label === "Friends" && pendingRequests > 0;

        return (
          <Link key={label} href={href} className={`nav-item${active ? " active" : ""}`}>
            <span className="icon-badge" aria-hidden={!showBadge}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              {showBadge && <span className="badge-pill">{pendingLabel}</span>}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
