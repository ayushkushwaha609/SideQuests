"use client";
import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  isFriend: boolean;
  username: string;
}

export default function ProfileChatButton({ isFriend, username }: Props) {
  const router = useRouter();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function handleClick() {
    if (isFriend) {
      router.push(`/messages/${username}`);
    } else {
      setToastMessage("Add user as a friend first to start chatting.");
      setTimeout(() => setToastMessage(null), 3000);
    }
  }

  return (
    <div style={{ width: "100%", position: "relative" }}>
      <button 
        onClick={handleClick}
        className="btn btn-secondary" 
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: "var(--space-2)" }}
      >
        <MessageCircle size={18} /> Message
      </button>

      {toastMessage && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          marginTop: "var(--space-2)",
          background: "var(--bg-elevated)",
          color: "var(--streak-amber-light)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          padding: "8px 12px",
          borderRadius: "var(--radius-md)",
          fontSize: "0.8rem",
          whiteSpace: "nowrap",
          zIndex: 10,
          animation: "fade-in 0.2s ease-out"
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
