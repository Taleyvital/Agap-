"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Flame, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface PrayerRequest {
  id: string;
  titre: string;
  note_initiale: string | null;
  exaucee: boolean;
  date_exaucement: string | null;
  temoignage: string | null;
  partage_communaute: boolean;
  created_at: string;
  updated_at: string;
}

export default function PrayerJournalPage() {
  const router = useRouter();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("prayer_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to load prayer journal:", error);
      } else {
        setPrayers(data || []);
      }

      setLoading(false);
    })();
  }, [router]);

  const deletePrayer = async (id: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette requête de prière ?")) return;

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase
      .from("prayer_requests")
      .delete()
      .eq("id", id);

    if (!error) {
      setPrayers(prev => prev.filter(p => p.id !== id));
    }
  };

  const toggleAnswered = async (prayer: PrayerRequest) => {
    const supabase = createSupabaseBrowserClient();
    const newValue = !prayer.exaucee;

    const { error } = await supabase
      .from("prayer_requests")
      .update({
        exaucee: newValue,
        date_exaucement: newValue ? new Date().toISOString() : null,
      })
      .eq("id", prayer.id);

    if (!error) {
      setPrayers(prev => prev.map(p => 
        p.id === prayer.id 
          ? { ...p, exaucee: newValue, date_exaucement: newValue ? new Date().toISOString() : null }
          : p
      ));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-32">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-primary"
            aria-label="Retour"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="font-serif text-xl text-text-primary">Journal de prière</h1>
        </header>

        {/* Stats */}
        {!loading && prayers.length > 0 && (
          <div className="mb-6 flex divide-x divide-separator overflow-hidden rounded-2xl border border-separator bg-bg-secondary">
            <div className="flex flex-1 flex-col items-center py-4">
              <span className="font-serif text-2xl font-semibold text-text-primary">
                {prayers.length}
              </span>
              <span className="mt-0.5 px-1 text-center font-sans text-[9px] uppercase tracking-wider text-text-tertiary leading-tight">
                Requêtes
              </span>
            </div>
            <div className="flex flex-1 flex-col items-center py-4">
              <span className="font-serif text-2xl font-semibold text-text-primary flex items-center gap-1">
                <Check className="h-5 w-5 text-green-600" />
                {prayers.filter(p => p.exaucee).length}
              </span>
              <span className="mt-0.5 px-1 text-center font-sans text-[9px] uppercase tracking-wider text-text-tertiary leading-tight">
                Exaucées
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl bg-bg-secondary animate-pulse" />
            ))}
          </div>
        ) : prayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Flame className="h-12 w-12 text-text-tertiary mb-4" />
            <p className="font-serif text-lg text-text-secondary">Aucune requête</p>
            <p className="mt-2 font-sans text-sm text-text-tertiary">
              Commencez à noter vos sujets de prière
            </p>
            <button
              type="button"
              onClick={() => router.push("/prayer?tab=prayers")}
              className="mt-6 rounded-full bg-accent px-6 py-3 font-sans text-xs uppercase tracking-wider text-white"
            >
              Ouvrir le journal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <AnimatePresence mode="popLayout">
              {prayers.map((prayer) => (
                <motion.div
                  key={prayer.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative overflow-hidden rounded-2xl border p-5 transition-all ${
                    prayer.exaucee
                      ? "border-green-500/30 bg-gradient-to-br from-green-500/10 to-bg-secondary hover:border-green-500/50"
                      : "border-separator bg-gradient-to-br from-bg-secondary to-bg-tertiary hover:border-accent/30 hover:shadow-lg hover:shadow-accent/10"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${
                      prayer.exaucee
                        ? "bg-green-500/20"
                        : "bg-accent/10"
                    }`}>
                      {prayer.exaucee ? (
                        <Check className="h-6 w-6 text-green-600" />
                      ) : (
                        <Flame className="h-6 w-6 text-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif text-lg font-semibold text-text-primary leading-tight">
                        {prayer.titre}
                      </p>
                      {prayer.note_initiale && (
                        <p className="mt-2 font-sans text-sm text-text-secondary line-clamp-2">
                          {prayer.note_initiale}
                        </p>
                      )}
                      {prayer.temoignage && (
                        <div className="mt-3 rounded-xl bg-bg-tertiary/50 p-3">
                          <p className="font-sans text-[10px] uppercase tracking-wider text-text-tertiary mb-1">
                            Témoignage
                          </p>
                          <p className="font-serif text-sm italic text-text-secondary line-clamp-2 leading-relaxed">
                            &ldquo;{prayer.temoignage}&rdquo;
                          </p>
                        </div>
                      )}
                      <p className={`mt-3 text-[10px] uppercase tracking-wider ${
                        prayer.exaucee ? "text-green-600 font-semibold" : "text-text-tertiary"
                      }`}>
                        {prayer.exaucee && prayer.date_exaucement
                          ? `Exaucée le ${formatDate(prayer.date_exaucement)}`
                          : `Depuis le ${formatDate(prayer.created_at)}`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {prayer.exaucee ? (
                        <>
                          <span className="text-lg">🎉</span>
                          <span className="text-[10px] uppercase tracking-wider text-green-600 font-semibold">
                            Dieu a répondu
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                          <span className="text-[10px] uppercase tracking-wider text-accent font-semibold">
                            En prière
                          </span>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleAnswered(prayer)}
                        className={`flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                          prayer.exaucee
                            ? "bg-green-500/20 text-green-600 hover:bg-green-500/30"
                            : "bg-accent text-white hover:bg-accent-light"
                        }`}
                        aria-label={prayer.exaucee ? "Marquer comme non exaucé" : "Marquer comme exaucé"}
                      >
                        <Check className="h-3.5 w-3.5" />
                        {prayer.exaucee ? "Annuler" : "Exaucée"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePrayer(prayer.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-tertiary text-text-tertiary hover:text-danger hover:bg-danger/10 transition-colors"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  );
}
