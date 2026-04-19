"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ClearFeedButtonProps = {
  tab: "friends" | "public";
  label?: string;
};

export default function ClearFeedButton({ tab, label = "Clear feed" }: ClearFeedButtonProps) {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  async function handleClear() {
    if (isClearing) return;
    const confirmed = window.confirm("Clear this feed for you? This only hides existing items.");
    if (!confirmed) return;

    setIsClearing(true);
    try {
      const res = await fetch("/api/feed/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tab }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={handleClear}
      disabled={isClearing}
      style={{ opacity: isClearing ? 0.7 : 1 }}
    >
      {isClearing ? "Clearing..." : label}
    </button>
  );
}
