"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { pickAnonymousName } from "@/lib/anonymous-name";
import { Church, BookOpen, Cross, Flame, HelpCircle } from "lucide-react";

const STEPS = 4;

const traditions = [
  {
    id: "Catholique",
    icon: Church,
    title: "Catholique",
    desc: "Tradition liturgique et sacramentelle.",
  },
  {
    id: "Évangélique",
    icon: BookOpen,
    title: "Évangélique",
    desc: "Centrée sur la Bible et la grâce.",
  },
  {
    id: "Orthodoxe",
    icon: Cross,
    title: "Orthodoxe",
    desc: "Père, Fils et Saint-Esprit.",
  },
  {
    id: "Pentecôtiste",
    icon: Flame,
    title: "Pentecôtiste",
    desc: "Vie dans l’Esprit et témoignage.",
  },
  {
    id: "Je découvre",
    icon: HelpCircle,
    title: "Je découvre",
    desc: "Premiers pas dans la foi.",
  },
] as const;

const levels = [
  { id: "En recherche", label: "En recherche", desc: "Je pose des questions." },
  {
    id: "Jeune croyant",
    label: "Jeune croyant",
    desc: "J’apprends jour après jour.",
  },
  {
    id: "Disciple actif",
    label: "Disciple actif",
    desc: "Je grandis avec la communauté.",
  },
  {
    id: "Accompagnateur",
    label: "Accompagnateur",
    desc: "Je marche avec les autres.",
  },
] as const;

const challenges = [
  { id: "La Solitude" },
  { id: "L'Anxiété" },
  { id: "Le Deuil" },
  { id: "Le Doute" },
  { id: "La Fatigue" },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [tradition, setTradition] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (profile) {
          router.replace("/home");
          return;
        }
      } else {
        const { error: anonError } = await supabase.auth.signInAnonymously();
        if (anonError) {
          setError(
            "Connexion anonyme impossible. Active l’auth anonyme dans Supabase.",
          );
        }
      }
      setAuthReady(true);
    })();
  }, [router]);

  const progress = (step / STEPS) * 100;

  const goNext = () => {
    if (step < STEPS) setStep((s) => s + 1);
  };

  const finish = async () => {
    if (!firstName.trim() || !tradition || !level || !challenge) return;
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session introuvable. Réessaie.");
      setLoading(false);
      return;
    }
    const anonymous_name = pickAnonymousName();
    const { error: upsertError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        first_name: firstName.trim(),
        denomination: tradition,
        spiritual_level: level,
        current_challenge: challenge,
        anonymous_name,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return;
    }
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
          {step === 1 ? (
            <motion.section
              key="s1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-1 flex-col"
            >
              <h1 className="font-serif text-3xl font-bold text-black">
                Comment t&apos;appelles-tu ?
              </h1>
              <input
                className="mt-10 w-full border-b-2 border-gray-300 bg-transparent pb-2 text-xl outline-none transition-colors focus:border-black"
                placeholder="Ton prénom"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && firstName.trim()) goNext();
                }}
                autoFocus
              />
              <p className="mt-3 text-sm text-gray-500">
                Appuyer sur Entrée pour continuer
              </p>
              <div className="mt-auto pt-10">
                <Button
                  variant="primary"
                  className="w-full bg-black text-white hover:opacity-90"
                  disabled={!firstName.trim() || !authReady}
                  onClick={goNext}
                >
                  Continuer →
                </Button>
              </div>
            </motion.section>
          ) : null}

          {step === 2 ? (
            <motion.section
              key="s2"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-1 flex-col gap-3"
            >
              <h1 className="font-serif text-2xl font-semibold text-black">
                Ta tradition chrétienne
              </h1>
              <div className="mt-4 flex flex-col gap-3">
                {traditions.map(({ id, icon: Icon, title, desc }) => {
                  const selected = tradition === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setTradition(id)}
                      className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors ${
                        selected
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-black"
                      }`}
                    >
                      <Icon className="mt-0.5 h-6 w-6 shrink-0" />
                      <span>
                        <span className="block font-semibold">{title}</span>
                        <span
                          className={`text-sm ${selected ? "text-neutral-300" : "text-gray-600"}`}
                        >
                          {desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto pt-8">
                <Button
                  variant="primary"
                  className="w-full bg-black text-white"
                  disabled={!tradition}
                  onClick={goNext}
                >
                  Continuer →
                </Button>
              </div>
            </motion.section>
          ) : null}

          {step === 3 ? (
            <motion.section
              key="s3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-1 flex-col gap-3"
            >
              <h1 className="font-serif text-2xl font-semibold text-black">
                Ta maturité spirituelle
              </h1>
              <div className="mt-4 flex flex-col gap-3">
                {levels.map(({ id, label, desc }) => {
                  const selected = level === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setLevel(id)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        selected
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-black"
                      }`}
                    >
                      <span className="block font-semibold">{label}</span>
                      <span
                        className={`text-sm ${selected ? "text-neutral-300" : "text-gray-600"}`}
                      >
                        {desc}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto pt-8">
                <Button
                  variant="primary"
                  className="w-full bg-black text-white"
                  disabled={!level}
                  onClick={goNext}
                >
                  Continuer →
                </Button>
              </div>
            </motion.section>
          ) : null}

          {step === 4 ? (
            <motion.section
              key="s4"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="flex flex-1 flex-col gap-3"
            >
              <h1 className="font-serif text-2xl font-semibold text-black">
                Qu&apos;est-ce qui pèse sur ton cœur ?
              </h1>
              <div className="mt-4 flex flex-col gap-3">
                {challenges.map(({ id }) => {
                  const selected = challenge === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setChallenge(id)}
                      className={`rounded-2xl border p-4 text-left font-medium transition-colors ${
                        selected
                          ? "border-black bg-black text-white"
                          : "border-gray-200 bg-white text-black"
                      }`}
                    >
                      {id}
                    </button>
                  );
                })}
              </div>
              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="mt-auto pt-8">
                <Button
                  variant="primary"
                  className="w-full bg-black text-white"
                  disabled={!challenge || loading}
                  onClick={() => void finish()}
                >
                  Démarrer mon chemin →
                </Button>
              </div>
            </motion.section>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
