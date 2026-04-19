import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, sidequests, questMembers, questCompletions } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const recurrence = searchParams.get("recurrence");

  const memberRows = await db
    .select({ questId: questMembers.questId })
    .from(questMembers)
    .where(and(eq(questMembers.userId, user.id), eq(questMembers.inviteStatus, "accepted")));

  const memberQuestIds = memberRows.map((row) => row.questId);

  const baseCondition = memberQuestIds.length
    ? or(eq(sidequests.createdBy, user.id), inArray(sidequests.id, memberQuestIds))
    : eq(sidequests.createdBy, user.id);

  const myQuests = await db
    .select()
    .from(sidequests)
    .where(
      recurrence
        ? and(baseCondition, eq(sidequests.recurrence, recurrence as any))
        : baseCondition
    )
    .orderBy(desc(sidequests.createdAt));

  const now = new Date();

  function getStartOfPeriod(recur: string): Date {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    if (recur === "daily") return d;
    if (recur === "weekly") {
      d.setDate(d.getDate() - d.getDay());
      return d;
    }
    if (recur === "monthly") {
      d.setDate(1);
      return d;
    }
    if (recur === "yearly") {
      d.setMonth(0, 1);
      return d;
    }
    return new Date(0);
  }

  const questIds = myQuests.map((q) => q.id);
  const completions = questIds.length
    ? await db
        .select({ questId: questCompletions.questId, completedAt: questCompletions.completedAt })
        .from(questCompletions)
        .where(and(eq(questCompletions.userId, user.id), inArray(questCompletions.questId, questIds)))
        .orderBy(desc(questCompletions.completedAt))
    : [];

  const latestCompletionByQuest = new Map<string, Date>();
  for (const c of completions) {
    if (!latestCompletionByQuest.has(c.questId)) {
      latestCompletionByQuest.set(c.questId, c.completedAt);
    }
  }

  const processedQuests = myQuests.map((q) => {
    let computedStatus = q.status;
    const lastCompletedAt = latestCompletionByQuest.get(q.id);
    if (computedStatus === "active" && lastCompletedAt) {
      if (q.recurrence === "one-time" || q.recurrence === "lifetime") {
        computedStatus = "completed";
      } else {
        const startOfPeriod = getStartOfPeriod(q.recurrence);
        if (lastCompletedAt >= startOfPeriod) {
          computedStatus = "completed";
        }
      }
    }
    return { ...q, status: computedStatus };
  });

  return NextResponse.json({ quests: processedQuests });
}

export async function POST(request: Request) {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

  const limitResult = rateLimit(`quests:create:${user.id}`, 10, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": retryAfterSeconds(limitResult.resetAt) } }
    );
  }

  const body = await request.json();
  const { title, description, recurrence, visibility, coverEmoji, dueDate } = body;

  if (!title?.trim()) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const XP_MAPPING: Record<string, number> = {
    daily: 10,
    weekly: 50,
    monthly: 100,
    yearly: 500,
    lifetime: 1000,
    "one-time": 25,
  };

  const [quest] = await db
    .insert(sidequests)
    .values({
      title: title.trim(),
      description: description?.trim() || null,
      recurrence: recurrence || "one-time",
      visibility: visibility || "friends",
      xpReward: XP_MAPPING[recurrence || "one-time"] ?? 25,
      coverEmoji: coverEmoji || "⚔️",
      dueDate: dueDate ? new Date(dueDate) : null,
      createdBy: user.id,
      status: "active",
    })
    .returning();

  // Add creator as owner member
  await db.insert(questMembers).values({
    questId: quest.id,
    userId: user.id,
    role: "owner",
    inviteStatus: "accepted",
  });

  return NextResponse.json({ quest }, { status: 201 });
}
