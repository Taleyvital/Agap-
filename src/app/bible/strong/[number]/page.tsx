"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, BookOpen, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { getStrongDefinition, getStrongVerses } from "@/lib/strong";
import type { StrongDefinitionRow, VerseOccurrence } from "@/lib/strong";

function InfoCard({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <p className="font-sans text-[10px] uppercase tracking-[0.16em] text-text-tertiary">{label}</p>
      <p className="font-sans text-sm text-text-primary">{value}</p>
    </div>
  );
}

export default function StrongDefinitionPage() {
  const params = useParams<{ number: string }>();
  const router = useRouter();
  const number = params.number?.toUpperCase() ?? "";

  const [definition, setDefinition] = useState<StrongDefinitionRow | null>(null);
  const [verses, setVerses] = useState<VerseOccurrence[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!number) return;
    setLoading(true);
    void Promise.all([
      getStrongDefinition(number),
      getStrongVerses(number),
    ]).then(([def, occ]) => {
      setDefinition(def);
      setVerses(occ.verses);
      setTotal(occ.total);
      setLoading(false);
    });
  }, [number]);

  const isGreek = number.startsWith("G");
  const langLabel = isGreek ? "Grec" : "Hébreu";

  const openAI = () => {
    if (!definition) return;
    const context = `Concordance Strong ${number} — "${definition.original_word}" (${definition.transliteration}) : ${definition.definition}`;
    router.push(`/chat?verse=strong-${number}&text=${encodeURIComponent(context)}&ref=${encodeURIComponent(`Strong ${number}`)}`);
  };

  return (
    <AppShell>
      <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 68px)" }}>

        {/* Header */}
        <header className="sticky top-0 z-20 bg-bg-primary/90 backdrop-blur-md px-4 pt-4 pb-3 border-b border-separator">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-primary"
              aria-label="Retour"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                CONCORDANCE STRONG · {langLabel}
              </p>
              <p className="font-serif text-base text-text-primary leading-tight truncate">{number}</p>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 pb-28 space-y-4">

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl border border-separator bg-bg-secondary p-5 space-y-3 animate-pulse">
                  <div className="h-4 w-1/3 rounded bg-bg-tertiary" />
                  <div className="h-8 w-2/3 rounded bg-bg-tertiary" />
                  <div className="h-3 w-1/2 rounded bg-bg-tertiary" />
                </div>
              ))}
            </div>
          ) : !definition ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-bg-secondary border border-separator">
                <BookOpen className="h-6 w-6 text-text-tertiary" />
              </div>
              <p className="font-sans text-sm text-text-secondary">
                Définition indisponible pour {number}
              </p>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-full border border-separator bg-bg-secondary px-5 py-2.5 font-sans text-xs uppercase tracking-widest text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                Retour
              </button>
            </div>
          ) : (
            <>
              {/* Card principale */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="rounded-2xl border border-separator bg-bg-secondary p-5"
              >
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-3">
                  Mot original · {langLabel}
                </p>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <p
                    className="text-4xl text-text-primary leading-none"
                    style={{ fontFamily: isGreek ? "serif" : "serif", direction: isGreek ? "ltr" : "rtl" }}
                  >
                    {definition.original_word || number}
                  </p>
                  <span className="rounded-full bg-accent/15 border border-accent/25 px-3 py-1 font-sans text-xs text-accent font-medium">
                    {number}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCard label="Translittération" value={definition.transliteration} />
                  <InfoCard label="Prononciation" value={definition.pronunciation} />
                  {definition.occurrence_count > 0 && (
                    <InfoCard label="Occurrences" value={`${definition.occurrence_count}×`} />
                  )}
                  <InfoCard label="Langue" value={langLabel} />
                </div>
              </motion.div>

              {/* Card définition */}
              {definition.definition && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.06 }}
                  className="rounded-2xl border border-separator bg-bg-secondary p-5"
                >
                  <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-3">
                    Définition
                  </p>
                  <p className="font-serif text-sm text-text-primary leading-relaxed">
                    {definition.definition}
                  </p>
                </motion.div>
              )}

              {/* Card étymologie */}
              {definition.etymology && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.12 }}
                  className="rounded-2xl border border-separator bg-bg-secondary p-5"
                >
                  <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-3">
                    Racine / Étymologie
                  </p>
                  <p className="font-sans text-sm text-text-secondary leading-relaxed">
                    {definition.etymology}
                  </p>
                </motion.div>
              )}

              {/* Demander à l'IA */}
              <motion.button
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.18 }}
                type="button"
                onClick={openAI}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-accent/10 border border-accent/25 px-5 py-4 font-sans text-sm text-accent hover:bg-accent/15 active:scale-[0.98] transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Approfondir avec l&apos;IA
              </motion.button>

              {/* Occurrences */}
              {verses.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.22 }}
                >
                  <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-3 px-1">
                    Occurrences dans la Bible
                    {total > 0 && (
                      <span className="ml-2 rounded-full bg-bg-secondary border border-separator px-2 py-0.5 text-[9px] text-text-tertiary normal-case tracking-normal">
                        {total} total
                      </span>
                    )}
                  </p>
                  <div className="space-y-2">
                    {verses.map((v, i) => (
                      <div
                        key={i}
                        className="rounded-2xl border border-separator bg-bg-secondary p-4"
                      >
                        <p className="font-sans text-[10px] uppercase tracking-[0.14em] text-accent mb-1.5">
                          {v.reference}
                        </p>
                        <p className="font-serif text-sm text-text-primary leading-relaxed">
                          {v.text || "—"}
                        </p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
