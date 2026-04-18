"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Users, Trophy, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

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
        return (
          <Link key={label} href={href} className={`nav-item${active ? " active" : ""}`}>
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
