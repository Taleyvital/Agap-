"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string; general?: string }>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.is_anonymous) {
        setIsAnonymous(true);
        setMode("signup");
      } else if (session && !session.user.is_anonymous) {
        router.replace("/home");
      }
    })();
  }, [router]);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "L'adresse email est requise.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Adresse email invalide.";
    if (!password) newErrors.password = "Le mot de passe est requis.";
    else if (password.length < 6) newErrors.password = "Minimum 6 caractères.";
    if (mode === "signup" && password !== confirmPassword) {
      newErrors.confirm = "Les mots de passe ne correspondent pas.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "signup") {
        if (isAnonymous) {
          const { error } = await supabase.auth.updateUser({ email: email.trim(), password });
          if (error) throw error;
        } else {
          const { error } = await supabase.auth.signUp({ email: email.trim(), password });
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      router.replace("/home");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Une erreur est survenue.";
      setErrors({ general: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrors({ email: "Entre ton email pour recevoir le lien." });
      return;
    }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      setErrors({ general: undefined });
      alert(`Un email de réinitialisation a été envoyé à ${email}.`);
    } catch (err: unknown) {
      setErrors({ general: err instanceof Error ? err.message : "Une erreur est survenue." });
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

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

            <p
              className="mt-1 italic"
              style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#666666" }}
            >
              Ton compagnon spirituel
            </p>
          </div>

          {/* Séparateur */}
          <div className="my-8 h-px w-full" style={{ background: "#2a2a2a" }} />

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {/* Titre */}
              <h2
                className="mb-6"
                style={{ fontFamily: "var(--font-serif)", fontSize: "20px", color: "#E8E8E8", fontWeight: 600 }}
              >
                {mode === "login" ? "Bienvenue" : "Créer un compte"}
              </h2>

              <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4" noValidate>
                {/* Email */}
                <div className="flex flex-col gap-1">
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    style={fieldStyle(!!errors.email)}
                    onFocus={(e) => { e.currentTarget.style.borderColor = errors.email ? "#E24B4A" : "#7B6FD4"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = errors.email ? "#E24B4A" : "#2a2a2a"; }}
                  />
                  {errors.email && <FieldError>{errors.email}</FieldError>}
                </div>

                {/* Mot de passe */}
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mot de passe"
                      style={{ ...fieldStyle(!!errors.password), paddingRight: "44px" }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = errors.password ? "#E24B4A" : "#7B6FD4"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = errors.password ? "#E24B4A" : "#2a2a2a"; }}
                    />
                    <EyeButton show={showPassword} onToggle={() => setShowPassword((v) => !v)} />
                  </div>
                  {errors.password && <FieldError>{errors.password}</FieldError>}
                </div>

                {/* Confirmation mot de passe (signup uniquement) */}
                {mode === "signup" && (
                  <div className="flex flex-col gap-1">
                    <div className="relative">
                      <input
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirmer le mot de passe"
                        style={{ ...fieldStyle(!!errors.confirm), paddingRight: "44px" }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = errors.confirm ? "#E24B4A" : "#7B6FD4"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = errors.confirm ? "#E24B4A" : "#2a2a2a"; }}
                      />
                      <EyeButton show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
                    </div>
                    {errors.confirm && <FieldError>{errors.confirm}</FieldError>}
                  </div>
                )}

                {/* Erreur générale */}
                {errors.general && (
                  <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#E24B4A" }}>
                    {errors.general}
                  </p>
                )}

                {/* Bouton principal */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    background: loading ? "#3a3460" : "#7B6FD4",
                    color: "white",
                    fontFamily: "var(--font-sans)",
                    fontSize: "15px",
                    fontWeight: 500,
                    borderRadius: "14px",
                    padding: "14px",
                    width: "100%",
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    transition: "background 0.2s, opacity 0.2s",
                    marginTop: "4px",
                  }}
                >
                  {loading
                    ? "Chargement…"
                    : mode === "login"
                    ? "Se connecter"
                    : "Créer mon compte"}
                </button>

                {/* Mot de passe oublié */}
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => void handleForgotPassword()}
                    disabled={loading}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#555555",
                      fontFamily: "var(--font-sans)",
                      fontSize: "12px",
                      cursor: "pointer",
                      textAlign: "center",
                      padding: "0",
                    }}
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </form>

              {/* Lien de bascule */}
              <p
                className="mt-8 text-center"
                style={{ fontFamily: "var(--font-sans)", fontSize: "13px", color: "#666666" }}
              >
                {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setErrors({});
                    setPassword("");
                    setConfirmPassword("");
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#7B6FD4",
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    cursor: "pointer",
                    padding: "0",
                  }}
                >
                  {mode === "login" ? "S'inscrire" : "Se connecter"}
                </button>
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function fieldStyle(hasError: boolean): React.CSSProperties {
  return {
    background: "#1c1c1c",
    border: `0.5px solid ${hasError ? "#E24B4A" : "#2a2a2a"}`,
    borderRadius: "12px",
    padding: "14px 16px",
    color: "#E8E8E8",
    fontFamily: "var(--font-sans)",
    fontSize: "14px",
    outline: "none",
    width: "100%",
    transition: "border-color 0.2s",
  };
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "var(--font-sans)", fontSize: "12px", color: "#E24B4A" }}>
      {children}
    </p>
  );
}

function EyeButton({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      style={{
        position: "absolute",
        right: "14px",
        top: "50%",
        transform: "translateY(-50%)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: "0",
        color: "#555555",
        display: "flex",
        alignItems: "center",
      }}
    >
      {show ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )}
    </button>
  );
}
