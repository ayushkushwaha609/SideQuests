import { NextResponse } from "next/server";
import { db } from "@/db";
import { friendships, questMembers, sidequests, users } from "@/db/schema";
import { and, eq, or } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";
import { pusherServer } from "@/lib/pusher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitResult = rateLimit(`quests:invite:${user.id}`, 20, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": retryAfterSeconds(limitResult.resetAt) } }
    );
  }

  const body = await request.json().catch(() => ({}));
  const friendId = body.friendId as string | undefined;
  if (!friendId) return NextResponse.json({ error: "friendId required" }, { status: 400 });

  const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, questId) });
  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  if (quest.createdBy !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const friendship = await db.query.friendships.findFirst({
    where: and(
      eq(friendships.status, "accepted"),
      or(
        and(eq(friendships.userId, user.id), eq(friendships.friendId, friendId)),
        and(eq(friendships.userId, friendId), eq(friendships.friendId, user.id))
      )
    ),
  });

  if (!friendship) {
    return NextResponse.json({ error: "Not friends" }, { status: 403 });
  }

  const existing = await db.query.questMembers.findFirst({
    where: and(eq(questMembers.questId, questId), eq(questMembers.userId, friendId)),
  });

  if (existing) {
    return NextResponse.json({ status: existing.inviteStatus }, { status: 200 });
  }

  await db.insert(questMembers).values({
    questId,
    userId: friendId,
    role: "member",
    inviteStatus: "pending",
  });

  const inviter = await db.query.users.findFirst({ where: eq(users.id, user.id) });
  await sendPushToUser(friendId, {
    title: "Quest invite",
    body: `${inviter?.displayName ?? inviter?.username ?? "Someone"} invited you to ${quest.title}.`,
    url: `/quests/${quest.id}/invite`,
  });

  await pusherServer.trigger(`private-quest-invites-${friendId}`, "invite-created", {
    questId: quest.id,
    inviteStatus: "pending",
  });

  return NextResponse.json({ status: "pending" }, { status: 201 });
}
