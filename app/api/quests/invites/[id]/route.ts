import { NextResponse } from "next/server";
import { db } from "@/db";
import { questMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const accept = body.accept === true;

  const [updated] = await db
    .update(questMembers)
    .set({ inviteStatus: accept ? "accepted" : "declined" })
    .where(and(eq(questMembers.id, id), eq(questMembers.userId, user.id)))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  return NextResponse.json({ status: updated.inviteStatus });
}
