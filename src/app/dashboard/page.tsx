"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, BookOpen, Timer, Highlighter, MessageSquare, Heart, Star, Zap, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { LEVELS, getLevelForXP, getNextLevel } from "@/lib/xp-shared";

// ── Types ────────────────────────────────────────────────────
interface LevelRow {
  total_xp: number;
  current_level: number;
  current_streak: number;
  longest_streak: number;
}

interface XPRow {
  id: string;
  action_type: string;
  xp_earned: number;
  created_at: string;
}

// ── Action label / icon map ──────────────────────────────────
const ACTION_META: Record<string, { label: string; Icon: React.ElementType }> = {
  LECTURE_DAY_COMPLETED:    { label: "Jour de lecture complété",        Icon: BookOpen      },
  PRAYER_TIMER_COMPLETED:   { label: "Session de prière terminée",      Icon: Timer         },
  VERSE_ANNOTATED:          { label: "Verset annoté",                   Icon: Highlighter   },
  COMMUNITY_POST_PUBLISHED: { label: "Publication dans la communauté",  Icon: MessageSquare },
  COMMUNITY_AMEN_RECEIVED:  { label: "Amen reçu",                       Icon: Heart         },
  PRAYER_ANSWERED_LOGGED:   { label: "Prière exaucée enregistrée",      Icon: Star          },
  STREAK_7_DAYS:            { label: "Bonus – 7 jours de suite",        Icon: Zap           },
  STREAK_30_DAYS:           { label: "Bonus – 30 jours de suite",       Icon: Flame         },
  ONBOARDING_COMPLETED:     { label: "Profil complété",                 Icon: Check         },
};

function formatDateTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86_400_000);
  const dStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  if (dStart.getTime() === todayStart.getTime()) return `Aujourd'hui, ${time}`;
  if (dStart.getTime() === yesterdayStart.getTime()) return `Hier, ${time}`;
  return date.toLocaleDateString("fr-FR", { weekday: "long" }) + `, ${time}`;
}

// ── Tree illustration (colours fixed — pure design art) ──────
function TreeIllustration() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 52%, rgba(90,75,200,0.55) 0%, rgba(55,45,140,0.35) 30%, rgba(20,20,45,0) 68%)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: 170, height: 170,
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle at 50% 48%, rgba(100,85,220,0.4) 0%, rgba(60,50,160,0.2) 50%, transparent 75%)",
        }}
      />
      <svg width="130" height="148" viewBox="0 0 130 148" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="57" y="108" width="16" height="32" rx="5" fill="#2A2360" />
        <ellipse cx="65" cy="82" rx="42" ry="36" fill="#252060" />
        <circle cx="28" cy="80" r="24" fill="#252060" />
        <circle cx="102" cy="80" r="22" fill="#252060" />
        <ellipse cx="65" cy="72" rx="36" ry="32" fill="#302880" />
        <circle cx="32" cy="74" r="20" fill="#302878" />
        <circle cx="98" cy="74" r="18" fill="#302878" />
        <ellipse cx="65" cy="62" rx="30" ry="28" fill="#3D3598" />
        <circle cx="40" cy="65" r="18" fill="#3A3290" />
        <circle cx="90" cy="65" r="16" fill="#3A3290" />
        <circle cx="65" cy="48" r="22" fill="#4840A8" />
        <circle cx="65" cy="52" r="16" fill="#5850BC" opacity="0.7" />
        <circle cx="58" cy="46" r="10" fill="#6A60CC" opacity="0.5" />
        <circle cx="52" cy="52" r="1.8" fill="white" opacity="0.9" />
        <circle cx="72" cy="44" r="1.2" fill="white" opacity="0.8" />
        <circle cx="82" cy="58" r="1.5" fill="white" opacity="0.7" />
        <circle cx="44" cy="68" r="1"   fill="white" opacity="0.6" />
        <circle cx="88" cy="70" r="1.2" fill="white" opacity="0.65" />
        <circle cx="60" cy="38" r="1"   fill="white" opacity="0.75" />
        <circle cx="75" cy="68" r="1"   fill="white" opacity="0.5" />
        <circle cx="35" cy="76" r="1"   fill="white" opacity="0.5" />
        <circle cx="94" cy="78" r="0.8" fill="white" opacity="0.55" />
      </svg>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const [levelRow, setLevelRow] = useState<LevelRow | null>(null);
  const [recentXP, setRecentXP] = useState<XPRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const [levelRes, xpRes] = await Promise.all([
        supabase
          .from("user_levels")
          .select("total_xp, current_level, current_streak, longest_streak")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_xp")
          .select("id, action_type, xp_earned, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      setLevelRow(levelRes.data ?? null);
      setRecentXP(xpRes.data ?? []);
      setLoading(false);
    })();
  }, [router]);

  const totalXP = levelRow?.total_xp ?? 0;
  const { level: currentLevel, name: currentLevelName } = getLevelForXP(totalXP);
  const nextLevelData = getNextLevel(currentLevel);
  const currentLevelData = LEVELS.find((l) => l.level === currentLevel)!;

  const progressPct = nextLevelData
    ? Math.min(100, ((totalXP - currentLevelData.minXP) / (nextLevelData.minXP - currentLevelData.minXP)) * 100)
    : 100;

  const xpToNext = nextLevelData ? nextLevelData.minXP - totalXP : 0;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-5 h-5 rounded-full border-2 animate-spin border-accent border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pb-12 max-w-lg mx-auto">

        {/* ── Header ── */}
        <div className="px-4 pt-5 pb-0">
          <h1 className="font-serif font-normal text-text-primary leading-tight" style={{ fontSize: 26 }}>
            Ma progression
          </h1>
          <p className="mt-1 font-sans text-text-secondary uppercase tracking-widest" style={{ fontSize: 11 }}>
            Ton chemin spirituel
          </p>
        </div>

        {/* ── Hero: tree + level ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center pt-2 pb-4"
        >
          <TreeIllustration />

          <p
            className="mt-1 font-serif text-text-primary"
            style={{ fontStyle: "italic", fontSize: 36, lineHeight: 1 }}
          >
            {currentLevelName}
          </p>

          <div
            className="mt-3 rounded-full overflow-hidden bg-accent/20"
            style={{ width: 160, height: 2 }}
          >
            <div
              className="h-full rounded-full bg-accent transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {nextLevelData ? (
            <p className="mt-2 font-sans text-accent uppercase tracking-widest" style={{ fontSize: 11 }}>
              {xpToNext.toLocaleString("fr-FR")} XP pour atteindre {nextLevelData.name}
            </p>
          ) : (
            <p className="mt-2 font-sans text-accent uppercase tracking-widest" style={{ fontSize: 11 }}>
              Niveau maximum atteint
            </p>
          )}
        </motion.div>

        {/* ── 4 metric cards ── */}
        <div className="grid grid-cols-2 gap-3 px-4 mb-5">
          {[
            { label: "XP Total", value: totalXP.toLocaleString("fr-FR") },
            { label: "Niveau",   value: String(currentLevel) },
            { label: "Streak",   value: `${levelRow?.current_streak ?? 0} jours` },
            { label: "Record",   value: `${levelRow?.longest_streak ?? 0} jours` },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="p-4 bg-bg-secondary rounded-2xl"
              style={{ border: "0.5px solid rgb(var(--separator))" }}
            >
              <p
                className="mb-2 font-sans text-text-secondary uppercase"
                style={{ fontSize: 10, letterSpacing: "0.12em" }}
              >
                {card.label}
              </p>
              <p className="font-serif font-normal text-text-primary" style={{ fontSize: 24, lineHeight: 1.15 }}>
                {card.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Activité récente ── */}
        <div className="px-4 mb-5">
          <p
            className="mb-3 font-sans text-text-secondary uppercase"
            style={{ fontSize: 10, letterSpacing: "0.12em" }}
          >
            Activité récente
          </p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18 }}
            className="bg-bg-secondary rounded-2xl overflow-hidden"
            style={{ border: "0.5px solid rgb(var(--separator))" }}
          >
            {recentXP.length === 0 ? (
              <p className="px-4 py-5 font-sans text-text-secondary" style={{ fontSize: 13 }}>
                Aucune activité pour l&apos;instant. Commence par lire la Bible ou prier !
              </p>
            ) : (
              <div>
                {recentXP.map((row, idx) => {
                  const meta = ACTION_META[row.action_type] ?? { label: row.action_type, Icon: Zap };
                  const Icon = meta.Icon;
                  return (
                    <div
                      key={row.id}
                      className="flex items-center gap-3 px-4 py-3.5"
                      style={idx > 0 ? { borderTop: "0.5px solid rgb(var(--separator))" } : undefined}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10">
                        <Icon size={16} className="text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-sans text-text-primary" style={{ fontSize: 13 }}>
                          {meta.label}
                        </p>
                        <p className="mt-0.5 font-sans text-text-secondary" style={{ fontSize: 11 }}>
                          {formatDateTime(row.created_at)}
                        </p>
                      </div>
                      <span className="shrink-0 font-sans text-accent font-medium" style={{ fontSize: 13 }}>
                        +{row.xp_earned} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Ton chemin ── */}
        <div className="px-4">
          <p
            className="mb-3 font-sans text-text-secondary uppercase"
            style={{ fontSize: 10, letterSpacing: "0.12em" }}
          >
            Ton chemin
          </p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.22 }}
            className="bg-bg-secondary rounded-2xl overflow-hidden"
            style={{ border: "0.5px solid rgb(var(--separator))" }}
          >
            {LEVELS.map((lvl, idx) => {
              const reached = totalXP >= lvl.minXP;
              const isCurrent = lvl.level === currentLevel;
              return (
                <div
                  key={lvl.level}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{
                    borderTop: idx > 0 ? "0.5px solid rgb(var(--separator))" : undefined,
                    borderLeft: isCurrent ? "2px solid rgb(var(--accent))" : "2px solid transparent",
                  }}
                >
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: reached ? "rgb(var(--accent))" : "rgb(var(--bg-tertiary))",
                      border: reached ? "none" : "1.5px solid rgb(var(--separator))",
                    }}
                  >
                    {reached && !isCurrent && <Check size={12} color="white" strokeWidth={2.5} />}
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  <p
                    className="flex-1 font-sans"
                    style={{
                      fontSize: 15,
                      color: isCurrent
                        ? "rgb(var(--accent))"
                        : reached
                        ? "rgb(var(--text-primary))"
                        : "rgb(var(--text-tertiary))",
                    }}
                  >
                    {lvl.name}
                  </p>

                  {isCurrent && (
                    <p
                      className="font-sans text-accent font-semibold uppercase"
                      style={{ fontSize: 11, letterSpacing: "0.1em" }}
                    >
                      Niveau actuel
                    </p>
                  )}
                  {reached && !isCurrent && (
                    <p className="font-sans text-text-secondary" style={{ fontSize: 12 }}>
                      Atteint
                    </p>
                  )}
                  {!reached && (
                    <p className="font-sans text-text-tertiary" style={{ fontSize: 12 }}>
                      {lvl.minXP.toLocaleString("fr-FR")} XP
                    </p>
                  )}
                </div>
              );
            })}
          </motion.div>
        </div>

      </div>
    </AppShell>
  );
}
