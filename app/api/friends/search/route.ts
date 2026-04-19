import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ilike, or, sql } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";

export async function GET(request: Request) {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized or User not found" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json({ users: [] });

  const qLike = `%${q}%`;
  const qPrefix = `${q}%`;

  const results = await db
    .select()
    .from(users)
    .where(or(
      ilike(users.username, qLike),
      ilike(users.displayName, qLike)
    ))
    .orderBy(sql`
      case
        when ${users.username} ilike ${qPrefix} then 0
        when ${users.username} ilike ${qLike} then 1
        when ${users.displayName} ilike ${qPrefix} then 2
        when ${users.displayName} ilike ${qLike} then 3
        else 4
      end
    `, users.username)
    .limit(10);

  // Exclude self
  const filtered = results.filter((u) => u.id !== user.id);

  return NextResponse.json({ users: filtered });
}
