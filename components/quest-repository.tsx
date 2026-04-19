"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { pusherClient } from "@/lib/pusher-client";

interface RepoUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
  level?: number | null;
}

interface RepoArtifact {
  id: string;
  questId: string;
  userId: string;
  type: string;
  summary: string | null;
  metadata: any;
  createdAt: string;
  user: RepoUser | null;
}

interface RepoContribution {
  user: RepoUser | null;
  total: number;
  byType: Record<string, number>;
}

export default function QuestRepository({ questId }: { questId: string }) {
  const [activeTab, setActiveTab] = useState<"timeline" | "contributions">("timeline");
  const [artifacts, setArtifacts] = useState<RepoArtifact[]>([]);
  const [contributions, setContributions] = useState<RepoContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    fetchRepository();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questId]);

  useEffect(() => {
    if (!pusherClient) return;
    const channel = pusherClient.subscribe(`private-quest-activity-${questId}`);

    channel.bind("new-artifact", (artifact: RepoArtifact) => {
      setArtifacts((prev) => {
        if (prev.find((item) => item.id === artifact.id)) return prev;
        if (!artifact.user) {
          fetchRepository(null, true);
          return prev;
        }
        return [artifact, ...prev];
      });
    });

    return () => {
      pusherClient.unsubscribe(`private-quest-activity-${questId}`);
    };
  }, [questId]);

  async function fetchRepository(cursor?: string | null, silent = false) {
    const isInitial = !cursor;
    if (isInitial && !silent) {
      setLoading(true);
    } else if (!isInitial) {
      setLoadingMore(true);
    }

    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    const res = await fetch(`/api/quests/${questId}/repository?${params.toString()}`);
    const data = await res.json();

    setArtifacts((prev) => (isInitial ? data.artifacts ?? [] : [...prev, ...(data.artifacts ?? [])]));
    if (isInitial) {
      setContributions(data.contributions ?? []);
    }

    setHasMore(Boolean(data.hasMore));
    setNextCursor(data.nextCursor ?? null);
    if (!silent) {
      setLoading(false);
    }
    setLoadingMore(false);
  }

  function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function typeLabel(type: string) {
    switch (type) {
      case "comment":
        return "Comment";
      case "completion":
        return "Completion";
      case "proof":
        return "Proof";
      case "upload":
        return "Upload";
      case "chat":
        return "Chat";
      default:
        return type;
    }
  }

  function getMediaUrl(artifact: RepoArtifact) {
    const metadata = artifact.metadata || {};
    return metadata.mediaUrl || metadata.imageUrl || metadata.url || null;
  }

  function isVideoUrl(url: string) {
    return /\.(mp4|webm|mov|ogg)(\?|#|$)/i.test(url);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <div className="tab-bar" style={{ marginBottom: "var(--space-2)" }}>
        <button
          className={`tab-item${activeTab === "timeline" ? " active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          Activity
        </button>
        <button
          className={`tab-item${activeTab === "contributions" ? " active" : ""}`}
          onClick={() => setActiveTab("contributions")}
        >
          Contributions
        </button>
      </div>

      {loading ? (
        <div style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Loading repository...
        </div>
      ) : activeTab === "timeline" ? (
        artifacts.length === 0 ? (
          <div style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
            No artifacts yet.
          </div>
        ) : (
          <div className="seamless-stack">
            {artifacts.map((artifact) => (
              <div key={artifact.id} className="seamless-item seamless-item-compact">
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  {artifact.user?.username ? (
                    <Link href={`/profile/${artifact.user.username}`} style={{ fontWeight: "var(--weight-medium)" }}>
                      {artifact.user.displayName ?? artifact.user.username}
                    </Link>
                  ) : (
                    <span style={{ fontWeight: "var(--weight-medium)" }}>Unknown</span>
                  )}
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{formatTime(artifact.createdAt)}</span>
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{typeLabel(artifact.type)}</div>
                <div style={{ marginTop: 6 }}>{artifact.summary ?? ""}</div>
                {getMediaUrl(artifact) && (
                  <div style={{ marginTop: "var(--space-2)" }}>
                    {isVideoUrl(getMediaUrl(artifact) as string) ? (
                      <video
                        controls
                        src={getMediaUrl(artifact) as string}
                        style={{ width: "100%", maxHeight: 240, borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
                      />
                    ) : (
                      <img
                        src={getMediaUrl(artifact) as string}
                        alt=""
                        style={{ width: "100%", maxHeight: 240, objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}
                      />
                    )}
                    <a
                      href={getMediaUrl(artifact) as string}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: "var(--space-2)" }}
                    >
                      Open preview
                    </a>
                  </div>
                )}
              </div>
            ))}
            {hasMore && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => fetchRepository(nextCursor)}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            )}
          </div>
        )
      ) : contributions.length === 0 ? (
        <div style={{ padding: "var(--space-3)", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
          No contributions yet.
        </div>
      ) : (
        <div className="seamless-stack">
          {contributions.map((row, index) => (
            <div key={row.user?.id ?? index} className="seamless-item seamless-item-compact">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontWeight: "var(--weight-medium)" }}>
                  {row.user?.displayName ?? row.user?.username ?? "Unknown"}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{row.total} total</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginTop: 6 }}>
                {Object.entries(row.byType).map(([type, count]) => (
                  <span key={type} className="badge" style={{ fontSize: "0.7rem" }}>
                    {typeLabel(type)} {count}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
