import { db } from "@/db";
import { users, sidequests, friendships, achievements } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getUserOrCreate } from "@/lib/auth-sync";
import Link from "next/link";
import { ArrowLeft, UserPlus, ShieldCheck, Star, Image as ImageIcon } from "lucide-react";
import QuestCard from "@/components/quest-card";
import ProfileChatButton from "@/components/profile-chat-button";

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const currentUser = await getUserOrCreate();
  if (!currentUser) return null;

  // Fetch the target user
  const profileUser = await db.query.users.findFirst({
    where: eq(users.username, username.toLowerCase()),
  });

  if (!profileUser) return notFound();

  const isSelf = profileUser.id === currentUser.id;
  const safeProfileImages = (profileUser.profileImages as string[]) || [];
  const displayName = profileUser.displayName ?? profileUser.username;

  // Check friendship
  let isFriend = false;
  if (!isSelf) {
    const friendRecord = await db.query.friendships.findFirst({
      where: and(
        eq(friendships.userId, currentUser.id),
        eq(friendships.friendId, profileUser.id),
        eq(friendships.status, "accepted")
      )
    });
    isFriend = !!friendRecord;
  }

  // Fetch public quests
  // If friend, fetch `friends` visibility + `public`
  // If not friend, fetch only `public` visibility
  const visibilityCondition = isSelf ? undefined : isFriend ? eq(sidequests.visibility, "friends") : eq(sidequests.visibility, "public"); // simplistic approach
  // Actually simpler:
  const publicQuests = await db.query.sidequests.findMany({
    where: (sq, { eq, and, or }) => and(
      eq(sq.createdBy, profileUser.id),
      isSelf ? undefined : or(
        eq(sq.visibility, "public"),
        isFriend ? eq(sq.visibility, "friends") : undefined
      )
    ),
    orderBy: (sq, { desc }) => [desc(sq.createdAt)],
  });

  // Fetch achievements
  const userAchievements = await db.query.achievements.findMany({
    where: eq(achievements.userId, profileUser.id),
    orderBy: (a, { desc }) => [desc(a.earnedAt)],
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Header Navigation */}
      <div className="flex items-center justify-between" style={{ paddingBottom: "var(--space-3)", borderBottom: "1px solid var(--border)" }}>
        <Link href="/" style={{ color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center" }}>
          <ArrowLeft size={20} />
        </Link>
        <span style={{ fontWeight: "var(--weight-bold)", fontSize: "1.1rem" }}>Profile</span>
        {isSelf ? (
          <Link href="/profile/edit" style={{ fontSize: "0.8rem" }} className="btn btn-secondary btn-sm">
            Edit RPG Profile
          </Link>
        ) : <div style={{ width: 20 }} />}
      </div>

      {/* Profile Info */}
        <div className="seamless-item" style={{ padding: "var(--space-6)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: "var(--bg-elevated)", border: "2px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: "var(--space-3)" }}>
          {profileUser.avatarUrl ? <img src={profileUser.avatarUrl} alt={profileUser.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "2rem" }}>👤</span>}
        </div>
        <h1 style={{ fontSize: "1.5rem", color: "var(--text-primary)" }}>{displayName}</h1>
        {profileUser.bio && <p style={{ color: "var(--text-secondary)", marginTop: "var(--space-2)", fontSize: "0.9rem" }}>{profileUser.bio}</p>}

        <div style={{ display: "flex", gap: "var(--space-4)", marginTop: "var(--space-4)", padding: "var(--space-3)", background: "var(--bg-base)", borderRadius: "var(--radius-md)", width: "100%", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Level</div>
            <div style={{ fontWeight: "var(--weight-bold)", fontSize: "1.2rem", color: "var(--text-primary)" }}>{profileUser.level}</div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>Streak</div>
            <div style={{ fontWeight: "var(--weight-bold)", fontSize: "1.2rem", color: "var(--streak-amber)" }}>{profileUser.streakCount}</div>
          </div>
          <div style={{ width: 1, background: "var(--border)" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>XP</div>
            <div style={{ fontWeight: "var(--weight-bold)", fontSize: "1.2rem", color: "var(--xp-purple-light)" }}>{profileUser.xp}</div>
          </div>
        </div>

        {!isSelf && !isFriend && (
           <Link href="/friends" className="btn btn-primary" style={{ marginTop: "var(--space-4)", width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
             <UserPlus size={18} /> Send Friend Request
           </Link>
        )}
        {!isSelf && isFriend && (
          <div style={{ marginTop: "var(--space-4)", padding: "8px 0", width: "100%", textAlign: "center", color: "var(--success-light)", fontWeight: "var(--weight-medium)", background: "rgba(16, 185, 129, 0.1)", borderRadius: "var(--radius-sm)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <ShieldCheck size={16} /> Friends
          </div>
        )}

        {/* Global DMs - Chat Button */}
        {!isSelf && (
          <ProfileChatButton isFriend={isFriend} username={profileUser.username} />
        )}
      </div>

      {/* Bio / Legend */}
      {(profileUser.bio || safeProfileImages.length > 0) && (
          <section className="seamless-item" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          
          {profileUser.bio && (
            <div>
              <h2 style={{ fontSize: "0.9rem", fontWeight: "var(--weight-bold)", color: "var(--text-muted)", marginBottom: "var(--space-2)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Legend
              </h2>
              <p style={{ fontSize: "0.95rem", lineHeight: 1.5, color: "var(--text-primary)", whiteSpace: "pre-wrap" }}>
                {profileUser.bio}
              </p>
            </div>
          )}

          {safeProfileImages.length > 0 && (
            <div>
              {profileUser.bio && <hr style={{ border: "none", borderTop: "1px dashed var(--border)", margin: "var(--space-3) 0" }} />}
              <h2 style={{ fontSize: "0.9rem", fontWeight: "var(--weight-bold)", color: "var(--text-muted)", marginBottom: "var(--space-3)", textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 6 }}>
                <ImageIcon size={14} /> Showcase
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(safeProfileImages.length, 3)}, 1fr)`,
                gap: "var(--space-2)",
                aspectRatio: safeProfileImages.length > 1 ? "auto" : "16/9",
                height: safeProfileImages.length > 1 ? "120px" : "auto",
              }}>
                {safeProfileImages.map((img, i) => (
                  <div key={i} style={{ 
                    borderRadius: "var(--radius-md)", 
                    overflow: "hidden",
                    border: "1px solid var(--border)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}>
                    <img 
                      src={img} 
                      alt={`Gallery attachment ${i}`} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </section>
      )}

      {/* Achievements Section */}
      {userAchievements.length > 0 && (
         <section>
           <h2 style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "var(--space-3)", display: "flex", alignItems: "center", gap: 6 }}>
             <Star size={16} /> Badges
           </h2>
           <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
             {userAchievements.map(a => (
                <div key={a.id} className="badge" style={{ background: "rgba(245, 158, 11, 0.15)", color: "var(--streak-amber-light)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "var(--space-2) var(--space-3)" }}>
                  {a.type.replace(/_/g, " ").toUpperCase()}
                </div>
             ))}
           </div>
         </section>
      )}

      {/* Shared Quests Section */}
      <section>
        <h2 style={{ fontSize: "1rem", color: "var(--text-secondary)", marginBottom: "var(--space-3)" }}>
          {isSelf ? "My Quests" : "Shared Quests"}
        </h2>
        
        {publicQuests.length === 0 ? (
          <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text-muted)" }}>
            Nothing to see here.
          </div>
        ) : (
          <div className="seamless-stack">
            {publicQuests.map((q) => (
              <QuestCard
                key={q.id}
                quest={q as any} // Typing cast
                isOwner={isSelf}
                members={[]} // Simplification, fetching members would require more DB queries or relation joins
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
