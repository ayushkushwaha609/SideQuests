import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, friendships } from "@/db/schema";
import { eq, and, or, ilike, inArray } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";

export async function GET() {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

  const allFriendships = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.userId, user.id), eq(friendships.friendId, user.id)));

  const otherIds = Array.from(new Set(
    allFriendships.map((f) => (f.userId === user.id ? f.friendId : f.userId))
  ));

  const otherUsers = otherIds.length
    ? await db.select().from(users).where(inArray(users.id, otherIds))
    : [];

  const usersById = new Map(otherUsers.map((u) => [u.id, u]));

  const friends: any[] = [];
  const pending: any[] = [];

  for (const f of allFriendships) {
    const otherId = f.userId === user.id ? f.friendId : f.userId;
    const otherUser = usersById.get(otherId);
    if (!otherUser) continue;

    const entry = {
      ...otherUser,
      friendshipId: f.id,
      status: f.status,
      role: f.userId === user.id ? "sender" : "receiver",
    };

    if (f.status === "accepted") friends.push(entry);
    else pending.push(entry);
  }

  return NextResponse.json(
    { friends, pending },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

  const limitResult = rateLimit(`friends:${user.id}`, 5, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": retryAfterSeconds(limitResult.resetAt) } }
    );
  }

  const { friendId } = await request.json();
  if (!friendId) return NextResponse.json({ error: "friendId required" }, { status: 400 });
  if (friendId === user.id) return NextResponse.json({ error: "Cannot friend yourself" }, { status: 400 });

  // Check existing
  const existing = await db.query.friendships.findFirst({
    where: or(
      and(eq(friendships.userId, user.id), eq(friendships.friendId, friendId)),
      and(eq(friendships.userId, friendId), eq(friendships.friendId, user.id))
    ),
  });
  if (existing) {
    if (existing.status === "pending" && existing.friendId === user.id) {
      const [friendship] = await db
        .update(friendships)
        .set({ status: "accepted" })
        .where(eq(friendships.id, existing.id))
        .returning();

      await sendPushToUser(existing.userId, {
        title: "Friend request accepted",
        body: `${user.displayName ?? user.username} accepted your request.`,
        url: "/friends",
      });

      return NextResponse.json({ friendship, autoAccepted: true }, { status: 200 });
    }

    return NextResponse.json({ error: "Already friends or pending" }, { status: 409 });
  }

  const [friendship] = await db
    .insert(friendships)
    .values({ userId: user.id, friendId, status: "pending" })
    .returning();

  await sendPushToUser(friendId, {
    title: "New friend request",
    body: `${user.displayName ?? user.username} sent you a friend request.`,
    url: "/friends",
  });

  return NextResponse.json({ friendship }, { status: 201 });
}
