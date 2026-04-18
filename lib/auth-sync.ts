import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getUserOrCreate() {
  const { userId } = await auth();
  if (!userId) return null;

  let dbUser = await db.query.users.findFirst({
    where: eq(users.clerkId, userId),
  });

  // Lazy sync if webhook failed or hasn't fired yet
  if (!dbUser) {
    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const username = clerkUser.username ?? email.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase() + Math.floor(Math.random() * 1000);
    const fullName = (clerkUser.fullName || "").trim();
    const fallbackName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim();
    const displayName = fullName || fallbackName || username;

    const [newUser] = await db
      .insert(users)
      .values({
        clerkId: clerkUser.id,
        username,
        displayName,
        email,
        avatarUrl: clerkUser.imageUrl,
        xp: 0,
        level: 1,
        streakCount: 0,
      })
      .onConflictDoNothing()
      .returning();

    dbUser = newUser;

    // In case of race condition, fetch again
    if (!dbUser) {
      dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, userId),
      });
    }
  }

  return dbUser || null;
}
