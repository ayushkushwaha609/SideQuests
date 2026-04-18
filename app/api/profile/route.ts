import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getUserOrCreate } from "@/lib/auth-sync";
import { eq } from "drizzle-orm";

export async function PATCH(req: Request) {
  try {
    const user = await getUserOrCreate();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { bio, profileImages } = body;

    const [updatedUser] = await db
      .update(users)
      .set({
        bio: bio !== undefined ? bio : user.bio,
        profileImages: profileImages !== undefined ? profileImages : user.profileImages,
      })
      .where(eq(users.id, user.id))
      .returning();

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("[PROFILE_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
