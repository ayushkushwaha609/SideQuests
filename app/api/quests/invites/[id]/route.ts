import { NextResponse } from "next/server";
import { db } from "@/db";
import { questMembers, sidequests } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { sendPushToUser } from "@/lib/push";
import { pusherServer } from "@/lib/pusher";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const accept = body.accept === true;

  const [updated] = await db
    .update(questMembers)
    .set({ inviteStatus: accept ? "accepted" : "declined" })
    .where(and(eq(questMembers.id, id), eq(questMembers.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  const quest = await db.query.sidequests.findFirst({
    where: eq(sidequests.id, updated.questId),
  });

  if (quest && quest.createdBy !== user.id) {
    await sendPushToUser(quest.createdBy, {
      title: "Quest invite response",
      body: `${user.displayName ?? user.username ?? "Someone"} ${accept ? "accepted" : "declined"} your invite to ${quest.title}.`,
      url: `/quests/${quest.id}/invite`,
    });

    await pusherServer.trigger(`quest-invite-status-${quest.id}`, "invite-status", {
      userId: user.id,
      status: updated.inviteStatus,
    });
  }

  await pusherServer.trigger(`quest-invites-${user.id}`, "invite-updated", {
    inviteId: updated.id,
    status: updated.inviteStatus,
  });

  return NextResponse.json({ status: updated.inviteStatus });
}
