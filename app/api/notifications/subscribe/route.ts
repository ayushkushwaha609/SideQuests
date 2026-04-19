import { NextResponse } from "next/server";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { getUserOrCreate } from "@/lib/auth-sync";
import { and, eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const user = await getUserOrCreate();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const endpoint = body?.endpoint;
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return new NextResponse("Invalid subscription", { status: 400 });
    }

    const existing = await db.query.pushSubscriptions.findFirst({
      where: and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)),
    });

    if (!existing) {
      await db.insert(pushSubscriptions).values({
        userId: user.id,
        endpoint,
        p256dh,
        auth,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUSH_SUBSCRIBE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getUserOrCreate();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { endpoint } = await req.json();
    if (!endpoint) return new NextResponse("Missing endpoint", { status: 400 });

    await db
      .delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUSH_UNSUBSCRIBE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
