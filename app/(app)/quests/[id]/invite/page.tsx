import { auth } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { friendships, questMembers, sidequests, users } from "@/db/schema";
import { and, eq, or, inArray } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";
import QuestInviteList, { InviteFriend } from "@/components/quest-invite-list";

export default async function QuestInvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const currentUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId) });
  if (!currentUser) redirect("/sign-in");

  const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, id) });
  if (!quest) notFound();
  if (quest.createdBy !== currentUser.id) notFound();

  const allFriendships = await db
    .select()
    .from(friendships)
    .where(
      and(
        eq(friendships.status, "accepted"),
        or(eq(friendships.userId, currentUser.id), eq(friendships.friendId, currentUser.id))
      )
    );

  const friendIds = Array.from(
    new Set(allFriendships.map((f) => (f.userId === currentUser.id ? f.friendId : f.userId)))
  );

  const friends = friendIds.length
    ? await db.select().from(users).where(inArray(users.id, friendIds))
    : [];

  const friendsById = new Map(friends.map((f) => [f.id, f]));

  const members = await db
    .select()
    .from(questMembers)
    .where(eq(questMembers.questId, quest.id));

  const memberStatus = new Map<string, "pending" | "accepted">();
  for (const m of members) {
    memberStatus.set(m.userId, m.inviteStatus);
  }

  const inviteList: InviteFriend[] = friendIds
    .map((id) => {
      const friend = friendsById.get(id);
      if (!friend) return null;
      const status = memberStatus.get(id) ?? "available";
      return {
        id: friend.id,
        username: friend.username,
        displayName: friend.displayName,
        avatarUrl: friend.avatarUrl,
        level: friend.level,
        status,
      };
    })
    .filter(Boolean) as InviteFriend[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <div className="flex items-center gap-1" style={{ gap: "var(--space-3)" }}>
        <Link href={`/quests/${quest.id}`} className="btn btn-ghost btn-sm" style={{ gap: "var(--space-2)" }}>
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 style={{ fontSize: "1.2rem", fontWeight: "var(--weight-bold)" }}>Invite Friends</h1>
      </div>

      <div className="seamless-item" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
        <div style={{ fontSize: "2rem" }}>{quest.coverEmoji}</div>
        <div>
          <div style={{ fontWeight: "var(--weight-semibold)", color: "var(--text-primary)" }}>{quest.title}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Invite friends to join this quest.
          </div>
        </div>
      </div>

      {inviteList.length === 0 ? (
        <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-6)" }}>
          <Users size={28} color="var(--text-muted)" style={{ marginBottom: "var(--space-2)" }} />
          <div style={{ color: "var(--text-secondary)" }}>No friends available to invite yet.</div>
          <Link href="/friends" className="btn btn-secondary btn-sm" style={{ marginTop: "var(--space-3)" }}>
            Find friends
          </Link>
        </div>
      ) : (
        <QuestInviteList questId={quest.id} friends={inviteList} />
      )}
    </div>
  );
}
