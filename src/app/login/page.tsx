"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Mode = "login" | "convert";
type Screen = "form" | "confirm";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [screen, setScreen] = useState<Screen>("form");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.is_anonymous) {
        setMode("convert");
      } else if (session && !session.user.is_anonymous) {
        router.replace("/home");
      }
    })();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);

    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "convert") {
        const { error: updateError } = await supabase.auth.updateUser({ email: email.trim() });
        if (updateError) throw updateError;
      } else {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (otpError) throw otpError;
      }
      setScreen("confirm");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (otpError) throw otpError;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <main
      className="fixed inset-0 overflow-y-auto"
      style={{ background: "#141414" }}
    >
      <div className="flex min-h-full flex-col items-center justify-start px-6 pb-12 pt-[45vh] -translate-y-1/3">
        <AnimatePresence mode="wait">
          {screen === "form" ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="w-full max-w-[360px]"
            >
              {/* Logo */}
              <div className="flex flex-col items-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: "#2D1F6E" }}
                >
                  {/* Colombe géométrique */}
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
                    <path
                      d="M17 6 C17 6 8 10 8 18 C8 22 11 25 14 26 L14 28 L17 26 L20 28 L20 26 C23 25 26 22 26 18 C26 10 17 6 17 6Z"
                      fill="white"
                      opacity="0.9"
                    />
                    <path
                      d="M17 6 L22 10 L26 8 L23 14 C22 12 20 10 17 6Z"
                      fill="white"
                    />
                    <circle cx="14.5" cy="16" r="1.5" fill="#2D1F6E" />
                  </svg>
                </div>

                <h1
                  className="mt-4 tracking-[0.15em] uppercase"
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: "28px",
                    color: "#E8E8E8",
                    fontWeight: 600,
                  }}
                >
                  AGAPE
                </h1>

                <p
                  className="mt-1 italic"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    color: "#666666",
                  }}
                >
                  {mode === "convert"
                    ? "Sauvegarde ton compte"
                    : "Ton compagnon spirituel"}
                </p>
              </div>

              {/* Séparateur */}
              <div
                className="my-10 h-px w-full"
                style={{ background: "#2a2a2a" }}
              />

              {/* Formulaire */}
              <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
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
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "12px",
                      color: "#E24B4A",
                    }}
                  >
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
                    transition: "background 0.2s, opacity 0.2s",
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? "Envoi en cours…" : "Recevoir le lien de connexion"}
                </button>

                <p
                  className="text-center"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "12px",
                    color: "#555555",
                  }}
                >
                  Un lien magique sera envoyé à ton adresse. Pas de mot de passe.
                </p>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex w-full max-w-[360px] flex-col items-center text-center"
            >
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
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "24px",
                  color: "#E8E8E8",
                  fontWeight: 600,
                }}
              >
                Vérifie ta messagerie
              </h2>

              <p
                className="mt-3"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  color: "#666666",
                  lineHeight: "1.6",
                }}
              >
                Un lien de connexion a été envoyé à{" "}
                <span style={{ color: "#9D93E8" }}>{email}</span>.{" "}
                Le lien expire dans 10 minutes.
              </p>

              <div
                className="my-8 h-px w-full"
                style={{ background: "#2a2a2a" }}
              />

              {error && (
                <p
                  className="mb-4"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "12px",
                    color: "#E24B4A",
                  }}
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={loading}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(123, 111, 212, 0.4)",
                  borderRadius: "14px",
                  padding: "13px 24px",
                  color: "#7B6FD4",
                  fontFamily: "var(--font-sans)",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  width: "100%",
                  transition: "border-color 0.2s, opacity 0.2s",
                }}
              >
                {loading ? "Envoi…" : "Renvoyer le lien"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setScreen("form");
                  setError(null);
                }}
                className="mt-4"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#555555",
                  fontFamily: "var(--font-sans)",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                ← Changer d&apos;adresse
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
