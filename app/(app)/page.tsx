import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, sidequests, friendships, activities, feedClears } from "@/db/schema";
import { eq, and, or, desc, inArray, ne, lt, gte } from "drizzle-orm";
import Link from "next/link";
import { getUserOrCreate } from "@/lib/auth-sync";
import ActivityCard from "@/components/activity-card";
import ClearFeedButton from "@/components/clear-feed-button";

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
  const sharedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const feedClearRows = await db
    .select()
    .from(feedClears)
    .where(eq(feedClears.userId, user.id));

  const feedClearMap = new Map(feedClearRows.map((row) => [row.feedType, row.clearedAt]));
  const friendsClearedAt = feedClearMap.get("friends");
  const publicClearedAt = feedClearMap.get("public");

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
  const friendAndSelfIds = [user.id, ...acceptedFriendIds];

  // -----------------------------------------------------
  // TAB: FRIENDS ACTIVITY
  // -----------------------------------------------------
  let recentActivity: any[] = [];
  let friendsHasMore = false;
  let friendsNextCursor: string | null = null;
  if (activeTab === "friends") {
    // Friends and self. Also join quest details for completions
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
        inArray(activities.userId, friendAndSelfIds),
        or(
          ne(activities.type, "quest_completed"),
          gte(activities.createdAt, sharedCutoff)
        ),
        friendsClearedAt ? gte(activities.createdAt, friendsClearedAt) : undefined,
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
  let publicActivity: any[] = [];
  let publicHasMore = false;
  let publicNextCursor: string | null = null;
  if (activeTab === "public") {
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
        eq(activities.isPublic, true),
        inArray(activities.type, ["quest_completed", "achievement_earned"]),
        gte(activities.createdAt, sharedCutoff),
        publicClearedAt ? gte(activities.createdAt, publicClearedAt) : undefined,
        hasValidCursor ? lt(activities.createdAt, cursor!) : undefined
      ))
      .orderBy(desc(activities.createdAt))
      .limit(pageSizePublic + 1);

    publicHasMore = acts.length > pageSizePublic;
    publicActivity = acts.slice(0, pageSizePublic);
    if (publicHasMore && publicActivity.length > 0) {
      publicNextCursor = publicActivity[publicActivity.length - 1].activity.createdAt.toISOString();
    }
  }

  return (
    <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <section className="card hero-card" style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        background: "linear-gradient(135deg, rgba(45, 212, 191, 0.22), rgba(96, 165, 250, 0.16))",
      }}>
        <div className="hero-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "var(--space-4)" }}>
          <div>
            <div className="label-mono">Questboard</div>
            <h1 style={{ marginTop: "var(--space-2)" }}>Welcome back, {displayName}</h1>
            <p style={{ marginTop: "var(--space-2)", maxWidth: 320 }}>
              Pick your next quest, squad up with friends, and keep the streak alive.
            </p>
          </div>
          <div className="card hero-level" style={{
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: "var(--weight-semibold)" }}>Party Feed</h2>
            <ClearFeedButton tab="friends" />
          </div>
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
                const timeLabel = timeAgo(activity.createdAt);
                
                return (
                  <ActivityCard
                    key={activity.id}
                    activityType={activity.type}
                    timeLabel={timeLabel}
                    actor={actor}
                    quest={quest}
                    variant="friends"
                  />
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-3)" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: "var(--weight-semibold)" }}>Global Arcade</h2>
            <ClearFeedButton tab="public" />
          </div>
          {publicActivity.length === 0 ? (
            <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-6)" }}>
              <p>The global arcade is quiet right now. Check back soon for shared wins.</p>
            </div>
          ) : (
            <div className="seamless-stack">
              {publicActivity.map(({ activity, quest, actor }) => {
                if (!actor) return null;
                const timeLabel = timeAgo(activity.createdAt);
                return (
                  <ActivityCard
                    key={activity.id}
                    activityType={activity.type}
                    timeLabel={timeLabel}
                    actor={actor}
                    quest={quest}
                    variant="public"
                  />
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
