import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";

// GET /api/quests/[id]/comments — list comments for a quest
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params;

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
    .where(eq(comments.questId, questId))
    .orderBy(desc(comments.createdAt))
    .limit(50);

  return NextResponse.json({
    comments: rows.map((r) => ({
      ...r.comment,
      user: r.user,
    })),
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
