import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, sidequests, friendships, activities } from "@/db/schema";
import { eq, and, or, desc, inArray, ne } from "drizzle-orm";
import Link from "next/link";
import { CheckCircle2, Star, Users, Zap, UserPlus } from "lucide-react";
import { getUserOrCreate } from "@/lib/auth-sync";
import CommentsSection from "@/components/comments-section";

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await getUserOrCreate();
  if (!user) return <div className="p-4 text-center">Loading profile...</div>;

  const sp = await searchParams;
  const activeTab = sp.tab === "public" ? "public" : "friends";

  // Shared Data: Get friend relationships
  const allFriendships = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.userId, user.id), eq(friendships.friendId, user.id)));

  // For Friends feed: only accepted friends
  const acceptedFriendIds = allFriendships
    .filter(f => f.status === "accepted")
    .map(f => f.userId === user.id ? f.friendId : f.userId);

  // For Public feed: hide Add button if any relationship exists (accepted or pending)
  const allConnectedIds = allFriendships
    .map(f => f.userId === user.id ? f.friendId : f.userId);

  // -----------------------------------------------------
  // TAB: FRIENDS ACTIVITY
  // -----------------------------------------------------
  let recentActivity: any[] = [];
  if (activeTab === "friends" && acceptedFriendIds.length > 0) {
    // Only friends, NOT self. Also join quest details for completions
    const acts = await db
      .select({
        activity: activities,
        quest: sidequests,
        actor: users,
      })
      .from(activities)
      .leftJoin(sidequests, eq(activities.questId, sidequests.id))
      .leftJoin(users, eq(activities.userId, users.id))
      .where(inArray(activities.userId, acceptedFriendIds))
      .orderBy(desc(activities.createdAt))
      .limit(20);
    recentActivity = acts;
  }

  // -----------------------------------------------------
  // TAB: PUBLIC FEED
  // -----------------------------------------------------
  let publicQuests: any[] = [];
  if (activeTab === "public") {
    publicQuests = await db
      .select({
        quest: sidequests,
        creator: users,
      })
      .from(sidequests)
      .leftJoin(users, eq(sidequests.createdBy, users.id))
      .where(and(eq(sidequests.visibility, "public"), eq(sidequests.status, "active")))
      .orderBy(desc(sidequests.createdAt))
      .limit(30);
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      {/* Streak overview */}
      {user.streakCount > 0 && (
        <div className="streak-banner">
          <span style={{ fontSize: "2rem" }}>🔥</span>
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span className="streak-number">{user.streakCount}</span>
              <span style={{ color: "var(--streak-amber)", fontWeight: "var(--weight-medium)", fontSize: "0.875rem" }}>
                day streak
              </span>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
              Keep going — you&apos;re on a roll!
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        <Link href="/?tab=friends" className={`tab-item ${activeTab === "friends" ? "active" : ""}`} style={{ textDecoration: "none" }}>
          Friends
        </Link>
        <Link href="/?tab=public" className={`tab-item ${activeTab === "public" ? "active" : ""}`} style={{ textDecoration: "none" }}>
          Public World
        </Link>
      </div>

      {/* FRIENDS TAB CONTENT */}
      {activeTab === "friends" && (
        <section>
          {recentActivity.length === 0 ? (
            <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-6)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "var(--space-3)" }}>👥</div>
              <p style={{ marginBottom: "var(--space-3)" }}>
                Add friends to see their detailed quest activity here.
              </p>
              <Link href="/friends" className="btn btn-secondary btn-sm">
                Find friends
              </Link>
            </div>
          ) : (
            <div className="seamless-stack">
              {recentActivity.map(({ activity, quest, actor }) => {
                if (!actor) return null;
                const displayName = actor.displayName ?? actor.username;
                
                return (
                  <div key={activity.id} className="seamless-item animate-slide-up stagger-item">
                    {/* Header */}
                    <div className="flex items-center gap-1" style={{ gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
                      <Link href={`/profile/${actor.username}`} style={{ textDecoration: "none" }}>
                        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {actor.avatarUrl ? <img src={actor.avatarUrl} alt={actor.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
                        </div>
                      </Link>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "0.875rem", display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <Link href={`/profile/${actor.username}`} style={{ fontWeight: "var(--weight-bold)", color: "var(--text-primary)", textDecoration: "none" }}>
                            {displayName}
                          </Link>
                          <span style={{ color: "var(--text-secondary)" }}>
                            {activity.type === "quest_completed" && "completed a quest ⚔️"}
                            {activity.type === "achievement_earned" && `earned a badge 🏅`}
                            {activity.type === "friend_joined" && "joined SideQuest!"}
                          </span>
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginTop: 2 }}>{timeAgo(activity.createdAt)}</div>
                      </div>
                    </div>

                    {/* Quest Context Block */}
                    {activity.type === "quest_completed" && quest && (
                      <Link href={`/quests/${quest.id}`} className="quest-tile-link">
                        <div className="quest-tile quest-tile-compact" style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                          <span style={{ fontSize: "1.5rem" }}>{quest.coverEmoji}</span>
                          <div>
                            <div style={{ fontWeight: "var(--weight-semibold)", color: "var(--text-primary)", fontSize: "0.95rem" }}>
                              {quest.title}
                            </div>
                            {quest.description && (
                              <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                                {quest.description}
                              </div>
                            )}
                            <div className="flex items-center gap-1" style={{ gap: "var(--space-2)", marginTop: 6 }}>
                              <span className={`badge badge-${quest.recurrence}`}>{quest.recurrence}</span>
                              <span style={{ color: "var(--xp-purple-light)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 3 }}>
                                <Zap size={11} fill="var(--xp-purple-light)" color="var(--xp-purple-light)" />
                                {quest.xpReward} XP
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}

                    {activity.type === "achievement_earned" && (
                      <div className="quest-tile quest-tile-compact" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
                        <Star size={24} color="var(--streak-amber)" />
                        <div style={{ fontWeight: "var(--weight-medium)", color: "var(--streak-amber-light)", fontSize: "0.95rem" }}>
                          New Achievement Unlocked
                        </div>
                      </div>
                    )}

                    {/* Comments */}
                    {activity.type === "quest_completed" && quest && (
                      <CommentsSection questId={quest.id} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* PUBLIC TAB CONTENT */}
      {activeTab === "public" && (
        <section>
          {publicQuests.length === 0 ? (
            <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-6)" }}>
              <p>No public quests found in the world yet.</p>
            </div>
          ) : (
            <div className="seamless-stack">
              {publicQuests.map(({ quest, creator }) => {
                if (!creator) return null;
                const creatorName = creator.displayName ?? creator.username;
                const isMyQuest = creator.id === user.id;
                const isConnected = allConnectedIds.includes(creator.id);
                
                return (
                  <div key={quest.id} className="seamless-item animate-slide-up stagger-item">
                    {/* User Info */}
                    <div className="flex items-center justify-between" style={{ marginBottom: "var(--space-3)" }}>
                      <Link href={`/profile/${creator.username}`} style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--bg-elevated)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                          {creator.avatarUrl ? <img src={creator.avatarUrl} alt={creator.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
                        </div>
                        <div>
                          <div style={{ fontWeight: "var(--weight-bold)", color: "var(--text-primary)", fontSize: "0.875rem" }}>{creatorName}</div>
                          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>Level {creator.level} · {timeAgo(quest.createdAt)}</div>
                        </div>
                      </Link>

                      {/* Quick Add Friend Button */}
                      {!isMyQuest && !isConnected && (
                        <Link href="/friends" className="btn btn-secondary btn-sm" style={{ padding: "4px 8px" }}>
                          <UserPlus size={14} /> <span style={{ fontSize: "0.75rem" }}>Add</span>
                        </Link>
                      )}
                    </div>

                    {/* Quest Block */}
                      <Link href={`/quests/${quest.id}`} className="quest-tile-link">
                        <div className="quest-tile quest-tile-compact" style={{ display: "flex", gap: "var(--space-3)" }}>
                        <span style={{ fontSize: "1.5rem" }}>{quest.coverEmoji}</span>
                        <div>
                          <div style={{ fontWeight: "var(--weight-semibold)", color: "var(--text-primary)", fontSize: "0.95rem" }}>
                            {quest.title}
                          </div>
                          {quest.description && (
                            <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                              {quest.description}
                            </div>
                          )}
                          <div className="flex items-center gap-1" style={{ gap: "var(--space-2)", marginTop: 6 }}>
                            <span className={`badge badge-${quest.recurrence}`}>{quest.recurrence}</span>
                            <span style={{ color: "var(--xp-purple-light)", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: 3 }}>
                              <Zap size={11} fill="var(--xp-purple-light)" color="var(--xp-purple-light)" />
                              {quest.xpReward} XP
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Comments */}
                    <CommentsSection questId={quest.id} />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
