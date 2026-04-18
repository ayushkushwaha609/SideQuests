import { NextResponse } from "next/server";
import { db } from "@/db";
import { directMessages, users } from "@/db/schema";
import { pusherServer } from "@/lib/pusher";
import { getUserOrCreate } from "@/lib/auth-sync";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const user = await getUserOrCreate();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { chatId, text, imageUrl } = await req.json();
    if (!chatId) return new NextResponse("Missing chatId", { status: 400 });
    if (!text && !imageUrl) return new NextResponse("Message cannot be empty", { status: 400 });

    // 1. Save to Neon Postgres
    const [savedMessage] = await db.insert(directMessages).values({
      chatId,
      userId: user.id,
      text: text || "",
      imageUrl: imageUrl || null,
    }).returning();

    const sender = await db.query.users.findFirst({ where: eq(users.id, user.id) });

    // 2. Trigger Pusher Event
    await pusherServer.trigger(`chat-${chatId}`, "new-message", {
      id: savedMessage.id,
      chatId: savedMessage.chatId,
      userId: savedMessage.userId,
      username: sender?.username ?? user.username,
      displayName: sender?.displayName ?? user.displayName ?? user.username,
      avatarUrl: sender?.avatarUrl ?? user.avatarUrl ?? null,
      text: savedMessage.text,
      imageUrl: savedMessage.imageUrl,
      createdAt: savedMessage.createdAt,
    });

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error("[MESSAGES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
