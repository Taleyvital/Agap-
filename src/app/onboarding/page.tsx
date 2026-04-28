"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { pickAnonymousName } from "@/lib/anonymous-name";
import { Church, BookOpen, Cross, Flame, HelpCircle } from "lucide-react";
import AvatarBuilder, { type AvatarConfig } from "@/components/AvatarBuilder";

const STEPS = 5;

const traditions = [
  { id: "Catholique",   icon: Church,     title: "Catholique",   desc: "Tradition liturgique et sacramentelle."   },
  { id: "Évangélique",  icon: BookOpen,   title: "Évangélique",  desc: "Centrée sur la Bible et la grâce."        },
  { id: "Orthodoxe",    icon: Cross,      title: "Orthodoxe",    desc: "Père, Fils et Saint-Esprit."              },
  { id: "Pentecôtiste", icon: Flame,      title: "Pentecôtiste", desc: "Vie dans l'Esprit et témoignage."        },
  { id: "Je découvre",  icon: HelpCircle, title: "Je découvre",  desc: "Premiers pas dans la foi."               },
] as const;

const levels = [
  { id: "En recherche",   label: "En recherche",   desc: "Je pose des questions."                },
  { id: "Jeune croyant",  label: "Jeune croyant",  desc: "J'apprends jour après jour."           },
  { id: "Disciple actif", label: "Disciple actif", desc: "Je grandis avec la communauté."        },
  { id: "Accompagnateur", label: "Accompagnateur", desc: "Je marche avec les autres."            },
] as const;

const challenges = [
  { id: "La Solitude" },
  { id: "L'Anxiété"   },
  { id: "Le Deuil"    },
  { id: "Le Doute"    },
  { id: "La Fatigue"  },
] as const;

const SKIN_TONES = [
  { id: "tone1", color: "#FDDBB4" },
  { id: "tone2", color: "#E8B98A" },
  { id: "tone3", color: "#C68642" },
  { id: "tone4", color: "#8D5524" },
  { id: "tone5", color: "#5C3317" },
  { id: "tone6", color: "#3B1F0F" },
];

const EYE_SHAPES = [
  { id: "almond", label: "Amande" },
  { id: "round",  label: "Rond"   },
  { id: "asian",  label: "Bridé"  },
  { id: "wide",   label: "Large"  },
];

const HAIR_STYLES = [
  { id: "short",        label: "Court"          },
  { id: "afro",         label: "Afro"           },
  { id: "shaved",       label: "Rasé"           },
  { id: "short_braids", label: "Nattes courtes" },
];

const DEFAULT_AVATAR: Required<AvatarConfig> = {
  skin_tone: "tone3", eye_shape: "almond", eye_color: "brown",
  eyebrow_style: "natural", nose_shape: "rounded", mouth_style: "smile",
  hair_style: "short", hair_color: "black", beard_style: "none",
  accessory: "none", background_color: "#1a1830",
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [tradition, setTradition] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [avatarConfig, setAvatarConfig] = useState<Required<AvatarConfig>>(DEFAULT_AVATAR);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
        if (profile) { router.replace("/home"); return; }
      } else {
        const { error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) setError("Connexion anonyme impossible. Active l'auth anonyme dans Supabase.");
      }
      setAuthReady(true);
    })();
  }, [router]);

  const progress = (step / STEPS) * 100;
  const goNext = () => { if (step < STEPS) setStep((s) => s + 1); };

  const setAvatar = <K extends keyof AvatarConfig>(key: K, value: string) => {
    setAvatarConfig((prev) => ({ ...prev, [key]: value }));
  };

  const finish = async () => {
    if (!firstName.trim() || !tradition || !level || !challenge) return;
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session introuvable. Réessaie."); setLoading(false); return; }
    const anonymous_name = pickAnonymousName();
    const { error: upsertError } = await supabase.from("profiles").upsert(
      { id: user.id, first_name: firstName.trim(), denomination: tradition, spiritual_level: level, current_challenge: challenge, anonymous_name, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
    if (upsertError) { setError(upsertError.message); setLoading(false); return; }
    // Save avatar
    await supabase.from("avatar_customization").upsert({ ...avatarConfig, user_id: user.id, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    // Award coins for onboarding (via API to avoid server-only import)
    await fetch("/api/xp/award", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ONBOARDING_COMPLETED" }) }).catch(() => null);
    router.replace("/home");
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-neutral-900">
      <div
        className="h-0.5 bg-neutral-200"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <motion.div
          className="h-full bg-black"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>

      <div className="mx-auto flex min-h-[calc(100vh-4px)] max-w-[430px] flex-col px-6 pb-12 pt-10">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section key="s1" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-1 flex-col">
              <h1 className="font-serif text-3xl font-bold text-black">Comment t&apos;appelles-tu ?</h1>
              <input
                className="mt-10 w-full border-b-2 border-gray-300 bg-transparent pb-2 text-xl outline-none transition-colors focus:border-black"
                placeholder="Ton prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && firstName.trim()) goNext(); }}
                autoFocus
              />
              <p className="mt-3 text-sm text-gray-500">Appuyer sur Entrée pour continuer</p>
              <div className="mt-auto pt-10">
                <Button variant="primary" className="w-full bg-black text-white hover:opacity-90" disabled={!firstName.trim() || !authReady} onClick={goNext}>
                  Continuer →
                </Button>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section key="s2" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-1 flex-col gap-3">
              <h1 className="font-serif text-2xl font-semibold text-black">Ta tradition chrétienne</h1>
              <div className="mt-4 flex flex-col gap-3">
                {traditions.map(({ id, icon: Icon, title, desc }) => {
                  const selected = tradition === id;
                  return (
                    <button key={id} type="button" onClick={() => setTradition(id)}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${selected ? "border-black bg-black text-white" : "border-gray-200 bg-white text-black"}`}>
                      <Icon className="mt-0.5 h-6 w-6 shrink-0" />
                      <span>
                        <span className="block font-semibold">{title}</span>
                        <span className={`text-sm ${selected ? "text-neutral-300" : "text-gray-600"}`}>{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto pt-8">
                <Button variant="primary" className="w-full bg-black text-white" disabled={!tradition} onClick={goNext}>Continuer →</Button>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section key="s3" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-1 flex-col gap-3">
              <h1 className="font-serif text-2xl font-semibold text-black">Ta maturité spirituelle</h1>
              <div className="mt-4 flex flex-col gap-3">
                {levels.map(({ id, label, desc }) => {
                  const selected = level === id;
                  return (
                    <button key={id} type="button" onClick={() => setLevel(id)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${selected ? "border-black bg-black text-white" : "border-gray-200 bg-white text-black"}`}>
                      <span className="block font-semibold">{label}</span>
                      <span className={`text-sm ${selected ? "text-neutral-300" : "text-gray-600"}`}>{desc}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto pt-8">
                <Button variant="primary" className="w-full bg-black text-white" disabled={!level} onClick={goNext}>Continuer →</Button>
              </div>
            </motion.section>
          )}

          {step === 4 && (
            <motion.section key="s4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-1 flex-col gap-3">
              <h1 className="font-serif text-2xl font-semibold text-black">Qu&apos;est-ce qui pèse sur ton cœur ?</h1>
              <div className="mt-4 flex flex-col gap-3">
                {challenges.map(({ id }) => {
                  const selected = challenge === id;
                  return (
                    <button key={id} type="button" onClick={() => setChallenge(id)}
                      className={`rounded-2xl border p-4 text-left font-medium transition-colors ${selected ? "border-black bg-black text-white" : "border-gray-200 bg-white text-black"}`}>
                      {id}
                    </button>
                  );
                })}
              </div>
              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
              <div className="mt-auto pt-8">
                <Button variant="primary" className="w-full bg-black text-white" disabled={!challenge} onClick={goNext}>
                  Continuer →
                </Button>
              </div>
            </motion.section>
          )}

          {step === 5 && (
            <motion.section key="s5" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="flex flex-1 flex-col gap-4">
              <h1 className="font-serif text-2xl font-bold text-black">Crée ton avatar</h1>
              <p className="text-sm text-gray-500">Comment veux-tu apparaître dans AGAPE ?</p>

              {/* Live preview */}
              <div className="flex justify-center py-4">
                <div className="rounded-full overflow-hidden shadow-xl" style={{ width: 120, height: 120, boxShadow: "0 0 0 3px #7B6FD4" }}>
                  <AvatarBuilder config={avatarConfig} size={120} />
                </div>
              </div>

              {/* Skin tone */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Teinte de peau</p>
                <div className="flex gap-2 flex-wrap">
                  {SKIN_TONES.map(({ id, color }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAvatar("skin_tone", id)}
                      className="h-10 w-10 rounded-full transition-all"
                      style={{
                        background: color,
                        border: avatarConfig.skin_tone === id ? "3px solid #7B6FD4" : "2px solid #e5e7eb",
                        boxShadow: avatarConfig.skin_tone === id ? "0 0 0 2px rgba(123,111,212,0.3)" : undefined,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Eye shape */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Yeux</p>
                <div className="flex gap-2 flex-wrap">
                  {EYE_SHAPES.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAvatar("eye_shape", id)}
                      className="rounded-xl border px-3 py-1.5 text-sm font-medium transition-all"
                      style={{
                        background: avatarConfig.eye_shape === id ? "#7B6FD4" : "white",
                        color: avatarConfig.eye_shape === id ? "white" : "#333",
                        borderColor: avatarConfig.eye_shape === id ? "#7B6FD4" : "#e5e7eb",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hair */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">Cheveux</p>
                <div className="flex gap-2 flex-wrap">
                  {HAIR_STYLES.map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAvatar("hair_style", id)}
                      className="rounded-xl border px-3 py-1.5 text-sm font-medium transition-all"
                      style={{
                        background: avatarConfig.hair_style === id ? "#7B6FD4" : "white",
                        color: avatarConfig.hair_style === id ? "white" : "#333",
                        borderColor: avatarConfig.hair_style === id ? "#7B6FD4" : "#e5e7eb",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

              <div className="mt-auto pt-6">
                <Button
                  variant="primary"
                  className="w-full bg-black text-white"
                  disabled={loading}
                  onClick={() => void finish()}
                >
                  {loading ? "Création…" : "Terminer mon chemin →"}
                </Button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
