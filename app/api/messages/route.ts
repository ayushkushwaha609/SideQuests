import { NextResponse } from "next/server";
import { db } from "@/db";
import { directMessages, users } from "@/db/schema";
import { pusherServer } from "@/lib/pusher";
import { getUserOrCreate } from "@/lib/auth-sync";
import { rateLimit, retryAfterSeconds } from "@/lib/rate-limit";
import { eq, and, lt, desc } from "drizzle-orm";
import { sendPushToUser } from "@/lib/push";

export async function GET(req: Request) {
  try {
    const user = await getUserOrCreate();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get("chatId");
    const cursor = searchParams.get("cursor");
    const limitParam = Number(searchParams.get("limit") ?? "50");
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 50;
    const cursorDate = cursor ? new Date(cursor) : null;
    const hasValidCursor = cursorDate instanceof Date && !Number.isNaN(cursorDate.getTime());

    if (!chatId) return new NextResponse("Missing chatId", { status: 400 });
    if (chatId.startsWith("quest_")) {
      return new NextResponse("Quest chat is no longer supported", { status: 400 });
    }

    const rows = await db
      .select()
      .from(directMessages)
      .where(and(
        eq(directMessages.chatId, chatId),
        hasValidCursor ? lt(directMessages.createdAt, cursorDate!) : undefined
      ))
      .orderBy(desc(directMessages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);
    const nextCursor = hasMore ? pageRows[pageRows.length - 1]?.createdAt?.toISOString?.() ?? null : null;

    return NextResponse.json({
      messages: pageRows,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error("[MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserOrCreate();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const limitResult = rateLimit(`messages:${user.id}`, 20, 60_000);
    if (!limitResult.ok) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": retryAfterSeconds(limitResult.resetAt) },
      });
    }

    const { chatId, text, imageUrl } = await req.json();
    if (!chatId) return new NextResponse("Missing chatId", { status: 400 });
    if (chatId.startsWith("quest_")) {
      return new NextResponse("Quest chat is no longer supported", { status: 400 });
    }
    if (!text && !imageUrl) return new NextResponse("Message cannot be empty", { status: 400 });

    // 1. Save to Neon Postgres
    const [savedMessage] = await db.insert(directMessages).values({
      chatId,
      userId: user.id,
      text: text || "",
      imageUrl: imageUrl || null,
    }).returning();

    const sender = await db.query.users.findFirst({ where: eq(users.id, user.id) });

    const [firstId, secondId] = chatId.split("_");
    const recipientId = firstId === user.id ? secondId : firstId;
    const senderName = sender?.displayName ?? sender?.username ?? user.username;
    const preview = text?.trim()
      ? text.trim().slice(0, 120)
      : imageUrl
        ? "Sent you an image"
        : "Sent you a message";

    if (recipientId && recipientId !== user.id) {
      await sendPushToUser(recipientId, {
        title: `${senderName} messaged you`,
        body: preview,
        url: `/messages/${sender?.username ?? user.username}`,
      });
    }

    // 2. Trigger Pusher Event
    await pusherServer.trigger(`private-chat-${chatId}`, "new-message", {
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
