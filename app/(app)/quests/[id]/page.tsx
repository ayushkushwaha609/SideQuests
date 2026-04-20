import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { users, sidequests, questMembers, questCompletions } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";
import { ArrowLeft, Zap, Users, CheckCircle2 } from "lucide-react";
import QuestCompleteButton from "./complete-button";
import DeleteQuestButton from "./delete-button";
import CommentsSection from "@/components/comments-section";
import QuestRepository from "@/components/quest-repository";
import LeaveQuestButton from "@/components/leave-quest-button";

export default async function QuestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  const currentUser = await db.query.users.findFirst({ where: eq(users.clerkId, userId!) });

  const quest = await db.query.sidequests.findFirst({ where: eq(sidequests.id, id) });
  if (!quest) notFound();

  const members = await db
    .select()
    .from(questMembers)
    .where(and(eq(questMembers.questId, id), eq(questMembers.inviteStatus, "accepted")));

  const completions = await db
    .select()
    .from(questCompletions)
    .where(eq(questCompletions.questId, id))
    .orderBy(desc(questCompletions.completedAt));

  const now = new Date();
  function getStartOfPeriod(recur: string): Date | null {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    if (recur === "daily") return d;
    if (recur === "weekly") {
      d.setDate(d.getDate() - d.getDay());
      return d;
    }
    if (recur === "monthly") {
      d.setDate(1);
      return d;
    }
    if (recur === "yearly") {
      d.setMonth(0, 1);
      return d;
    }
    return null;
  }

  const startOfPeriod = getStartOfPeriod(quest.recurrence);
  const completionsForPeriod = startOfPeriod
    ? completions.filter((c) => c.completedAt >= startOfPeriod)
    : completions;

  const myCompletion = currentUser
    ? completionsForPeriod.find((c) => c.userId === currentUser.id)
    : null;

  const creator = await db.query.users.findFirst({ where: eq(users.id, quest.createdBy) });

  const isOwner = currentUser?.id === quest.createdBy;
  const isMember = !!currentUser && (isOwner || members.some((m) => m.userId === currentUser.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Back */}
      <Link href="/quests" className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start", gap: "var(--space-2)" }}>
        <ArrowLeft size={16} /> Back
      </Link>

      {/* Quest hero */}
      <div className="quest-tile" style={{ padding: "var(--space-6)", textAlign: "center" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "var(--space-3)" }}>{quest.coverEmoji}</div>
        <h1 style={{ fontSize: "1.4rem", marginBottom: "var(--space-2)" }}>{quest.title}</h1>
        {quest.description && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
            {quest.description}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)", marginTop: "var(--space-4)", flexWrap: "wrap" }}>
          <span className={`badge badge-${quest.recurrence}`}>{quest.recurrence}</span>
          <span className="flex items-center gap-1" style={{ gap: 4, color: "var(--xp-purple-light)", fontSize: "0.875rem" }}>
            <Zap size={14} fill="var(--xp-purple-light)" color="var(--xp-purple-light)" />
            {quest.xpReward} XP
          </span>
          <span style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>by {creator?.displayName ?? creator?.username ?? "Unknown"}</span>
        </div>
      </div>

      {/* Complete button */}
      {currentUser && (
        <QuestCompleteButton
          questId={quest.id}
          isCompleted={!!myCompletion}
          xpReward={quest.xpReward}
        />
      )}

      {/* Stats row */}
      <div className="grid-2">
        <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-4)" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "var(--weight-bold)", color: "var(--success-light)" }}>
            {completions.length}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>Completions</div>
        </div>
        <div className="seamless-item" style={{ textAlign: "center", padding: "var(--space-4)" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "var(--weight-bold)", color: "var(--quest-blue-light)" }}>
            {members.length + 1}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 4 }}>Members</div>
        </div>
      </div>

      {/* Completions list */}
      {completions.length > 0 && (
        <section>
          <h3 style={{ marginBottom: "var(--space-3)" }}>Recent Completions</h3>
          <div className="seamless-stack">
            {completions.slice(0, 5).map((c) => (
              <div key={c.id} className="seamless-item seamless-item-compact" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <CheckCircle2 size={18} color="var(--success)" />
                  <div style={{ flex: 1, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    {new Date(c.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
                {(c.note || c.imageUrl) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", paddingLeft: 26 }}>
                    {c.note && <div style={{ fontSize: "0.85rem", color: "var(--text-primary)" }}>{c.note}</div>}
                    {c.imageUrl && (
                      <img 
                        src={c.imageUrl} 
                        alt="Proof" 
                        style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }} 
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Comments */}
      <section>
        <h3 style={{ marginBottom: "var(--space-3)" }}>Comments</h3>
        <CommentsSection questId={quest.id} />
      </section>

      {/* Activity */}
      <section>
        <h3 style={{ marginBottom: "var(--space-3)" }}>Activity</h3>
        <QuestRepository questId={quest.id} />
      </section>

      {/* Owner/member actions */}
      {isOwner ? (
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <Link href={`/quests/${quest.id}/invite`} className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
            <Users size={16} /> Invite Friends
          </Link>
          <DeleteQuestButton questId={quest.id} />
        </div>
      ) : isMember ? (
        <LeaveQuestButton questId={quest.id} />
      ) : null}
    </div>
  );
}
