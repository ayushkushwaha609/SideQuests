"use client";
import { useEffect, useState } from "react";
import { Download } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const isIosStandalone = (window.navigator as any).standalone;
    setIsInstalled(Boolean(isStandalone || isIosStandalone));

    function handleBeforeInstall(event: Event) {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    }

    function handleInstalled() {
      setIsInstalled(true);
      setPromptEvent(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      setPromptEvent(null);
      setIsInstalled(true);
    }
  }

  if (!promptEvent || isInstalled) return null;

  return (
    <div className="pwa-prompt">
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <div className="btn-icon" aria-hidden="true">
          <Download size={16} />
        </div>
        <div>
          <div style={{ fontWeight: "var(--weight-semibold)", fontSize: "0.9rem" }}>Install SideQuest</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Add the questboard to your home screen.
          </div>
        </div>
      </div>
      <button className="btn btn-primary btn-sm" onClick={handleInstall}>
        Install
      </button>
    </div>
  );
}
