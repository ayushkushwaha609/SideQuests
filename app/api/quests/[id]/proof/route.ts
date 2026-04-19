import { NextResponse } from "next/server";
import { db } from "@/db";
import { questArtifacts, questMembers, sidequests } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { pusherServer } from "@/lib/pusher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitResult = rateLimit(`quests:proof:${user.id}`, 20, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": retryAfterSeconds(limitResult.resetAt) } }
    );
  }

  const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, questId) });
  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  const isMember = await db.query.questMembers.findFirst({
    where: and(
      eq(questMembers.questId, questId),
      eq(questMembers.userId, user.id),
      eq(questMembers.inviteStatus, "accepted")
    ),
  });

  if (!isMember && quest.createdBy !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const mediaUrl = typeof body.mediaUrl === "string" ? body.mediaUrl.trim() : "";

  if (!note && !mediaUrl) {
    return NextResponse.json({ error: "Proof requires a note or media" }, { status: 400 });
  }

  const summary = note
    ? note.slice(0, 120)
    : "Shared proof";

  const [artifact] = await db
    .insert(questArtifacts)
    .values({
      questId,
      userId: user.id,
      type: "proof",
      summary,
      metadata: {
        note: note || null,
        mediaUrl: mediaUrl || null,
      },
    })
    .returning();

  if (artifact) {
    await pusherServer.trigger(`private-quest-activity-${questId}`, "new-artifact", {
      ...artifact,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        level: user.level,
      },
    });
  }

  return NextResponse.json({ artifact }, { status: 201 });
}
