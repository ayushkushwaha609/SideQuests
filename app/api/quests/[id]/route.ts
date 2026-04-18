import { NextResponse } from "next/server";
import { db } from "@/db";
import { sidequests } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const quest = await db.query.sidequests.findFirst({
    where: and(eq(sidequests.id, id), eq(sidequests.createdBy, user.id)),
  });

  if (!quest) {
    return NextResponse.json({ error: "Not found or not authorized" }, { status: 404 });
  }

  await db.delete(sidequests).where(eq(sidequests.id, id));

  return NextResponse.json({ success: true });
}
