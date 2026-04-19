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

  // Get quests created by user OR quests they're a member of
  const myQuests = await db
    .select()
    .from(sidequests)
    .where(
      recurrence
        ? and(eq(sidequests.createdBy, user.id), eq(sidequests.recurrence, recurrence as any))
        : eq(sidequests.createdBy, user.id)
    )
    .orderBy(desc(sidequests.createdAt));

  const now = new Date();

  function addMonths(date: Date, months: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function addYears(date: Date, years: number) {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + years);
    return d;
  }

  function getNextAvailableAt(recur: string, lastCompletedAt: Date) {
    if (recur === "daily") return new Date(lastCompletedAt.getTime() + 24 * 60 * 60 * 1000);
    if (recur === "weekly") return new Date(lastCompletedAt.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (recur === "monthly") return addMonths(lastCompletedAt, 1);
    if (recur === "yearly") return addYears(lastCompletedAt, 1);
    return null;
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
      if (q.recurrence === "one-time") {
        computedStatus = "completed";
      } else {
        const nextAvailableAt = getNextAvailableAt(q.recurrence, lastCompletedAt);
        if (nextAvailableAt && now < nextAvailableAt) {
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
