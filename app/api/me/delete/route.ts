import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
    await db.delete(users).where(eq(users.clerkId, userId));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
