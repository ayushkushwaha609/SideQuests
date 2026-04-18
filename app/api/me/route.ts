import { NextResponse } from "next/server";
import { getUserOrCreate } from "@/lib/auth-sync";

export async function GET() {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ user });
}
