import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments, questArtifacts, users, sidequests, questMembers } from "@/db/schema";
import { eq, desc, lt, and } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { pusherServer } from "@/lib/pusher";

// GET /api/quests/[id]/comments — list comments for a quest
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params;
  const user = await getUserOrCreate();
  const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, questId) });
  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  if (quest.visibility !== "public") {
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
  }
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");
  const limitParam = Number(searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 10;
  const cursorDate = cursor ? new Date(cursor) : null;
  const hasValidCursor = cursorDate instanceof Date && !Number.isNaN(cursorDate.getTime());

  const rows = await db
    .select({
      comment: comments,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        level: users.level,
      },
    })
    .from(comments)
    .leftJoin(users, eq(comments.userId, users.id))
    .where(and(
      eq(comments.questId, questId),
      hasValidCursor ? lt(comments.createdAt, cursorDate!) : undefined
    ))
    .orderBy(desc(comments.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.comment?.createdAt?.toISOString?.() ?? null : null;

  const cacheControl = quest.visibility === "public"
    ? "public, s-maxage=10, stale-while-revalidate=30"
    : "no-store";

  return NextResponse.json({
    comments: pageRows.map((r) => ({
      ...r.comment,
      user: r.user,
    })),
    nextCursor,
    hasMore,
  }, { headers: { "Cache-Control": cacheControl } });
}

// POST /api/quests/[id]/comments — add a comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limitResult = rateLimit(`comments:${user.id}`, 10, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": retryAfterSeconds(limitResult.resetAt) } }
    );
  }

  const { content } = await request.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  }

  const [comment] = await db
    .insert(comments)
    .values({
      questId,
      userId: user.id,
      content: content.trim(),
    })
    .returning();

  const [artifact] = await db
    .insert(questArtifacts)
    .values({
    questId,
    userId: user.id,
    type: "comment",
    sourceId: comment.id,
    summary: content.trim().slice(0, 120),
    metadata: { content: content.trim() },
  })
    .returning();

  const commentPayload = {
    ...comment,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      level: user.level,
    },
  };

  await pusherServer.trigger(`private-quest-comments-${questId}`, "new-comment", commentPayload);

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

  return NextResponse.json({
    comment: {
      ...comment,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        level: user.level,
      },
    },
  }, { status: 201 });
}
