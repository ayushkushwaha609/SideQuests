import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments, users } from "@/db/schema";
import { eq, desc, lt, and } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";

// GET /api/quests/[id]/comments — list comments for a quest
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params;
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

  return NextResponse.json({
    comments: pageRows.map((r) => ({
      ...r.comment,
      user: r.user,
    })),
    nextCursor,
    hasMore,
  });
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
