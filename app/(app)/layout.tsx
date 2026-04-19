import { redirect } from "next/navigation";
import { getUserOrCreate } from "@/lib/auth-sync";
import AppHeader from "@/components/app-header";
import BottomNav from "@/components/bottom-nav";
import PwaInstallPrompt from "@/components/pwa-install-prompt";
import { db } from "@/db";
import { friendships, directMessages } from "@/db/schema";
import { and, eq, ilike, ne, isNull, sql } from "drizzle-orm";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrCreate();
  if (!user) redirect("/sign-in");

  const pendingRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(friendships)
    .where(and(eq(friendships.friendId, user.id), eq(friendships.status, "pending")));

  const unreadRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(directMessages)
    .where(
      and(
        ilike(directMessages.chatId, `%${user.id}%`),
        ne(directMessages.userId, user.id),
        isNull(directMessages.readAt)
      )
    );

  const pendingCount = Number(pendingRows[0]?.count ?? 0);
  const unreadCount = Number(unreadRows[0]?.count ?? 0);

  return (
    <div className="app-shell">
      <AppHeader
        xp={user?.xp ?? 0}
        level={user?.level ?? 1}
        streak={user?.streakCount ?? 0}
        unreadMessages={unreadCount}
      />
      <main className="page-content">{children}</main>
      <PwaInstallPrompt />
      <BottomNav pendingRequests={pendingCount} />
    </div>
  );
}
