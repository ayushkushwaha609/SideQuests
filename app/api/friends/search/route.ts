import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, friendships } from "@/db/schema";
import { ilike, or, sql, and, inArray, eq } from "drizzle-orm";
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

  const resultIds = filtered.map((u) => u.id);
  const relations = resultIds.length
    ? await db
        .select()
        .from(friendships)
        .where(and(
          or(eq(friendships.userId, user.id), eq(friendships.friendId, user.id)),
          or(inArray(friendships.userId, resultIds), inArray(friendships.friendId, resultIds))
        ))
    : [];

  const statusByUserId = new Map<string, { status: "pending" | "accepted"; role: "sender" | "receiver" }>();
  for (const f of relations) {
    const otherId = f.userId === user.id ? f.friendId : f.userId;
    statusByUserId.set(otherId, {
      status: f.status,
      role: f.userId === user.id ? "sender" : "receiver",
    });
  }

  const withStatus = filtered.map((u) => {
    const rel = statusByUserId.get(u.id);
    return {
      ...u,
      status: rel?.status,
      role: rel?.role,
    };
  });

  return NextResponse.json(
    { users: withStatus },
    { headers: { "Cache-Control": "no-store" } }
  );
}
