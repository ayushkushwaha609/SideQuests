import { NextResponse } from "next/server";
import { db } from "@/db";
import { questMembers, sidequests } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserOrCreate } from "@/lib/auth-sync";
import { pusherServer } from "@/lib/pusher";

function getChannelParam(body: string, name: string) {
  const params = new URLSearchParams(body);
  return params.get(name);
}

async function canAccessQuestChannel(userId: string, questId: string) {
  const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, questId) });
  if (!quest) return false;
  if (quest.visibility === "public") return true;
  if (quest.createdBy === userId) return true;

  const member = await db.query.questMembers.findFirst({
    where: and(
      eq(questMembers.questId, questId),
      eq(questMembers.userId, userId),
      eq(questMembers.inviteStatus, "accepted")
    ),
  });

  return Boolean(member);
}

export async function POST(request: Request) {
  const user = await getUserOrCreate();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const contentType = request.headers.get("content-type") ?? "";
  let socketId: string | null = null;
  let channelName: string | null = null;

  if (contentType.includes("application/json")) {
    const body = await request.json().catch(() => ({}));
    socketId = body?.socket_id ?? null;
    channelName = body?.channel_name ?? null;
  } else {
    const raw = await request.text();
    socketId = getChannelParam(raw, "socket_id");
    channelName = getChannelParam(raw, "channel_name");
  }

  if (!socketId || !channelName) {
    return NextResponse.json({ error: "Invalid auth request" }, { status: 400 });
  }

  if (channelName.startsWith("private-quest-comments-")) {
    const questId = channelName.replace("private-quest-comments-", "");
    if (!await canAccessQuestChannel(user.id, questId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (channelName.startsWith("private-quest-activity-")) {
    const questId = channelName.replace("private-quest-activity-", "");
    if (!await canAccessQuestChannel(user.id, questId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (channelName.startsWith("private-quest-invite-status-")) {
    const questId = channelName.replace("private-quest-invite-status-", "");
    const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, questId) });
    if (!quest || quest.createdBy !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (channelName.startsWith("private-quest-invites-")) {
    const targetUserId = channelName.replace("private-quest-invites-", "");
    if (targetUserId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else if (channelName.startsWith("private-chat-")) {
    const chatId = channelName.replace("private-chat-", "");
    if (chatId.startsWith("quest_")) {
      const questId = chatId.replace("quest_", "");
      if (!await canAccessQuestChannel(user.id, questId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else {
      const [firstId, secondId] = chatId.split("_");
      if (firstId !== user.id && secondId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  } else {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }

  const auth = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(auth);
}
