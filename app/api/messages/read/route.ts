import { NextResponse } from "next/server";
import { db } from "@/db";
import { directMessages } from "@/db/schema";
import { getUserOrCreate } from "@/lib/auth-sync";
import { and, eq, ne, isNull } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const user = await getUserOrCreate();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { chatId } = await req.json();
    if (!chatId) return new NextResponse("Missing chatId", { status: 400 });

    const updated = await db
      .update(directMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(directMessages.chatId, chatId),
          ne(directMessages.userId, user.id),
          isNull(directMessages.readAt)
        )
      )
      .returning({ id: directMessages.id });

    return NextResponse.json({ updated: updated.length });
  } catch (error) {
    console.error("[MESSAGES_READ]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
