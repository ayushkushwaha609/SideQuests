"use client";
import { useState } from "react";
import { CheckCircle2, Circle, Zap, Image as ImageIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import MediaUpload from "@/components/media-upload";

interface Props {
  questId: string;
  isCompleted: boolean;
  xpReward: number;
}

export default function QuestCompleteButton({ questId, isCompleted, xpReward }: Props) {
  const [completed, setCompleted] = useState(isCompleted);
  const [loading, setLoading] = useState(false);
  const [showXp, setShowXp] = useState(false);
  const [note, setNote] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showProofForm, setShowProofForm] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);
  const [sendingProof, setSendingProof] = useState(false);
  const [proofSent, setProofSent] = useState(false);
  const router = useRouter();

  async function handleComplete(share: boolean) {
    if (completed || loading) return;
    setLoading(true);
    const res = await fetch(`/api/quests/${questId}/complete`, { 
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: note.trim() || undefined,
        imageUrl: imageUrl || undefined,
        share,
      })
    });
    if (res.ok) {
      setCompleted(true);
      setShowXp(true);
      setShowSharePrompt(false);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#10b981', '#f59e0b']
      });
      setTimeout(() => { setShowXp(false); router.refresh(); }, 2000);
    }
    setLoading(false);
  }

  function handleSharePrompt() {
    if (completed || loading) return;
    setShowSharePrompt(true);
  }

  async function handleSendProof() {
    if (sendingProof) return;
    const trimmed = note.trim();
    if (!trimmed && !imageUrl) return;

    setSendingProof(true);
    setProofSent(false);

    try {
      const res = await fetch(`/api/quests/${questId}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: trimmed || undefined,
          mediaUrl: imageUrl || undefined,
        }),
      });

      if (res.ok) {
        setNote("");
        setImageUrl(null);
        setProofSent(true);
        setTimeout(() => setProofSent(false), 2000);
        router.refresh();
      } else {
        alert("Failed to send proof.");
      }
    } catch (e) {
      alert("Failed to send proof.");
    }

    setSendingProof(false);
  }

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      {/* Proof Form */}
      {!completed && (
        <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "var(--space-3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showProofForm ? "var(--space-3)" : 0 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: "var(--weight-semibold)" }}>Add Proof (Optional)</span>
            <button 
              onClick={() => setShowProofForm(!showProofForm)} 
              className="btn btn-ghost btn-sm"
              style={{ fontSize: "0.8rem", padding: "4px 8px" }}
            >
              {showProofForm ? "Hide" : "Add Note / Photo"}
            </button>
          </div>
          
          {showProofForm && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <textarea 
                className="input" 
                placeholder="How did it go? (Optional)" 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ minHeight: "60px", resize: "none", fontSize: "0.85rem" }}
              />
              <MediaUpload questId={questId} onUpload={({ url }) => setImageUrl(url)} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleSendProof}
                  disabled={sendingProof || (!note.trim() && !imageUrl)}
                >
                  {sendingProof ? "Sending..." : "Send Proof"}
                </button>
                {proofSent && (
                  <span style={{ fontSize: "0.8rem", color: "var(--success)" }}>Sent</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSharePrompt}
        disabled={completed || loading}
        className={`btn btn-lg ${completed ? "btn-secondary" : "btn-primary"}`}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-2)",
          opacity: loading ? 0.7 : 1,
          animation: !completed && !loading ? "pulse-glow 2s infinite" : "none",
        }}
      >
        {completed ? (
          <><CheckCircle2 size={20} /> Completed!</>
        ) : loading ? (
          "Completing..."
        ) : (
          <><Circle size={20} /> Mark Complete</>
        )}
      </button>

      {!completed && showSharePrompt && (
        <div style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-3)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}>
          <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Share this achievement?
          </div>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleComplete(true)}
              disabled={loading}
            >
              Share & Complete
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleComplete(false)}
              disabled={loading}
            >
              Complete Privately
            </button>
          </div>
        </div>
      )}

      {/* XP gain animation */}
      {showXp && (
        <div style={{
          position: "absolute",
          top: -40,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 4,
          color: "var(--xp-purple-light)",
          fontWeight: "var(--weight-bold)",
          fontSize: "1.1rem",
          animation: "xp-rise 1.8s ease forwards",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          <Zap size={16} fill="var(--xp-purple-light)" color="var(--xp-purple-light)" />
          +{xpReward} XP!
        </div>
      )}
    </div>
  );
}
