"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

export default function DeleteQuestButton({ questId }: { questId: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this quest forever?")) return;
    setDeleting(true);
    
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/quests");
      } else {
        alert("Failed to delete quest.");
        setDeleting(false);
      }
    } catch (e) {
      alert("Error deleting quest.");
      setDeleting(false);
    }
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={deleting}
      className="btn btn-danger btn-sm" 
      style={{ padding: "10px 16px", display: "flex", gap: "var(--space-2)", alignItems: "center" }}
    >
      {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      Delete
    </button>
  );
}
