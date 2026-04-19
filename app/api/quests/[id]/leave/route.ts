import { NextResponse } from "next/server";
import { db } from "@/db";
import { questMembers, sidequests } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: questId } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, questId) });
  if (!quest) return NextResponse.json({ error: "Quest not found" }, { status: 404 });

  if (quest.createdBy === user.id) {
    return NextResponse.json({ error: "Owner cannot opt out" }, { status: 403 });
  }

  const member = await db.query.questMembers.findFirst({
    where: and(
      eq(questMembers.questId, questId),
      eq(questMembers.userId, user.id),
      eq(questMembers.inviteStatus, "accepted")
    ),
  });

  if (!member) {
    return NextResponse.json({ error: "Not a member" }, { status: 404 });
  }

  await db.delete(questMembers).where(and(
    eq(questMembers.questId, questId),
    eq(questMembers.userId, user.id)
  ));

  return NextResponse.json({ success: true });
}
