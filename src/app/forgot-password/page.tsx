"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Screen = "form" | "confirm";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>("form");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (resetError) throw resetError;
      setScreen("confirm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 overflow-y-auto" style={{ background: "#141414" }}>
      <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          {/* Logo */}
          <div className="flex flex-col items-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ background: "#2D1F6E" }}
            >
              <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                <path
                  d="M17 6 C17 6 8 10 8 18 C8 22 11 25 14 26 L14 28 L17 26 L20 28 L20 26 C23 25 26 22 26 18 C26 10 17 6 17 6Z"
                  fill="white"
                  opacity="0.9"
                />
                <path d="M17 6 L22 10 L26 8 L23 14 C22 12 20 10 17 6Z" fill="white" />
                <circle cx="14.5" cy="16" r="1.5" fill="#2D1F6E" />
              </svg>
            </div>

            <h1
              className="mt-4 tracking-[0.15em] uppercase"
              style={{ fontFamily: "var(--font-serif)", fontSize: "28px", color: "#E8E8E8", fontWeight: 600 }}
            >
              AGAPE
            </h1>
          </div>

          {/* Séparateur */}
          <div className="my-8 h-px w-full" style={{ background: "#2a2a2a" }} />

          {screen === "form" ? (
            <>
              <h2
                className="mb-2"
                style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "#E8E8E8", fontWeight: 600 }}
              >
                Mot de passe oublié
              </h2>
              <p
                className="mb-6"
                style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#666666", lineHeight: "1.6" }}
              >
                Entre ton adresse email pour recevoir un lien de réinitialisation.
              </p>

              <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4" noValidate>
                <input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  required
                  style={{
                    background: "#1c1c1c",
                    border: "0.5px solid #2a2a2a",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    color: "#E8E8E8",
                    fontFamily: "var(--font-sans)",
                    fontSize: "14px",
                    outline: "none",
                    width: "100%",
                    transition: "border-color 0.2s",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#7B6FD4")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2a2a")}
                />

                {error && (
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#E24B4A" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  style={{
                    background: loading || !email.trim() ? "#3a3460" : "#7B6FD4",
                    color: "white",
                    fontFamily: "var(--font-sans)",
                    fontSize: "15px",
                    fontWeight: 500,
                    borderRadius: "14px",
                    padding: "14px",
                    width: "100%",
                    border: "none",
                    cursor: loading || !email.trim() ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    transition: "background 0.2s, opacity 0.2s",
                  }}
                >
                  {loading ? "Envoi…" : "Envoyer le lien de réinitialisation"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#555555",
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  ← Retour à la connexion
                </button>
              </form>
            </>
          ) : (
            <div className="flex flex-col items-center text-center">
              {/* Cercle check */}
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ background: "rgba(123, 111, 212, 0.15)", border: "1.5px solid #7B6FD4" }}
              >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                  <path
                    d="M6 14 L11 19 L22 9"
                    stroke="#7B6FD4"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h2
                className="mt-6"
                style={{ fontFamily: "var(--font-serif)", fontSize: "22px", color: "#E8E8E8", fontWeight: 600 }}
              >
                Email envoyé
              </h2>

              <p
                className="mt-3"
                style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "#666666", lineHeight: "1.6" }}
              >
                Un email a été envoyé à{" "}
                <span style={{ color: "#9D93E8" }}>{email}</span>.{" "}
                Clique sur le lien pour réinitialiser ton mot de passe.
              </p>

              <div className="my-8 h-px w-full" style={{ background: "#2a2a2a" }} />

              <button
                type="button"
                onClick={() => router.push("/login")}
                style={{
                  background: "#7B6FD4",
                  color: "white",
                  fontFamily: "var(--font-sans)",
                  fontSize: "15px",
                  fontWeight: 500,
                  borderRadius: "14px",
                  padding: "14px",
                  width: "100%",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Retour à la connexion
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
