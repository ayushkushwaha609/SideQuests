"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Send, Loader2, MessageCircle } from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

interface CommentData {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    displayName?: string | null;
    avatarUrl: string | null;
    level: number;
  };
}

export default function CommentsSection({ questId }: { questId: string }) {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchComments();
  }, [questId]);

  useEffect(() => {
    if (!pusherClient) return;
    const channel = pusherClient.subscribe(`quest-comments-${questId}`);

    channel.bind("new-comment", (comment: CommentData) => {
      setComments((prev) => {
        if (prev.find((c) => c.id === comment.id)) return prev;
        return [comment, ...prev];
      });
    });

    return () => {
      pusherClient.unsubscribe(`quest-comments-${questId}`);
    };
  }, [questId]);

  async function fetchComments(cursor?: string | null) {
    const isInitial = !cursor;
    if (isInitial) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/quests/${questId}/comments?${params.toString()}`);
    const data = await res.json();

    setComments((prev) => (isInitial ? data.comments ?? [] : [...prev, ...(data.comments ?? [])]));
    setHasMore(Boolean(data.hasMore));
    setNextCursor(data.nextCursor ?? null);

    setLoading(false);
    setLoadingMore(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || sending) return;

    setSending(true);
    const res = await fetch(`/api/quests/${questId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });

    if (res.ok) {
      const data = await res.json();
      setComments((prev) => [data.comment, ...prev]);
      setNewComment("");
    }
    setSending(false);
  }

  function timeAgo(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  }

  return (
    <div style={{ marginTop: "var(--space-3)" }}>
      {/* Comment input */}
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          gap: "var(--space-2)",
          alignItems: "center",
        }}
      >
        <input
          ref={inputRef}
          className="input"
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          style={{ flex: 1, fontSize: "0.85rem", padding: "8px 12px" }}
          maxLength={300}
        />
        <button
          type="submit"
          disabled={sending || !newComment.trim()}
          className="btn btn-primary btn-sm"
          style={{ padding: "8px 12px", flexShrink: 0 }}
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>

      {/* Comments list */}
      {loading ? (
        <div style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
          Loading comments...
        </div>
      ) : comments.length === 0 ? (
        <div style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.8rem" }}>
          <MessageCircle size={16} style={{ display: "inline", marginRight: 4 }} />
          No comments yet. Be the first!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginTop: "var(--space-2)" }}>
          {comments.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                gap: "var(--space-2)",
                padding: "var(--space-2)",
                borderRadius: "var(--radius-sm)",
                background: "rgba(0,0,0,0.15)",
              }}
            >
              <Link href={`/profile/${c.user.username}`} style={{ flexShrink: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  {c.user.avatarUrl ? (
                    <img src={c.user.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "0.7rem" }}>👤</span>
                  )}
                </div>
              </Link>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                  <Link
                    href={`/profile/${c.user.username}`}
                    style={{ fontWeight: "var(--weight-bold)", fontSize: "0.8rem", color: "var(--text-primary)", textDecoration: "none" }}
                  >
                    {c.user.displayName ?? c.user.username}
                  </Link>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{timeAgo(c.createdAt)}</span>
                </div>
                <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 2, wordBreak: "break-word" }}>
                  {c.content}
                </div>
              </div>
            </div>
          ))}

          {hasMore && nextCursor && (
            <button
              onClick={() => fetchComments(nextCursor)}
              disabled={loadingMore}
              style={{
                background: "none",
                border: "none",
                color: "var(--xp-purple-light)",
                fontSize: "0.8rem",
                cursor: loadingMore ? "default" : "pointer",
                padding: "var(--space-1) 0",
                textAlign: "left",
                opacity: loadingMore ? 0.7 : 1,
              }}
            >
              {loadingMore ? "Loading more..." : "Load more comments"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
