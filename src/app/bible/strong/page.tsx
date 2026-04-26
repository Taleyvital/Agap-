"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChevronLeft, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import type { StrongResult } from "@/lib/strong";

const FALLBACK = "Information non disponible";

function val(s: string | null | undefined) {
  return s?.trim() || FALLBACK;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">
      {children}
    </p>
  );
}

function SkeletonBlock({ h = "h-4", w = "w-full" }: { h?: string; w?: string }) {
  return (
    <div
      className={`${h} ${w} rounded-lg animate-pulse`}
      style={{ background: "linear-gradient(90deg, #1c1c1c 0%, #252030 50%, #1c1c1c 100%)", backgroundSize: "200% 100%" }}
    />
  );
}

function StrongPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const word    = searchParams.get("word")    ?? "";
  const ref     = searchParams.get("ref")     ?? "";
  const text    = searchParams.get("text")    ?? "";
  const lang    = (searchParams.get("lang")   ?? "greek") as "greek" | "hebrew";

  const [result, setResult]   = useState<StrongResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!word || !ref) { setLoading(false); return; }
    setLoading(true);
    setError(false);

    fetch("/api/bible/strong", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word, verse_ref: ref, verse_text: text, language: lang }),
    })
      .then((r) => r.json())
      .then((data: { result?: StrongResult; error?: string }) => {
        if (data.result) setResult(data.result);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [word, ref, text, lang]);

  const openAI = () => {
    if (!result) return;
    const msg = `Je viens d'explorer le mot ${result.original_word ?? word} (Strong ${result.strong_number ?? ""}) dans ${ref}. Peux-tu m'expliquer plus en profondeur comment ce mot enrichit ma compréhension de ce passage ?`;
    router.push(`/chat?verse=strong-${result.strong_number}&text=${encodeURIComponent(msg)}&ref=${encodeURIComponent(`Strong · ${ref}`)}`);
  };

  const goToVerse = (verseRef: string) => {
    const parts = verseRef.match(/^(.+?)\s+(\d+):(\d+)$/);
    if (!parts) return;
    router.push(`/bible?book=${encodeURIComponent(parts[1])}&chapter=${parts[2]}&verse=${parts[3]}`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary" style={{ paddingTop: "env(safe-area-inset-top)" }}>

      {/* Header */}
      <header className="sticky top-0 z-20 bg-bg-primary/90 backdrop-blur-md px-4 pt-4 pb-3 border-b border-separator">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-primary"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              Concordance Strong · {lang === "greek" ? "Grec" : "Hébreu"}
            </p>
            <p className="font-serif text-base text-text-primary leading-tight truncate">
              « {word} »
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-28 space-y-4">

        {/* ── Loading ── */}
        {loading && (
          <>
            <div className="rounded-2xl border border-separator p-5 space-y-4"
              style={{ backgroundColor: "#1a1830" }}>
              <SkeletonBlock h="h-3" w="w-1/4" />
              <SkeletonBlock h="h-10" w="w-1/2" />
              <SkeletonBlock h="h-3" w="w-1/3" />
              <div className="flex gap-2 mt-2">
                <SkeletonBlock h="h-6" w="w-16" />
                <SkeletonBlock h="h-6" w="w-20" />
              </div>
            </div>
            <div className="rounded-2xl border border-separator bg-bg-secondary p-5 space-y-3">
              <SkeletonBlock h="h-3" w="w-1/4" />
              <SkeletonBlock h="h-5" w="w-3/4" />
              <SkeletonBlock h="h-3" w="w-full" />
              <SkeletonBlock h="h-3" w="w-5/6" />
              <SkeletonBlock h="h-3" w="w-4/6" />
            </div>
            <p className="text-center font-sans text-[13px] text-text-tertiary pt-2">
              L&apos;IA explore ce mot…
            </p>
          </>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <p className="font-sans text-sm text-text-secondary">Définition indisponible</p>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-full border border-separator bg-bg-secondary px-5 py-2.5 font-sans text-xs uppercase tracking-widest text-text-primary"
            >
              Retour
            </button>
          </div>
        )}

        {/* ── Result ── */}
        {!loading && result && (
          <>
            {/* Card mot original */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-accent/25 p-5"
              style={{ backgroundColor: "#1a1830" }}
            >
              {result.strong_number && (
                <p className="font-sans text-[11px] uppercase tracking-[0.18em] text-accent mb-3">
                  {result.strong_number} — {lang === "greek" ? "Grec koinè" : "Hébreu biblique"}
                </p>
              )}
              <p
                className="text-4xl text-text-primary text-center mb-2 leading-none"
                style={{ fontFamily: "serif", direction: lang === "hebrew" ? "rtl" : "ltr" }}
              >
                {result.original_word ?? word}
              </p>
              {result.transliteration && (
                <p className="font-sans italic text-[16px] text-text-secondary text-center mb-1">
                  {result.transliteration}
                </p>
              )}
              {result.pronunciation && (
                <p className="font-sans text-[13px] text-text-tertiary text-center mb-3">
                  {result.pronunciation}
                </p>
              )}
              {result.part_of_speech && (
                <div className="flex justify-center">
                  <span className="rounded-full bg-accent/15 border border-accent/20 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.14em] text-accent">
                    {result.part_of_speech}
                  </span>
                </div>
              )}
            </motion.div>

            {/* Card définition */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.06 }}
              className="rounded-2xl border border-separator bg-bg-secondary p-5"
            >
              <Label>Définition</Label>
              {result.definition_short && (
                <p className="font-serif italic text-[16px] text-text-primary leading-snug mb-3">
                  {result.definition_short}
                </p>
              )}
              <p className="font-sans text-[13px] text-text-tertiary leading-[1.7]">
                {val(result.definition_full)}
              </p>
              {result.etymology && (
                <>
                  <div className="my-4 h-px bg-separator" />
                  <p className="font-sans italic text-[12px] text-text-tertiary leading-relaxed">
                    {result.etymology}
                  </p>
                </>
              )}
              {result.occurrence_count && (
                <p className="mt-3 font-sans text-[11px] text-text-tertiary">
                  {result.occurrence_count} occurrences dans la Bible
                </p>
              )}
            </motion.div>

            {/* Card contexte du verset */}
            {result.in_this_verse && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.12 }}
                className="rounded-2xl border border-separator p-5"
                style={{ backgroundColor: "#1a1830", borderLeft: "2px solid rgb(var(--accent))" }}
              >
                <Label>Dans ce verset — {ref}</Label>
                <p className="font-sans text-[13px] text-text-primary leading-[1.7]">
                  {result.in_this_verse}
                </p>
              </motion.div>
            )}

            {/* Card application spirituelle */}
            {result.spiritual_application && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.16 }}
                className="rounded-2xl border border-separator bg-bg-secondary p-5"
              >
                <Label>Pour ta vie</Label>
                <p className="font-sans italic text-[13px] text-text-tertiary leading-[1.7]">
                  {result.spiritual_application}
                </p>
              </motion.div>
            )}

            {/* Bouton IA */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.2 }}
              type="button"
              onClick={openAI}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-accent/30 px-5 py-4 font-sans text-sm text-accent hover:bg-accent/10 active:scale-[0.98] transition-all"
            >
              <Sparkles className="h-4 w-4" />
              Approfondir avec l&apos;IA
            </motion.button>

            {/* Versets clés */}
            {result.key_verses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.24 }}
              >
                <Label>Versets clés</Label>
                <div className="flex flex-wrap gap-2">
                  {result.key_verses.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goToVerse(v)}
                      className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 font-sans text-[12px] text-accent hover:bg-accent/20 transition-colors"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Mots liés */}
            {result.related_words.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.28 }}
              >
                <Label>Mots liés</Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {result.related_words.map((rw, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        const params = new URLSearchParams({
                          word: rw.word,
                          ref,
                          text,
                          lang,
                        });
                        router.push(`/bible/strong?${params.toString()}`);
                      }}
                      className="shrink-0 flex flex-col items-center rounded-2xl border border-accent/25 bg-bg-secondary px-4 py-3 hover:bg-accent/10 transition-colors"
                    >
                      <span className="font-sans text-[9px] text-accent/60 mb-0.5">{rw.strong_number}</span>
                      <span className="font-sans text-[14px] text-text-primary" style={{ fontFamily: "serif" }}>{rw.word}</span>
                      <span className="font-sans text-[10px] text-text-tertiary mt-0.5">{rw.meaning}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function StrongPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    }>
      <StrongPageContent />
    </Suspense>
  );
}
