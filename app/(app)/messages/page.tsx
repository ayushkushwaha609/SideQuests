import { db } from "@/db";
import { users, friendships, directMessages } from "@/db/schema";
import { eq, or, and, inArray, desc } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import Link from "next/link";
import { MessageSquare, ArrowLeft } from "lucide-react";

export default async function InboxPage() {
  const currentUser = await getUserOrCreate();
  if (!currentUser) return null;

  const allFriendships = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.userId, currentUser.id), eq(friendships.friendId, currentUser.id))
      )
    );

  const friendIds = Array.from(new Set(
    allFriendships.map((f) => (f.userId === currentUser.id ? f.friendId : f.userId))
  ));

  const friends = friendIds.length
    ? await db.select().from(users).where(inArray(users.id, friendIds))
    : [];

  const chatIds = friendIds.map((id) => [currentUser.id, id].sort().join("_"));

  const lastMessages = chatIds.length
    ? await db
        .select({
          message: directMessages,
          sender: users,
        })
        .from(directMessages)
        .leftJoin(users, eq(directMessages.userId, users.id))
        .where(inArray(directMessages.chatId, chatIds))
        .orderBy(desc(directMessages.createdAt))
    : [];

  const lastByChatId = new Map<string, typeof lastMessages[number]>();
  for (const row of lastMessages) {
    if (!lastByChatId.has(row.message.chatId)) {
      lastByChatId.set(row.message.chatId, row);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Header */}
      <div className="flex items-center gap-1" style={{ gap: "var(--space-3)" }}>
        <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={20} />
        </Link>
        <h1 style={{ fontSize: "1.2rem", fontWeight: "var(--weight-bold)", color: "var(--text-primary)" }}>
          Messages
        </h1>
      </div>

      {friends.length === 0 ? (
        <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-6)" }}>
          <MessageSquare size={32} color="var(--text-muted)" style={{ margin: "0 auto var(--space-3) auto" }} />
          <p style={{ color: "var(--text-secondary)" }}>You don't have any friends to message yet.</p>
          <Link href="/friends" className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-3)" }}>
            Find friends
          </Link>
        </div>
      ) : (
        <div className="seamless-stack">
          {friends.map((friend) => {
            const chatId = [currentUser.id, friend.id].sort().join("_");
            const lastRow = lastByChatId.get(chatId);
            const senderName = lastRow
              ? lastRow.message.userId === currentUser.id
                ? "You"
                : lastRow.sender?.displayName ?? lastRow.sender?.username ?? "Someone"
              : null;
            const previewText = lastRow?.message.text?.trim()
              ? lastRow.message.text.trim().slice(0, 80)
              : lastRow?.message.imageUrl
                ? "Sent an image"
                : "No messages yet";

            return (
            <Link key={friend.id} href={`/messages/${friend.username}`} style={{ textDecoration: "none" }}>
              <div className="seamless-item seamless-item-compact animate-slide-up" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", cursor: "pointer" }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {friend.avatarUrl ? <img src={friend.avatarUrl} alt={friend.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
                </div>
                <div>
                  <div style={{ fontWeight: "var(--weight-bold)", color: "var(--text-primary)", fontSize: "0.95rem" }}>
                    {friend.displayName ?? friend.username}
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: 2 }}>
                    {senderName ? `Last from ${senderName}: ${previewText}` : previewText}
                  </div>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
