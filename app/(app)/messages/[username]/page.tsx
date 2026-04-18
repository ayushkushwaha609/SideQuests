import { db } from "@/db";
import { users, friendships, directMessages } from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getUserOrCreate } from "@/lib/auth-sync";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DirectMessageChat from "@/components/direct-message-chat";

export default async function DMPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const currentUser = await getUserOrCreate();
  if (!currentUser) return null;

  // 1. Fetch target user
  const targetUser = await db.query.users.findFirst({
    where: eq(users.username, username.toLowerCase()),
  });

  if (!targetUser) return notFound();
  if (targetUser.id === currentUser.id) return redirect("/messages");

  // 2. Verify friendship
  const friendship = await db.query.friendships.findFirst({
    where: and(
      eq(friendships.status, "accepted"),
      or(
        and(eq(friendships.userId, currentUser.id), eq(friendships.friendId, targetUser.id)),
        and(eq(friendships.userId, targetUser.id), eq(friendships.friendId, currentUser.id))
      )
    ),
  });

  if (!friendship) {
    return (
      <div className="seamless-item" style={{ padding: "var(--space-6)", textAlign: "center" }}>
        <h2 style={{ marginBottom: "var(--space-3)" }}>Not Friends</h2>
        <p style={{ color: "var(--text-secondary)", marginBottom: "var(--space-4)" }}>
          You must be friends with {targetUser.displayName ?? targetUser.username} to send them a direct message.
        </p>
        <Link href={`/profile/${targetUser.username}`} className="btn btn-primary">
          View Profile
        </Link>
      </div>
    );
  }

  // 3. Generate deterministic chatId
  const chatId = [currentUser.id, targetUser.id].sort().join("_");

  // 4. Fetch past messages
  const initialMessages = await db.query.directMessages.findMany({
    where: eq(directMessages.chatId, chatId),
    orderBy: [desc(directMessages.createdAt)],
    limit: 50,
  });

  const formattedMessages = initialMessages.reverse().map(m => ({
    id: m.id,
    userId: m.userId,
    text: m.text,
    imageUrl: m.imageUrl,
    createdAt: m.createdAt,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Header */}
      <div className="flex items-center gap-1" style={{ gap: "var(--space-3)" }}>
        <Link href="/messages" style={{ color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={20} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {targetUser.avatarUrl ? <img src={targetUser.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
          </div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: "var(--weight-bold)", color: "var(--text-primary)" }}>
            {targetUser.displayName ?? targetUser.username}
          </h1>
        </div>
      </div>

      <DirectMessageChat
        chatId={chatId}
        currentUser={{ id: currentUser.id, username: currentUser.username, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl }}
        targetUser={{ id: targetUser.id, username: targetUser.username, displayName: targetUser.displayName, avatarUrl: targetUser.avatarUrl }}
        initialMessages={formattedMessages}
      />
    </div>
  );
}
