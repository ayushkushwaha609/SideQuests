"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";

export default function LeaveQuestButton({ questId }: { questId: string }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handleLeave() {
    if (!confirm("Are you sure you want to opt out?")) return;
    setLeaving(true);

    try {
      const res = await fetch(`/api/quests/${questId}/leave`, { method: "POST" });
      if (res.ok) {
        router.push("/quests");
      } else {
        alert("Failed to opt out of the quest.");
        setLeaving(false);
      }
    } catch (e) {
      alert("Error opting out of the quest.");
      setLeaving(false);
    }
  }

  return (
    <button
      onClick={handleLeave}
      disabled={leaving}
      className="btn btn-secondary btn-sm"
      style={{ padding: "10px 16px", display: "flex", gap: "var(--space-2)", alignItems: "center" }}
    >
      {leaving ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      Opt out
    </button>
  );
}
