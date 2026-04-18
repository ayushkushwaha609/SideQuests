import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-base)",
      padding: "var(--space-4)",
      gap: "var(--space-6)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)" }}>⚔️</div>
        <h1 style={{ fontSize: "1.75rem", marginBottom: "var(--space-2)" }}>Welcome back</h1>
        <p style={{ color: "var(--text-secondary)" }}>Sign in to continue your sidequests.</p>
      </div>
      <SignIn />
    </div>
  );
}
