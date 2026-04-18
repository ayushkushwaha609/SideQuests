"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Info } from "lucide-react";
import Link from "next/link";
import MediaUpload from "./media-upload";
import { pusherClient } from "@/lib/pusher-client";

interface ChatMessage {
  id: string;
  userId: string;
  text: string;
  imageUrl?: string | null;
  createdAt: Date;
}

interface ChatUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
}

export default function DirectMessageChat({
  chatId,
  currentUser,
  targetUser,
  initialMessages = [],
  initialHasMore = false,
  initialCursor = null,
}: {
  chatId: string;
  currentUser: ChatUser;
  targetUser: ChatUser;
  initialMessages?: ChatMessage[];
  initialHasMore?: boolean;
  initialCursor?: string | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [uploadKey, setUploadKey] = useState(0);
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to Pusher channel for this chat
    const channel = pusherClient.subscribe(`chat-${chatId}`);

    channel.bind("new-message", (data: any) => {
      // Pusher passes dates as strings, parse it
      const newMsg: ChatMessage = {
        ...data,
        createdAt: new Date(data.createdAt),
      };
      
      setMessages((prev) => {
        // Prevent duplicates
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    // Initial scroll
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 100);

    return () => {
      pusherClient.unsubscribe(`chat-${chatId}`);
    };
  }, [chatId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!newMessage.trim() && !pendingImage) || sending) return;

    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          text: newMessage.trim(),
          imageUrl: pendingImage || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      setNewMessage("");
      setPendingImage(null);
      setUploadKey((k) => k + 1);
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert("Failed to send message: " + err.message);
    } finally {
      setSending(false);
    }
  }

  async function loadOlderMessages() {
    if (!hasMore || !nextCursor || loadingMore) return;

    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ chatId, cursor: nextCursor });
      const res = await fetch(`/api/messages?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load messages");
      const data = await res.json();
      const older = (data.messages ?? []).map((m: any) => ({
        ...m,
        createdAt: new Date(m.createdAt),
      })).reverse();

      setMessages((prev) => [...older, ...prev]);
      setHasMore(Boolean(data.hasMore));
      setNextCursor(data.nextCursor ?? null);
    } catch (err: any) {
      console.error("Error loading messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  function formatTime(ts: Date | null) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-base)",
        height: "calc(100vh - 160px)",
        maxHeight: "700px"
      }}
    >
      {/* Encryption/Info Banner */}
      <div style={{ background: "rgba(139, 92, 246, 0.1)", padding: "10px", textAlign: "center", fontSize: "0.75rem", color: "var(--xp-purple-light)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, borderBottom: "1px solid var(--border)" }}>
        <Info size={12} />
        Messages are end-to-end encrypted (just kidding, this is MVP)
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        {hasMore && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={loadOlderMessages}
              disabled={loadingMore}
              style={{
                background: "none",
                border: "none",
                color: "var(--xp-purple-light)",
                fontSize: "0.75rem",
                cursor: loadingMore ? "default" : "pointer",
                opacity: loadingMore ? 0.7 : 1,
              }}
            >
              {loadingMore ? "Loading..." : "Load earlier messages"}
            </button>
          </div>
        )}
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", padding: "var(--space-6) 0", display: "flex", flexDirection: "column", gap: "var(--space-3)", alignItems: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              {targetUser.avatarUrl ? (
                <img src={targetUser.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: "1.5rem" }}>👤</span>
              )}
            </div>
            Say hi to {targetUser.displayName ?? targetUser.username}!
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.userId === currentUser.id;
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: isMe ? "row-reverse" : "row",
                gap: "var(--space-2)",
                alignItems: "flex-end",
              }}
            >
              {!isMe && (
                <Link href={`/profile/${targetUser.username}`} style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {targetUser.avatarUrl ? (
                      <img src={targetUser.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "0.7rem" }}>👤</span>
                    )}
                  </div>
                </Link>
              )}
              <div
                style={{
                  maxWidth: "75%",
                  padding: "var(--space-2) var(--space-3)",
                  borderRadius: isMe ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: isMe ? "var(--xp-purple)" : "var(--bg-elevated)",
                  color: isMe ? "#fff" : "var(--text-primary)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)"
                }}
              >
                {msg.imageUrl && (
                  <img src={msg.imageUrl} alt="Shared image" style={{ width: "100%", maxWidth: 200, borderRadius: "8px", marginBottom: msg.text ? 6 : 0, display: "block" }} />
                )}
                {msg.text && <div style={{ fontSize: "0.9rem", wordBreak: "break-word" }}>{msg.text}</div>}
                <div style={{ fontSize: "0.65rem", color: isMe ? "rgba(255,255,255,0.6)" : "var(--text-muted)", marginTop: 2, textAlign: "right" }}>
                  {formatTime(msg.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          display: "flex",
          gap: "var(--space-2)",
          padding: "var(--space-3)",
          borderTop: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          alignItems: "flex-end"
        }}
      >
        <div style={{ paddingBottom: 2 }}>
          <MediaUpload 
            key={uploadKey}
            iconOnly 
            onUpload={(m) => setPendingImage(m.url)} 
            onClear={() => setPendingImage(null)}
          />
        </div>
        <input
          className="input"
          placeholder="Message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ flex: 1, fontSize: "0.9rem", padding: "10px 14px", borderRadius: "20px" }}
        />
        <button type="submit" disabled={sending || (!newMessage.trim() && !pendingImage)} className="btn btn-primary" style={{ padding: "0 14px", borderRadius: "20px" }}>
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>
    </div>
  );
}
