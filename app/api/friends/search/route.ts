import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, ilike, not, or } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";

export async function GET(request: Request) {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [] });

  const results = await db
    .select()
    .from(users)
    .where(or(
      ilike(users.username, `%${q}%`),
      ilike(users.displayName, `%${q}%`)
    ))
    .limit(10);

  // Exclude self
  const filtered = results.filter((u) => u.id !== user.id);

  return NextResponse.json({ users: filtered });
}
