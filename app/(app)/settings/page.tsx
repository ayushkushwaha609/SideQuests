"use client";
import { UserProfile } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Delete your account? This will permanently remove your profile and data.",
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const response = await fetch("/api/me/delete", { method: "POST" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setDeleteError(data?.error ?? "Failed to delete account.");
        setIsDeleting(false);
        return;
      }

      router.replace("/sign-in");
    } catch {
      setDeleteError("Failed to delete account.");
      setIsDeleting(false);
    }
  }

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

      <div
        className="card"
        style={{
          border: "1px solid rgba(239, 68, 68, 0.35)",
          background: "var(--bg-elevated)",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "var(--weight-semibold)" }}>Danger Zone</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
            Permanently delete your account and all associated data.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-3)" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            This action cannot be undone.
          </span>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="btn btn-danger"
            style={{ opacity: isDeleting ? 0.6 : 1 }}
          >
            {isDeleting ? "Deleting..." : "Delete Account"}
          </button>
        </div>

        {deleteError && (
          <div style={{ color: "var(--error)", fontSize: "0.85rem" }}>{deleteError}</div>
        )}
      </div>
    </div>
  );
}
