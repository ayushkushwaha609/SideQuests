"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function ShowcaseGrid({ images }: { images: string[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeUrl = activeIndex === null ? null : images[activeIndex];

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveIndex(null);
    }
    if (activeUrl) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
    return undefined;
  }, [activeUrl]);

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.min(images.length, 3)}, 1fr)`,
          gap: "var(--space-2)",
          aspectRatio: images.length > 1 ? "auto" : "16/9",
          height: images.length > 1 ? "120px" : "auto",
        }}
      >
        {images.map((img, i) => (
          <button
            key={img}
            type="button"
            onClick={() => setActiveIndex(i)}
            aria-label={`Open showcase image ${i + 1}`}
            style={{
              padding: 0,
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              cursor: "pointer",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            }}
          >
            <img
              src={img}
              alt={`Gallery attachment ${i + 1}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </button>
        ))}
      </div>

      {activeUrl && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setActiveIndex(null);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(8, 13, 24, 0.88)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "var(--space-4)",
          }}
        >
          <button
            type="button"
            onClick={() => setActiveIndex(null)}
            aria-label="Close image preview"
            style={{
              position: "absolute",
              top: "var(--space-4)",
              right: "var(--space-4)",
              width: 36,
              height: 36,
              borderRadius: "var(--radius-circle)",
              border: "1px solid var(--border)",
              background: "var(--bg-elevated)",
              color: "var(--text-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
          <img
            src={activeUrl}
            alt="Showcase preview"
            style={{
              maxWidth: "100%",
              maxHeight: "85vh",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.45)",
            }}
          />
        </div>
      )}
    </>
  );
}
