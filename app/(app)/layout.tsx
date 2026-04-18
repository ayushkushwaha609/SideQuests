import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserOrCreate } from "@/lib/auth-sync";
import AppHeader from "@/components/app-header";
import BottomNav from "@/components/bottom-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUserOrCreate();
  if (!user) redirect("/sign-in");

  return (
    <div className="app-shell">
      <AppHeader xp={user?.xp ?? 0} level={user?.level ?? 1} streak={user?.streakCount ?? 0} />
      <main className="page-content">{children}</main>
      <BottomNav />
    </div>
  );
}
