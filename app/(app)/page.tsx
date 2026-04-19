import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, sidequests, friendships, activities } from "@/db/schema";
import { eq, and, or, desc, inArray, ne, lt } from "drizzle-orm";
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

export default async function HomePage({ searchParams }: { searchParams: Promise<{ tab?: string; cursor?: string }> }) {
  const user = await getUserOrCreate();
  if (!user) return <div className="p-4 text-center">Loading profile...</div>;

  const sp = await searchParams;
  const activeTab = sp.tab === "public" ? "public" : "friends";
  const cursor = sp.cursor ? new Date(sp.cursor) : null;
  const hasValidCursor = cursor instanceof Date && !Number.isNaN(cursor.getTime());
  const pageSizeFriends = 20;
  const pageSizePublic = 30;

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
  const displayName = user.displayName ?? user.username ?? "Adventurer";
  const friendsCount = acceptedFriendIds.length;

  // -----------------------------------------------------
  // TAB: FRIENDS ACTIVITY
  // -----------------------------------------------------
  let recentActivity: any[] = [];
  let friendsHasMore = false;
  let friendsNextCursor: string | null = null;
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
      .where(and(
        inArray(activities.userId, acceptedFriendIds),
        hasValidCursor ? lt(activities.createdAt, cursor!) : undefined
      ))
      .orderBy(desc(activities.createdAt))
      .limit(pageSizeFriends + 1);

    friendsHasMore = acts.length > pageSizeFriends;
    recentActivity = acts.slice(0, pageSizeFriends);
    if (friendsHasMore && recentActivity.length > 0) {
      friendsNextCursor = recentActivity[recentActivity.length - 1].activity.createdAt.toISOString();
    }
  }

  // -----------------------------------------------------
  // TAB: PUBLIC FEED
  // -----------------------------------------------------
  let publicQuests: any[] = [];
  let publicHasMore = false;
  let publicNextCursor: string | null = null;
  if (activeTab === "public") {
    publicQuests = await db
      .select({
        quest: sidequests,
        creator: users,
      })
      .from(sidequests)
      .leftJoin(users, eq(sidequests.createdBy, users.id))
      .where(and(
        eq(sidequests.visibility, "public"),
        eq(sidequests.status, "active"),
        hasValidCursor ? lt(sidequests.createdAt, cursor!) : undefined
      ))
      .orderBy(desc(sidequests.createdAt))
      .limit(pageSizePublic + 1);

    publicHasMore = publicQuests.length > pageSizePublic;
    publicQuests = publicQuests.slice(0, pageSizePublic);
    if (publicHasMore && publicQuests.length > 0) {
      publicNextCursor = publicQuests[publicQuests.length - 1].quest.createdAt.toISOString();
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <section className="card" style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        background: "linear-gradient(135deg, rgba(45, 212, 191, 0.2), rgba(96, 165, 250, 0.12))",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div>
            <div className="label-mono">Questboard</div>
            <h1 style={{ marginTop: "var(--space-2)" }}>Welcome back, {displayName}</h1>
            <p style={{ marginTop: "var(--space-2)", maxWidth: 320 }}>
              Pick your next quest, squad up with friends, and keep the streak alive.
            </p>
          </div>
          <div className="card" style={{
            padding: "var(--space-3)",
            minWidth: 120,
            textAlign: "center",
            background: "var(--bg-surface)",
          }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Level</div>
            <div style={{ fontSize: "1.6rem", fontWeight: "var(--weight-bold)", color: "var(--xp-purple)" }}>{user.level}</div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{user.xp} XP</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--space-3)" }}>
          <div className="card" style={{ padding: "var(--space-3)", background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Party</div>
            <div style={{ fontWeight: "var(--weight-bold)", fontSize: "1.1rem" }}>{friendsCount} friends</div>
          </div>
          <div className="card" style={{ padding: "var(--space-3)", background: "var(--bg-elevated)" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Streak</div>
            <div style={{ fontWeight: "var(--weight-bold)", fontSize: "1.1rem" }}>{user.streakCount} days</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <Link href="/quests/new" className="btn btn-primary btn-sm">
            Start a quest
          </Link>
          <Link href="/friends" className="btn btn-secondary btn-sm">
            Find a party
          </Link>
        </div>
      </section>

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
          Party Feed
        </Link>
        <Link href="/?tab=public" className={`tab-item ${activeTab === "public" ? "active" : ""}`} style={{ textDecoration: "none" }}>
          Global Arcade
        </Link>
      </div>

      {/* FRIENDS TAB CONTENT */}
      {activeTab === "friends" && (
        <section>
          {recentActivity.length === 0 ? (
            <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-6)" }}>
              <div style={{ fontSize: "2rem", marginBottom: "var(--space-3)" }}>👥</div>
              <p style={{ marginBottom: "var(--space-3)" }}>
                Your party feed is empty. Send a friend request to start the co-op grind.
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
          {friendsHasMore && friendsNextCursor && (
            <div style={{ marginTop: "var(--space-3)", display: "flex", justifyContent: "center" }}>
              <Link
                href={`/?tab=friends&cursor=${encodeURIComponent(friendsNextCursor)}`}
                className="btn btn-secondary btn-sm"
              >
                Load more
              </Link>
            </div>
          )}
        </section>
      )}

      {/* PUBLIC TAB CONTENT */}
      {activeTab === "public" && (
        <section>
          {publicQuests.length === 0 ? (
            <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-6)" }}>
              <p>The global arcade is quiet right now. Check back soon for fresh quests.</p>
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
          {publicHasMore && publicNextCursor && (
            <div style={{ marginTop: "var(--space-3)", display: "flex", justifyContent: "center" }}>
              <Link
                href={`/?tab=public&cursor=${encodeURIComponent(publicNextCursor)}`}
                className="btn btn-secondary btn-sm"
              >
                Load more
              </Link>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
