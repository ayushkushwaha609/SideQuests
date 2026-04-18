import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, sidequests, questMembers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";

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

  const myCompletions = await db.query.questCompletions.findMany({
    where: (qc, { eq }) => eq(qc.userId, user.id),
  });

  const now = new Date();
  
  function getStartOfPeriod(recur: string): Date {
    const d = new Date(now);
    d.setHours(0,0,0,0);
    if (recur === "daily") return d;
    if (recur === "weekly") { d.setDate(d.getDate() - d.getDay()); return d; }
    if (recur === "monthly") { d.setDate(1); return d; }
    if (recur === "yearly") { d.setMonth(0, 1); return d; }
    return new Date(0); // one-time basically means forever
  }

  const processedQuests = myQuests.map((q) => {
    let computedStatus = q.status;
    if (computedStatus === "active" && q.recurrence !== "one-time") {
      const startOfPeriod = getStartOfPeriod(q.recurrence);
      const isCompletedRecently = myCompletions.some(
        (c) => c.questId === q.id && new Date(c.completedAt) >= startOfPeriod
      );
      if (isCompletedRecently) {
        computedStatus = "completed";
      }
    }
    return { ...q, status: computedStatus };
  });

  return NextResponse.json({ quests: processedQuests });
}

export async function POST(request: Request) {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

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
