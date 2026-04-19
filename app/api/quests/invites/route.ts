import { NextResponse } from "next/server";
import { db } from "@/db";
import { questMembers, sidequests, users } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";

export async function GET() {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      invite: questMembers,
      quest: sidequests,
      creator: users,
    })
    .from(questMembers)
    .leftJoin(sidequests, eq(questMembers.questId, sidequests.id))
    .leftJoin(users, eq(sidequests.createdBy, users.id))
    .where(and(eq(questMembers.userId, user.id), eq(questMembers.inviteStatus, "pending")))
    .orderBy(desc(questMembers.joinedAt));

  return NextResponse.json({ invites: rows });
}
