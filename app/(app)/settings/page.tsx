"use client";
import { UserProfile } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", paddingBottom: "var(--space-8)" }}>
      {/* Header */}
      <div className="flex items-center gap-1" style={{ gap: "var(--space-3)" }}>
        <button onClick={() => router.back()} className="btn-icon btn">
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: "1.3rem", fontWeight: "var(--weight-bold)" }}>Settings</h1>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <UserProfile 
          appearance={{
            elements: {
              card: "shadow-none border border-[var(--border)] bg-[var(--bg-base)] text-[var(--text-primary)] w-full max-w-full",
              headerTitle: "text-[var(--text-primary)]",
              headerSubtitle: "text-[var(--text-muted)]",
              profileSectionTitleText: "text-[var(--text-primary)]",
              badge: "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border)]",
              button: "text-[var(--xp-purple)] hover:bg-[var(--bg-elevated)]",
              navbar: "hidden", // Hide sidebar nav to keep it clean on mobile
              navbarMobileMenuButton: "hidden",
            }
          }}
        />
      </div>
    </div>
  );
}
