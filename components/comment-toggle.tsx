"use client";
import { useState } from "react";
import { MessageCircle } from "lucide-react";
import CommentsSection from "@/components/comments-section";

export default function CommentToggle({ questId }: { questId: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: "var(--space-3)" }}>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={`comments-${questId}`}
        style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", padding: "6px 10px" }}
      >
        <MessageCircle size={16} />
        <span style={{ fontSize: "0.8rem" }}>{open ? "Hide comments" : "Comments"}</span>
      </button>
      {open && (
        <div id={`comments-${questId}`}>
          <CommentsSection questId={questId} />
        </div>
      )}
    </div>
  );
}
