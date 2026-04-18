"use client";
import { useState, useRef, type CSSProperties } from "react";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface UploadedMedia {
  url: string;
  publicId: string;
}

export default function MediaUpload({
  questId,
  iconOnly = false,
  onUpload,
  onClear,
  accept = "image/*,video/*",
  ariaLabel = "Upload media",
  containerStyle,
  buttonStyle,
}: {
  questId?: string;
  iconOnly?: boolean;
  onUpload: (media: UploadedMedia) => void;
  onClear?: () => void;
  accept?: string;
  ariaLabel?: string;
  containerStyle?: CSSProperties;
  buttonStyle?: CSSProperties;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    if (questId) formData.append("questId", questId);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onUpload({ url: data.url, publicId: data.publicId });
      } else {
        alert("Upload failed. Try again.");
        setPreview(null);
      }
    } catch (err) {
      alert("Upload error.");
      setPreview(null);
    }

    setUploading(false);
  }

  function clearPreview() {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    if (onClear) onClear();
  }

  return (
    <div style={containerStyle}>
      <input
        type="file"
        ref={inputRef}
        accept={accept}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {preview ? (
        <div style={{ position: "relative", marginTop: "var(--space-2)" }}>
          <img
            src={preview}
            alt="Preview"
            style={{
              width: "100%",
              maxHeight: 200,
              objectFit: "cover",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border)",
            }}
          />
          {uploading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.5)",
                borderRadius: "var(--radius-md)",
              }}
            >
              <Loader2 size={24} className="animate-spin" color="#fff" />
            </div>
          )}
          {!uploading && (
            <button
              onClick={clearPreview}
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                background: "rgba(0,0,0,0.6)",
                border: "none",
                borderRadius: "50%",
                width: 24,
                height: 24,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              <X size={14} color="#fff" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={iconOnly ? "btn btn-ghost" : "btn btn-ghost btn-sm"}
          aria-label={ariaLabel}
          style={{
            ...(iconOnly
              ? { padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", background: "var(--bg-base)" }
              : { display: "flex", gap: "var(--space-2)", alignItems: "center", fontSize: "0.8rem", color: "var(--text-muted)" }),
            ...buttonStyle,
          }}
        >
          <ImagePlus size={iconOnly ? 18 : 16} /> {iconOnly ? null : "Attach Photo/Video"}
        </button>
      )}
    </div>
  );
}
