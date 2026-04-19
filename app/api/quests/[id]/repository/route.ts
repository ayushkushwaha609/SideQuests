import { NextResponse } from "next/server";
import { db } from "@/db";
import { questArtifacts, questMembers, sidequests, users } from "@/db/schema";
import { and, desc, eq, inArray, lt, count } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params;
  const user = await getUserOrCreate();

  const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, questId) });
  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  if (quest.visibility !== "public") {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
  const limitParam = Number(searchParams.get("limit") ?? "20");
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;
  const cursorDate = cursor ? new Date(cursor) : null;
  const hasValidCursor = cursorDate instanceof Date && !Number.isNaN(cursorDate.getTime());

  const rows = await db
    .select({
      artifact: questArtifacts,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        level: users.level,
      },
    })
    .from(questArtifacts)
    .leftJoin(users, eq(questArtifacts.userId, users.id))
    .where(and(
      eq(questArtifacts.questId, questId),
      hasValidCursor ? lt(questArtifacts.createdAt, cursorDate!) : undefined
    ))
    .orderBy(desc(questArtifacts.createdAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const pageRows = rows.slice(0, limit);
  const nextCursor = hasMore
    ? pageRows[pageRows.length - 1]?.artifact?.createdAt?.toISOString?.() ?? null
    : null;

  const contributionRows = await db
    .select({
      userId: questArtifacts.userId,
      type: questArtifacts.type,
      count: count(),
    })
    .from(questArtifacts)
    .where(eq(questArtifacts.questId, questId))
    .groupBy(questArtifacts.userId, questArtifacts.type);

  const contributorIds = Array.from(new Set(contributionRows.map((row) => row.userId)));
  const contributorUsers = contributorIds.length
    ? await db.select().from(users).where(inArray(users.id, contributorIds))
    : [];

  const userById = new Map(contributorUsers.map((u) => [u.id, u]));
  const contributions = contributorIds.map((id) => {
    const userRow = userById.get(id);
    const rowsForUser = contributionRows.filter((row) => row.userId === id);
    const byType: Record<string, number> = {};
    let total = 0;
    rowsForUser.forEach((row) => {
      byType[row.type] = Number(row.count ?? 0);
      total += Number(row.count ?? 0);
    });

    return {
      user: userRow
        ? {
            id: userRow.id,
            username: userRow.username,
            displayName: userRow.displayName,
            avatarUrl: userRow.avatarUrl,
            level: userRow.level,
          }
        : null,
      total,
      byType,
    };
  });

  return NextResponse.json({
    artifacts: pageRows.map((row) => ({
      ...row.artifact,
      user: row.user,
    })),
    hasMore,
    nextCursor,
    contributions,
  });
}
