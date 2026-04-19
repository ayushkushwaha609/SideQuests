import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, sidequests, questCompletions, achievements, activities } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { sendPushToUser } from "@/lib/push";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

  const limitResult = rateLimit(`quests:complete:${user.id}`, 10, 60_000);
  if (!limitResult.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": retryAfterSeconds(limitResult.resetAt) } }
    );
  }

  const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, questId) });
  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  function getStartOfPeriod(recur: string): Date {
    const d = new Date();
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

  const lastCompletion = await db.query.questCompletions.findFirst({
    where: and(eq(questCompletions.questId, questId), eq(questCompletions.userId, user.id)),
    orderBy: (qc, { desc }) => [desc(qc.completedAt)],
  });

  if (lastCompletion) {
    if (quest.recurrence === "one-time") {
      return NextResponse.json({ error: "Already completed" }, { status: 409 });
    }
    const startOfPeriod = getStartOfPeriod(quest.recurrence);
    if (lastCompletion.completedAt >= startOfPeriod) {
      return NextResponse.json({ error: "Already completed" }, { status: 409 });
    }
  }

  const body = await request.json().catch(() => ({}));

  // Record completion
  await db.insert(questCompletions).values({
    questId,
    userId: user.id,
    note: body.note ?? null,
    imageUrl: body.imageUrl ?? null,
  });

  if (quest.recurrence === "one-time") {
    await db.update(sidequests).set({ status: "completed" }).where(eq(sidequests.id, quest.id));
  }

  // Award XP
  const newXp = user.xp + quest.xpReward;
  const newLevel = Math.floor(newXp / 100) + 1;

  // Streak Calculation
  const now = new Date();
  const lastActive = user.lastActiveAt ? new Date(user.lastActiveAt) : null;
  let newStreak = user.streakCount || 0;

  if (!lastActive) {
    // First time ever completing a quest
    newStreak = 1;
  } else {
    // Check days difference based on local days, we use offset simplified
    const ONE_DAY = 1000 * 60 * 60 * 24;
    
    // Simplest way to check "calendar days" difference without complex timezone math
    // is to just compare the Date strings in YYYY-MM-DD
    const lastDate = lastActive.toISOString().split("T")[0];
    const nowDate = now.toISOString().split("T")[0];
    
    if (lastDate === nowDate) {
      // Already completed a quest today, keep streak identical
    } else {
      // Is it exactly yesterday?
      const yesterday = new Date(now.getTime() - ONE_DAY);
      const yesterdayDate = yesterday.toISOString().split("T")[0];
      
      if (lastDate === yesterdayDate) {
        newStreak += 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }
  }

  await db.update(users).set({ 
    xp: newXp, 
    level: newLevel,
    streakCount: newStreak,
    lastActiveAt: now
  }).where(eq(users.id, user.id));

  // Log activity
  await db.insert(activities).values({
    userId: user.id,
    type: "quest_completed",
    questId: quest.id,
    isPublic: true,
  });

  // Check achievements
  const completionsCount = await db.select({ count: count() }).from(questCompletions).where(eq(questCompletions.userId, user.id));
  const total = completionsCount[0]?.count ?? 0;
  const earnedAchievements: string[] = [];

  const checkAndAward = async (type: string, condition: boolean) => {
    if (!condition) return;
    const existing = await db.query.achievements.findFirst({
      where: and(eq(achievements.userId, user.id), eq(achievements.type, type as any)),
    });
    if (!existing) {
      await db.insert(achievements).values({ userId: user.id, type: type as any });
      earnedAchievements.push(type);
    }
  };

  await checkAndAward("first_quest", total === 1);
  await checkAndAward("quests_10", total >= 10);
  await checkAndAward("quests_50", total >= 50);
  await checkAndAward("quests_100", total >= 100);
  await checkAndAward("level_5", newLevel >= 5);
  await checkAndAward("level_10", newLevel >= 10);

  if (quest.createdBy !== user.id) {
    await sendPushToUser(quest.createdBy, {
      title: "Quest completed",
      body: `${user.displayName ?? user.username} completed ${quest.title}.`,
      url: `/quests/${quest.id}`,
    });
  }

  return NextResponse.json({
    success: true,
    xpGained: quest.xpReward,
    newXp,
    newLevel,
    achievements: earnedAchievements,
  });
}
