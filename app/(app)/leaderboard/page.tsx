import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, friendships, achievements } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import Link from "next/link";
import { Trophy, Zap, Flame } from "lucide-react";

const ACHIEVEMENT_META: Record<string, { label: string; emoji: string }> = {
  first_quest:  { label: "First Quest",     emoji: "⚔️" },
  streak_7:     { label: "7-Day Streak",     emoji: "🔥" },
  streak_30:    { label: "30-Day Streak",    emoji: "🌟" },
  quests_10:    { label: "10 Quests Done",   emoji: "💪" },
  quests_50:    { label: "50 Quests Done",   emoji: "🏆" },
  quests_100:   { label: "100 Quests Done",  emoji: "👑" },
  first_friend: { label: "First Friend",     emoji: "👥" },
  first_shared: { label: "Shared Quest",     emoji: "🤝" },
  level_5:      { label: "Level 5",          emoji: "⭐" },
  level_10:     { label: "Level 10",         emoji: "🚀" },
};

export default async function LeaderboardPage() {
  const { userId } = await auth();
  const currentUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId!) });
  if (!currentUser) return null;

  // Get friends
  const friendRows = await db
    .select()
    .from(friendships)
    .where(and(
      or(eq(friendships.userId, currentUser.id), eq(friendships.friendId, currentUser.id)),
      eq(friendships.status, "accepted")
    ));

  const friendIds = friendRows.map((f) => f.userId === currentUser.id ? f.friendId : f.userId);
  const allIds = [currentUser.id, ...friendIds];

  // Get all users in network
  const leaderboardUsers = await db
    .select()
    .from(users)
    .where(eq(users.id, allIds[0])); // simplified — will refetch all below

  // Fetch each user
  const allUsers = await Promise.all(allIds.map(id => db.query.users.findFirst({ where: eq(users.id, id) })));
  const validUsers = allUsers.filter(Boolean) as typeof currentUser[];

  // Sort by XP desc
  const ranked = validUsers.sort((a, b) => b.xp - a.xp);

  // My achievements
  const myAchievements = await db
    .select()
    .from(achievements)
    .where(eq(achievements.userId, currentUser.id));

  const medalEmoji = ["🥇", "🥈", "🥉"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1>Leaderboard</h1>

      {/* My stats card */}
      <div className="seamless-item" style={{ padding: "var(--space-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: "var(--weight-bold)", color: "var(--xp-purple-light)" }}>
              #{ranked.findIndex(u => u.id === currentUser.id) + 1}
            </div>
            <div className="label-mono">your rank</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: "var(--space-4)" }}>
              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: "var(--weight-bold)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Zap size={16} fill="var(--xp-purple-light)" color="var(--xp-purple-light)" />
                  {currentUser.xp}
                </div>
                <div className="label-mono">total xp</div>
              </div>
              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: "var(--weight-bold)", color: "var(--streak-amber)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Flame size={16} color="var(--streak-amber)" />
                  {currentUser.streakCount}
                </div>
                <div className="label-mono">streak</div>
              </div>
              <div>
                <div style={{ fontSize: "1.25rem", fontWeight: "var(--weight-bold)", color: "var(--success-light)" }}>
                  {myAchievements.length}
                </div>
                <div className="label-mono">badges</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rankings */}
      <section>
        <h3 style={{ marginBottom: "var(--space-3)" }}>Friends Ranking</h3>
        <div className="seamless-stack">
          {ranked.map((u, i) => {
            const isMe = u.id === currentUser.id;
            const displayName = u.displayName ?? u.username;
            return (
              <Link
                key={u.id}
                href={`/profile/${u.username}`}
                className="seamless-item seamless-item-compact animate-slide-up stagger-item"
                style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", textDecoration: "none", color: "inherit" }}
              >
                <div style={{ width: 32, textAlign: "center", fontSize: i < 3 ? "1.3rem" : "1rem", fontWeight: "var(--weight-bold)", color: "var(--text-muted)" }}>
                  {i < 3 ? medalEmoji[i] : `#${i + 1}`}
                </div>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: isMe ? "var(--xp-purple-glow)" : "var(--bg-elevated)", border: isMe ? "2px solid var(--xp-purple)" : "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                  {u.avatarUrl ? <img src={u.avatarUrl} alt={u.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "var(--weight-medium)", color: isMe ? "var(--xp-purple-light)" : "var(--text-primary)", fontSize: "0.9375rem" }}>
                    {isMe ? "You" : displayName}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Level {u.level}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--xp-purple-light)", fontWeight: "var(--weight-semibold)", fontSize: "0.9rem" }}>
                  <Zap size={13} fill="var(--xp-purple-light)" color="var(--xp-purple-light)" />
                  {u.xp}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* My achievements */}
      <section>
        <h3 style={{ marginBottom: "var(--space-3)" }}>My Achievements</h3>
        {myAchievements.length === 0 ? (
          <div className="empty-state" style={{ padding: "var(--space-8)" }}>
            <div className="empty-state-icon">🏅</div>
            <p>Complete quests to earn achievements!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {myAchievements.map((a) => {
              const meta = ACHIEVEMENT_META[a.type] ?? { label: a.type, emoji: "🏅" };
              return (
                <div key={a.id} className="seamless-item seamless-item-compact" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <span style={{ fontSize: "1.3rem" }}>{meta.emoji}</span>
                  <div>
                    <div style={{ fontWeight: "var(--weight-medium)", fontSize: "0.875rem", color: "var(--text-primary)" }}>{meta.label}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                      {new Date(a.earnedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
