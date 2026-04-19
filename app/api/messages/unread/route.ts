import { NextResponse } from "next/server";
import { db } from "@/db";
import { directMessages } from "@/db/schema";
import { getUserOrCreate } from "@/lib/auth-sync";
import { and, ilike, isNull, ne, sql } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getUserOrCreate();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(directMessages)
      .where(
        and(
          ilike(directMessages.chatId, `%${user.id}%`),
          ne(directMessages.userId, user.id),
          isNull(directMessages.readAt)
        )
      );

    return NextResponse.json({ count: Number(rows[0]?.count ?? 0) });
  } catch (error) {
    console.error("[MESSAGES_UNREAD]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
