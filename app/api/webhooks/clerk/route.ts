import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, activities } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Webhook } from "svix";
import { headers } from "next/headers";

export async function POST(request: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;
  if (!WEBHOOK_SECRET) {
    return NextResponse.json({ error: "No webhook secret" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await request.text();
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: any;
  try {
    evt = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (evt.type === "user.created") {
    const { id: clerkId, username, email_addresses, image_url, first_name, last_name } = evt.data;
    const email = email_addresses?.[0]?.email_address ?? "";
    const generatedUsername = username ?? email.split("@")[0].replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    const displayName = [first_name, last_name].filter(Boolean).join(" ").trim() || generatedUsername;

    const [user] = await db
      .insert(users)
      .values({
        clerkId,
        username: generatedUsername,
        displayName,
        email,
        avatarUrl: image_url ?? null,
        xp: 0,
        level: 1,
        streakCount: 0,
      })
      .onConflictDoNothing()
      .returning();

    if (user) {
      await db.insert(activities).values({
        userId: user.id,
        type: "friend_joined",
        isPublic: true,
      });
    }
  }

  if (evt.type === "user.updated") {
    const { id: clerkId, username, image_url, first_name, last_name } = evt.data;
    const displayName = [first_name, last_name].filter(Boolean).join(" ").trim();
    await db
      .update(users)
      .set({
        avatarUrl: image_url ?? null,
        ...(username ? { username } : {}),
        ...(displayName ? { displayName } : {}),
      })
      .where(eq(users.clerkId, clerkId));
  }

  if (evt.type === "user.deleted") {
    const { id: clerkId } = evt.data;
    await db.delete(users).where(eq(users.clerkId, clerkId));
  }

  return NextResponse.json({ success: true });
}
