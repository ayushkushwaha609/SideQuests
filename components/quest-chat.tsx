"use client";
import { useState, useEffect, useRef } from "react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { pusherClient } from "@/lib/pusher-client";

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
  text: string;
  createdAt: Date;
}

interface ChatUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
}

export default function QuestChat({ questId, currentUser, initialMessages = [] }: { questId: string; currentUser: ChatUser; initialMessages?: ChatMessage[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;

    const chatId = `quest_${questId}`;
    const channel = pusherClient.subscribe(`private-chat-${chatId}`);

    channel.bind("new-message", (data: any) => {
      const newMsg: ChatMessage = {
        ...data,
        createdAt: new Date(data.createdAt),
      };
      
      setMessages((prev) => {
        if (prev.find((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "instant" }), 100);

    return () => {
      pusherClient.unsubscribe(`private-chat-${chatId}`);
    };
  }, [questId, expanded]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: `quest_${questId}`,
          text: newMessage.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      setNewMessage("");
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert("Failed to send message: " + err.message);
    } finally {
      setSending(false);
    }
  }

  function formatTime(ts: Date | null) {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="btn btn-secondary"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}
      >
        <MessageSquare size={16} /> Open Quest Chat
      </button>
    );
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
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-elevated)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <MessageSquare size={16} color="var(--xp-purple-light)" />
          <span style={{ fontWeight: "var(--weight-bold)", fontSize: "0.9rem" }}>Quest Chat</span>
        </div>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "0.8rem",
          }}
        >
          Minimize
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          height: 300,
          overflowY: "auto",
          padding: "var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", padding: "var(--space-6) 0" }}>
            No messages yet. Start the conversation!
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
                <Link href={`/profile/${msg.username}`} style={{ flexShrink: 0 }}>
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
                    {msg.avatarUrl ? (
                      <img src={msg.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                  borderRadius: isMe ? "var(--radius-md) var(--radius-md) 4px var(--radius-md)" : "var(--radius-md) var(--radius-md) var(--radius-md) 4px",
                  background: isMe ? "var(--xp-purple)" : "var(--bg-elevated)",
                  color: isMe ? "#fff" : "var(--text-primary)",
                }}
              >
                {!isMe && (
                  <div style={{ fontSize: "0.7rem", fontWeight: "var(--weight-bold)", color: "var(--xp-purple-light)", marginBottom: 2 }}>
                    {msg.displayName ?? msg.username}
                  </div>
                )}
                <div style={{ fontSize: "0.85rem", wordBreak: "break-word" }}>{msg.text}</div>
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
        }}
      >
        <input
          className="input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          style={{ flex: 1, fontSize: "0.85rem", padding: "8px 12px" }}
          maxLength={500}
        />
        <button type="submit" disabled={sending || !newMessage.trim()} className="btn btn-primary btn-sm" style={{ padding: "8px 12px" }}>
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
        </button>
      </form>
    </div>
  );
}
