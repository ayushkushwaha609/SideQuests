"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { UserPlus, Check, Clock, X, Search } from "lucide-react";

interface FriendUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
  friendshipId?: string;
  status?: "pending" | "accepted";
  role?: "sender" | "receiver";
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [pending, setPending] = useState<FriendUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => { fetchFriends(); }, []);

  async function fetchFriends() {
    setLoading(true);
    const res = await fetch("/api/friends");
    const data = await res.json();
    setFriends(data.friends ?? []);
    setPending(data.pending ?? []);
    setLoading(false);
  }

  async function searchUsers(q: string) {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        setSearchResults([]);
        return;
      }
      const text = await res.text();
      if (!text) {
        setSearchResults([]);
        return;
      }
      const data = JSON.parse(text);
      setSearchResults(data.users ?? []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function sendRequest(userId: string) {
    await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendId: userId }),
    });
    setSearchResults((r) =>
      r.map((u) => (u.id === userId ? { ...u, status: "pending", role: "sender" } : u))
    );
    fetchFriends();
  }

  async function respond(friendshipId: string, accept: boolean) {
    await fetch(`/api/friends/${friendshipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    fetchFriends();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <h1>Friends</h1>

      {/* Search */}
      <div className="form-group">
        <div style={{ position: "relative" }}>
          <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
          <input
            className="input"
            placeholder="Search by username first, then name..."
            value={searchQuery}
            style={{ paddingLeft: 40 }}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              searchUsers(e.target.value);
            }}
          />
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="seamless-stack" style={{ marginTop: "var(--space-2)" }}>
            {searchResults.map((u) => (
              
              <div key={u.id} className="seamless-item seamless-item-compact" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem" }}>
                  {u.avatarUrl ? <img src={u.avatarUrl} alt={u.username} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : "👤"}
                </div>
                <div style={{ flex: 1 }}>
                  <Link href={`/profile/${u.username}`} style={{ textDecoration: "none" }}>
                    <div style={{ fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>{u.displayName ?? u.username}</div>
                  </Link>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Lv {u.level} · {u.xp} XP</div>
                </div>
                {u.status === "accepted" ? (
                  <div className="badge badge-completed" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Check size={12} /> Friends
                  </div>
                ) : u.status === "pending" ? (
                  <div className="badge badge-one-time" style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <Clock size={12} /> Pending
                  </div>
                ) : (
                  <button className="btn btn-primary btn-sm" onClick={() => sendRequest(u.id)}>
                    <UserPlus size={14} /> Add
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending requests */}
      {pending.length > 0 && (
        <section>
          <h3 style={{ marginBottom: "var(--space-3)" }}>Pending Requests ({pending.length})</h3>
          <div className="seamless-stack">
            {pending.filter(p => p.role === "receiver").map((p) => (
              <div key={p.id} className="seamless-item seamless-item-compact" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--bg-elevated)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.avatarUrl ? <img src={p.avatarUrl} alt={p.username} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : "👤"}
                </div>
                <div style={{ flex: 1 }}>
                  <Link href={`/profile/${p.username}`} style={{ textDecoration: "none" }}>
                    <div style={{ fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>{p.displayName ?? p.username}</div>
                  </Link>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>wants to be friends</div>
                </div>
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  <button className="btn btn-primary btn-sm" onClick={() => respond(p.friendshipId!, true)}>
                    <Check size={14} />
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => respond(p.friendshipId!, false)}>
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Friends list */}
      <section>
        <h3 style={{ marginBottom: "var(--space-3)" }}>
          My Friends {friends.length > 0 && `(${friends.length})`}
        </h3>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: "var(--radius-lg)" }} />)}
          </div>
        ) : friends.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No friends yet</h3>
            <p>Search by username first, then display name to find new friends.</p>
          </div>
        ) : (
          <div className="seamless-stack">
            {friends.map((f, i) => (
              <Link href={`/profile/${f.username}`} key={f.id} style={{ textDecoration: "none" }}>
                <div className="seamless-item seamless-item-compact animate-slide-up stagger-item" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--xp-purple-glow)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--xp-purple)", overflow: "hidden" }}>
                    {f.avatarUrl ? <img src={f.avatarUrl} alt={f.username} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: "1.2rem" }}>👤</span>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "var(--weight-medium)", color: "var(--text-primary)" }}>{f.displayName ?? f.username}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Level {f.level} · {f.xp} XP</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
