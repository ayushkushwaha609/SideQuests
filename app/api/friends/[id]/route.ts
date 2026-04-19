import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, friendships } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { sendPushToUser } from "@/lib/push";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: friendshipId } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

  const friendship = await db.query.friendships.findFirst({ where: eq(friendships.id, friendshipId) });
  if (!friendship) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (friendship.friendId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { accept } = await request.json();

  if (accept) {
    await db.update(friendships).set({ status: "accepted" }).where(eq(friendships.id, friendshipId));

    await sendPushToUser(friendship.userId, {
      title: "Friend request accepted",
      body: `${user.displayName ?? user.username} accepted your request.`,
      url: "/friends",
    });
  } else {
    await db.delete(friendships).where(eq(friendships.id, friendshipId));
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: friendshipId } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

  await db.delete(friendships).where(
    and(
      eq(friendships.id, friendshipId),
      or(eq(friendships.userId, user.id), eq(friendships.friendId, user.id))
    )
  );

  return NextResponse.json({ success: true });
}
