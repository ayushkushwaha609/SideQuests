import { NextResponse } from "next/server";
import { db } from "@/db";
import { feedClears } from "@/db/schema";
import { getUserOrCreate } from "@/lib/auth-sync";

export async function POST(request: Request) {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const tab = body?.tab;

  if (tab !== "friends" && tab !== "public") {
    return NextResponse.json({ error: "Invalid tab" }, { status: 400 });
  }

  const now = new Date();

  await db
    .insert(feedClears)
    .values({
      userId: user.id,
      feedType: tab,
      clearedAt: now,
    })
    .onConflictDoUpdate({
      target: [feedClears.userId, feedClears.feedType],
      set: { clearedAt: now },
    });

  return NextResponse.json({ success: true, clearedAt: now.toISOString() });
}
