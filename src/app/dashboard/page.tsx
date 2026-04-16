"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Check, BookOpen, Timer, Highlighter, MessageSquare, Heart, Star, Zap, Flame } from "lucide-react";
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
  LECTURE_DAY_COMPLETED:    { label: "Jour de lecture complété",     Icon: BookOpen      },
  PRAYER_TIMER_COMPLETED:   { label: "Session de prière terminée",   Icon: Timer         },
  VERSE_ANNOTATED:          { label: "Verset annoté",                Icon: Highlighter   },
  COMMUNITY_POST_PUBLISHED: { label: "Publication dans la communauté", Icon: MessageSquare },
  COMMUNITY_AMEN_RECEIVED:  { label: "Amen reçu",                    Icon: Heart         },
  PRAYER_ANSWERED_LOGGED:   { label: "Prière exaucée enregistrée",   Icon: Star          },
  STREAK_7_DAYS:            { label: "Bonus – 7 jours de suite",     Icon: Zap           },
  STREAK_30_DAYS:           { label: "Bonus – 30 jours de suite",    Icon: Flame         },
  ONBOARDING_COMPLETED:     { label: "Profil complété",              Icon: Check         },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  // ── Derived values ────────────────────────────────────────
  const totalXP = levelRow?.total_xp ?? 0;
  const { level: currentLevel, name: currentLevelName } = getLevelForXP(totalXP);
  const nextLevelData = getNextLevel(currentLevel);
  const currentLevelData = LEVELS.find((l) => l.level === currentLevel)!;

  const progressPct = nextLevelData
    ? Math.min(
        100,
        ((totalXP - currentLevelData.minXP) /
          (nextLevelData.minXP - currentLevelData.minXP)) *
          100,
      )
    : 100;

  const xpToNext = nextLevelData ? nextLevelData.minXP - totalXP : 0;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#7B6FD4", borderTopColor: "transparent" }} />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 pb-10 pt-4 max-w-lg mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
            aria-label="Retour"
          >
            <ChevronLeft size={18} style={{ color: "#E8E8E8" }} />
          </button>
          <div>
            <h1
              style={{ fontFamily: "var(--font-serif)", color: "#E8E8E8", fontSize: 22 }}
              className="font-normal leading-tight"
            >
              Ma progression
            </h1>
            <p style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 13 }} className="mt-0.5">
              Ton chemin spirituel
            </p>
          </div>
        </div>

        {/* ── Current level card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-4 p-5"
          style={{
            background: "#1a1830",
            border: "0.5px solid rgba(123,111,212,0.5)",
            borderRadius: 16,
          }}
        >
          <p style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em" }} className="mb-1">
            Niveau actuel
          </p>
          <p
            style={{ fontFamily: "var(--font-serif)", color: "#E8E8E8", fontSize: 24 }}
            className="font-normal leading-tight"
          >
            {currentLevelName}
          </p>
          <p style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 13 }} className="mt-1">
            {totalXP.toLocaleString("fr-FR")} XP total
          </p>

          {/* Progress bar */}
          <div className="mt-4 mb-2 w-full rounded-full overflow-hidden" style={{ height: 3, background: "#2a2a2a" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: "#7B6FD4" }}
            />
          </div>

          {nextLevelData ? (
            <p style={{ fontFamily: "var(--font-sans)", color: "#7B6FD4", fontSize: 11 }}>
              {xpToNext.toLocaleString("fr-FR")} XP pour atteindre {nextLevelData.name}
            </p>
          ) : (
            <p style={{ fontFamily: "var(--font-sans)", color: "#7B6FD4", fontSize: 11 }}>
              Niveau maximum atteint
            </p>
          )}
        </motion.div>

        {/* ── 4 metric cards ── */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "XP Total",       value: totalXP.toLocaleString("fr-FR") },
            { label: "Niveau",         value: `${currentLevel} — ${currentLevelName}` },
            { label: "Streak actuel",  value: `${levelRow?.current_streak ?? 0}j` },
            { label: "Meilleur streak", value: `${levelRow?.longest_streak ?? 0}j` },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="p-4"
              style={{
                background: "#1c1c1c",
                border: "0.5px solid #2a2a2a",
                borderRadius: 16,
              }}
            >
              <p style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }} className="mb-2">
                {card.label}
              </p>
              <p
                style={{ fontFamily: "var(--font-serif)", color: "#E8E8E8", fontSize: 22, lineHeight: 1.2 }}
                className="font-normal"
              >
                {card.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Recent activity ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="mb-4"
          style={{
            background: "#1c1c1c",
            border: "0.5px solid #2a2a2a",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div className="px-4 pt-4 pb-2">
            <p
              style={{ fontFamily: "var(--font-serif)", color: "#E8E8E8", fontSize: 16 }}
              className="font-normal"
            >
              Activité récente
            </p>
          </div>

          {recentXP.length === 0 ? (
            <p style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 13 }} className="px-4 pb-4">
              Aucune activité pour l&apos;instant. Commence par lire la Bible ou prier !
            </p>
          ) : (
            <div className="divide-y" style={{ borderColor: "#2a2a2a" }}>
              {recentXP.map((row) => {
                const meta = ACTION_META[row.action_type] ?? {
                  label: row.action_type,
                  Icon: Zap,
                };
                const Icon = meta.Icon;
                return (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                      style={{ background: "rgba(123,111,212,0.1)" }}
                    >
                      <Icon size={15} style={{ color: "#7B6FD4" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontFamily: "var(--font-sans)", color: "#E8E8E8", fontSize: 13 }} className="truncate">
                        {meta.label}
                      </p>
                      <p style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 11 }}>
                        {formatDate(row.created_at)}
                      </p>
                    </div>
                    <span
                      style={{ fontFamily: "var(--font-sans)", color: "#7B6FD4", fontSize: 13 }}
                      className="shrink-0 font-medium"
                    >
                      +{row.xp_earned}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ── Level milestones ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
          style={{
            background: "#1c1c1c",
            border: "0.5px solid #2a2a2a",
            borderRadius: 16,
            overflow: "hidden",
          }}
        >
          <div className="px-4 pt-4 pb-2">
            <p
              style={{ fontFamily: "var(--font-serif)", color: "#E8E8E8", fontSize: 16 }}
              className="font-normal"
            >
              Paliers débloqués
            </p>
          </div>
          <div className="divide-y" style={{ borderColor: "#2a2a2a" }}>
            {LEVELS.map((lvl) => {
              const reached = totalXP >= lvl.minXP;
              const isCurrent = lvl.level === currentLevel;
              return (
                <div
                  key={lvl.level}
                  className="flex items-center gap-3 px-4 py-3"
                  style={{ opacity: reached ? 1 : 0.45 }}
                >
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: reached ? "rgba(123,111,212,0.15)" : "#2a2a2a",
                    }}
                  >
                    {reached ? (
                      <Check size={13} style={{ color: "#7B6FD4" }} />
                    ) : (
                      <span style={{ color: "#666666", fontSize: 11, fontFamily: "var(--font-sans)" }}>
                        {lvl.level}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        color: isCurrent ? "#7B6FD4" : "#E8E8E8",
                        fontSize: 14,
                      }}
                    >
                      {lvl.name}
                      {isCurrent && (
                        <span style={{ color: "#666666", fontSize: 11 }} className="ml-2">
                          actuel
                        </span>
                      )}
                    </p>
                  </div>
                  <p style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 11 }}>
                    {lvl.minXP === 0 ? "0" : lvl.minXP.toLocaleString("fr-FR")} XP
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </AppShell>
  );
}
