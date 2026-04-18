"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, ImagePlus } from "lucide-react";
import MediaUpload from "@/components/media-upload";

type EditUser = {
  id: string;
  username: string;
  bio: string | null;
  profileImages: string[];
};

export default function ProfileEditForm({ user }: { user: EditUser }) {
  const router = useRouter();
  const [bio, setBio] = useState(user.bio || "");
  const [images, setImages] = useState<string[]>(
    user.profileImages.length ? user.profileImages : ["", "", ""]
  );
  const [saving, setSaving] = useState(false);

  // Ensure there are always 3 slots in the UI state
  const paddedImages = [...images];
  while (paddedImages.length < 3) paddedImages.push("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    
    // filter out empty strings
    const validImages = paddedImages.filter((img) => img && img.trim() !== "");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          bio, 
          profileImages: validImages 
        }),
      });

      if (!res.ok) throw new Error("Failed to save profile");
      
      router.push(`/profile/${user.username}`);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert("Error saving profile");
    } finally {
      setSaving(false);
    }
  }

  const handleImageUploaded = (index: number, url: string) => {
    const newImages = [...paddedImages];
    newImages[index] = url;
    setImages(newImages);
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...paddedImages];
    newImages[index] = "";
    setImages(newImages);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)", paddingBottom: "var(--space-8)" }}>
      {/* Header */}
      <div className="flex items-center gap-1" style={{ gap: "var(--space-3)" }}>
        <button onClick={() => router.back()} className="btn-icon btn">
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: "1.3rem", fontWeight: "var(--weight-bold)" }}>Edit RPG Profile</h1>
      </div>

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        
        {/* Bio */}
        <div className="seamless-item" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <label style={{ fontWeight: "var(--weight-bold)", fontSize: "0.95rem" }}>Your Legend (Bio)</label>
          <textarea
            className="input"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell your story..."
            rows={4}
            maxLength={300}
            style={{ resize: "none" }}
          />
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
            {bio.length}/300
          </div>
        </div>

        {/* Gallery */}
        <div className="seamless-item" style={{ padding: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          <div>
            <label style={{ fontWeight: "var(--weight-bold)", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: 6 }}>
              <ImagePlus size={16} /> Showcase Gallery
            </label>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>
              Add up to 3 images to show off your setup, wins, or style.
            </p>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "var(--space-2)",
            aspectRatio: "3/1"
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ 
                position: "relative", 
                borderRadius: "var(--radius-md)", 
                overflow: "hidden",
                border: paddedImages[i] ? "none" : "1px dashed var(--border)",
                background: paddedImages[i] ? "none" : "var(--bg-base)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {paddedImages[i] ? (
                  <>
                    <img 
                      src={paddedImages[i]} 
                      alt={`Slot ${i+1}`} 
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} 
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        background: "rgba(0,0,0,0.6)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 20,
                        height: 20,
                        fontSize: "0.7rem",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <MediaUpload 
                    onUpload={(media) => handleImageUploaded(i, media.url)}
                    iconOnly
                    accept="image/*"
                    ariaLabel={`Upload image for slot ${i + 1}`}
                    containerStyle={{ position: "absolute", inset: 0 }}
                    buttonStyle={{
                      width: "100%",
                      height: "100%",
                      padding: 0,
                      opacity: 0,
                      borderRadius: "var(--radius-md)",
                    }}
                  />
                )}
                
                {/* Visual placeholder when empty */}
                {!paddedImages[i] && (
                  <div style={{ pointerEvents: "none", color: "var(--text-muted)", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <ImagePlus size={20} />
                    <span style={{ fontSize: "0.65rem" }}>Slot {i+1}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary" 
          disabled={saving} 
          style={{ width: "100%", marginTop: "var(--space-2)" }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>
    </div>
  );
}
