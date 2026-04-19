"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const EMOJIS = ["⚔️", "🏃", "📚", "🎯", "💪", "🎸", "🌍", "🧘", "🚀", "🍳", "🎨", "💻"];

const RECURRENCES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "lifetime", label: "Lifetime" },
  { value: "one-time", label: "One-time" },
];

const VISIBILITIES = [
  { value: "friends", label: "Friends" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

export default function NewQuestPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    description: "",
    recurrence: "one-time",
    visibility: "friends",
    coverEmoji: "⚔️",
    dueDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError("Quest title is required."); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/quests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const { quest } = await res.json();
      router.push(`/quests/${quest.id}`);
    } else {
      const { error: err } = await res.json();
      setError(err ?? "Failed to create quest.");
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      {/* Header */}
      <div className="flex items-center gap-1" style={{ gap: "var(--space-3)" }}>
        <button onClick={() => router.back()} className="btn-icon btn">
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: "1.3rem" }}>New Quest</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {/* Emoji picker */}
        <div className="form-group">
          <label className="form-label">Icon</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setForm({ ...form, coverEmoji: emoji })}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "var(--radius-md)",
                  border: form.coverEmoji === emoji ? "2px solid var(--xp-purple)" : "1px solid var(--border)",
                  background: form.coverEmoji === emoji ? "var(--xp-purple-glow)" : "var(--bg-elevated)",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="form-group">
          <label htmlFor="title" className="form-label">Title *</label>
          <input
            id="title"
            className="input"
            placeholder="e.g. Run 5km every day"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={80}
          />
        </div>

        {/* Description */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">Description</label>
          <textarea
            id="description"
            className="input"
            placeholder="What is this quest about?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>

        {/* Recurrence */}
        <div className="form-group">
          <label className="form-label">Recurrence</label>
          <div className="tab-bar">
            {RECURRENCES.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`tab-item${form.recurrence === r.value ? " active" : ""}`}
                onClick={() => setForm({ ...form, recurrence: r.value })}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div className="form-group">
          <label htmlFor="due" className="form-label">Due Date (optional)</label>
          <input
            id="due"
            type="date"
            className="input"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            style={{ colorScheme: "dark" }}
          />
        </div>

        {/* Visibility */}
        <div className="form-group">
          <label className="form-label">Visibility</label>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            {VISIBILITIES.map((v) => (
              <button
                key={v.value}
                type="button"
                className={`btn btn-sm ${form.visibility === v.value ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setForm({ ...form, visibility: v.value })}
              >
                {v.value === "friends" && "👥 "}
                {v.value === "public" && "🌍 "}
                {v.value === "private" && "🔒 "}
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ color: "var(--error-light)", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "var(--radius-md)", padding: "var(--space-3) var(--space-4)", fontSize: "0.875rem" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary btn-lg"
          disabled={submitting}
          style={{ width: "100%", opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? "Creating..." : "⚔️ Create Quest"}
        </button>
      </form>
    </div>
  );
}
