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

// ── Tree illustration ────────────────────────────────────────
function TreeIllustration() {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
      {/* Outer glow */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 52%, rgba(90,75,200,0.55) 0%, rgba(55,45,140,0.35) 30%, rgba(20,20,45,0) 68%)",
        }}
      />
      {/* Inner halo ring */}
      <div
        className="absolute rounded-full"
        style={{
          width: 170,
          height: 170,
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          background:
            "radial-gradient(circle at 50% 48%, rgba(100,85,220,0.4) 0%, rgba(60,50,160,0.2) 50%, transparent 75%)",
        }}
      />
      <svg width="130" height="148" viewBox="0 0 130 148" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Trunk */}
        <rect x="57" y="108" width="16" height="32" rx="5" fill="#2A2360" />
        {/* Canopy base layer */}
        <ellipse cx="65" cy="82" rx="42" ry="36" fill="#252060" />
        {/* Side lobes */}
        <circle cx="28" cy="80" r="24" fill="#252060" />
        <circle cx="102" cy="80" r="22" fill="#252060" />
        {/* Mid layer */}
        <ellipse cx="65" cy="72" rx="36" ry="32" fill="#302880" />
        <circle cx="32" cy="74" r="20" fill="#302878" />
        <circle cx="98" cy="74" r="18" fill="#302878" />
        {/* Top layer */}
        <ellipse cx="65" cy="62" rx="30" ry="28" fill="#3D3598" />
        <circle cx="40" cy="65" r="18" fill="#3A3290" />
        <circle cx="90" cy="65" r="16" fill="#3A3290" />
        <circle cx="65" cy="48" r="22" fill="#4840A8" />
        {/* Highlight core */}
        <circle cx="65" cy="52" r="16" fill="#5850BC" opacity="0.7" />
        <circle cx="58" cy="46" r="10" fill="#6A60CC" opacity="0.5" />
        {/* Stars */}
        <circle cx="52" cy="52" r="1.8" fill="white" opacity="0.9" />
        <circle cx="72" cy="44" r="1.2" fill="white" opacity="0.8" />
        <circle cx="82" cy="58" r="1.5" fill="white" opacity="0.7" />
        <circle cx="44" cy="68" r="1" fill="white" opacity="0.6" />
        <circle cx="88" cy="70" r="1.2" fill="white" opacity="0.65" />
        <circle cx="60" cy="38" r="1" fill="white" opacity="0.75" />
        <circle cx="75" cy="68" r="1" fill="white" opacity="0.5" />
        <circle cx="35" cy="76" r="1" fill="white" opacity="0.5" />
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

  // ── Derived values ────────────────────────────────────────
  const totalXP = levelRow?.total_xp ?? 0;
  const { level: currentLevel, name: currentLevelName } = getLevelForXP(totalXP);
  const nextLevelData = getNextLevel(currentLevel);
  const currentLevelData = LEVELS.find((l) => l.level === currentLevel)!;

  const progressPct = nextLevelData
    ? Math.min(
        100,
        ((totalXP - currentLevelData.minXP) / (nextLevelData.minXP - currentLevelData.minXP)) * 100,
      )
    : 100;

  const xpToNext = nextLevelData ? nextLevelData.minXP - totalXP : 0;

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div
            className="w-5 h-5 rounded-full border-2 animate-spin"
            style={{ borderColor: "#7B6FD4", borderTopColor: "transparent" }}
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="pb-12 max-w-lg mx-auto">

        {/* ── Header ── */}
        <div className="px-4 pt-5 pb-0">
          <h1
            style={{ fontFamily: "var(--font-serif)", color: "#E8E8E8", fontSize: 26 }}
            className="font-normal leading-tight"
          >
            Ma progression
          </h1>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              color: "#666666",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
            className="mt-1"
          >
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
            style={{
              fontFamily: "var(--font-serif)",
              fontStyle: "italic",
              color: "#E8E8E8",
              fontSize: 36,
              lineHeight: 1,
            }}
            className="mt-1"
          >
            {currentLevelName}
          </p>

          {/* Progress bar */}
          <div
            className="mt-3 rounded-full overflow-hidden"
            style={{ width: 160, height: 2, background: "rgba(123,111,212,0.2)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%`, background: "#7B6FD4" }}
            />
          </div>

          {nextLevelData ? (
            <p
              style={{
                fontFamily: "var(--font-sans)",
                color: "#7B6FD4",
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
              className="mt-2"
            >
              {xpToNext.toLocaleString("fr-FR")} XP pour atteindre {nextLevelData.name}
            </p>
          ) : (
            <p
              style={{ fontFamily: "var(--font-sans)", color: "#7B6FD4", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em" }}
              className="mt-2"
            >
              Niveau maximum atteint
            </p>
          )}
        </motion.div>

        {/* ── 4 metric cards ── */}
        <div className="grid grid-cols-2 gap-3 px-4 mb-5">
          {[
            { label: "XP Total",        value: totalXP.toLocaleString("fr-FR") },
            { label: "Niveau",          value: String(currentLevel) },
            { label: "Streak",          value: `${levelRow?.current_streak ?? 0} jours` },
            { label: "Record",          value: `${levelRow?.longest_streak ?? 0} jours` },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="p-4"
              style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a", borderRadius: 16 }}
            >
              <p
                style={{
                  fontFamily: "var(--font-sans)",
                  color: "#666666",
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
                className="mb-2"
              >
                {card.label}
              </p>
              <p
                style={{ fontFamily: "var(--font-serif)", color: "#E8E8E8", fontSize: 24, lineHeight: 1.15 }}
                className="font-normal"
              >
                {card.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ── Activité récente ── */}
        <div className="px-4 mb-5">
          <p
            style={{
              fontFamily: "var(--font-sans)",
              color: "#666666",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
            className="mb-3"
          >
            Activité récente
          </p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18 }}
            style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a", borderRadius: 16, overflow: "hidden" }}
          >
            {recentXP.length === 0 ? (
              <p
                style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 13 }}
                className="px-4 py-5"
              >
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
                      style={idx > 0 ? { borderTop: "0.5px solid #2a2a2a" } : undefined}
                    >
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                        style={{ background: "rgba(123,111,212,0.12)" }}
                      >
                        <Icon size={16} style={{ color: "#7B6FD4" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          style={{ fontFamily: "var(--font-sans)", color: "#E8E8E8", fontSize: 13 }}
                          className="truncate"
                        >
                          {meta.label}
                        </p>
                        <p style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 11 }} className="mt-0.5">
                          {formatDateTime(row.created_at)}
                        </p>
                      </div>
                      <span
                        style={{ fontFamily: "var(--font-sans)", color: "#7B6FD4", fontSize: 13, fontWeight: 500 }}
                        className="shrink-0"
                      >
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
            style={{
              fontFamily: "var(--font-sans)",
              color: "#666666",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
            className="mb-3"
          >
            Ton chemin
          </p>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.22 }}
            style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a", borderRadius: 16, overflow: "hidden" }}
          >
            {LEVELS.map((lvl, idx) => {
              const reached = totalXP >= lvl.minXP;
              const isCurrent = lvl.level === currentLevel;
              return (
                <div
                  key={lvl.level}
                  className="flex items-center gap-3 px-4 py-3.5"
                  style={{
                    borderTop: idx > 0 ? "0.5px solid #2a2a2a" : undefined,
                    borderLeft: isCurrent ? "2px solid #7B6FD4" : "2px solid transparent",
                  }}
                >
                  {/* Indicator circle */}
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{
                      background: reached ? "#7B6FD4" : "#222222",
                      border: reached ? "none" : "1.5px solid #333333",
                    }}
                  >
                    {reached && !isCurrent && <Check size={12} color="white" strokeWidth={2.5} />}
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>

                  {/* Level name */}
                  <p
                    style={{
                      fontFamily: "var(--font-sans)",
                      color: isCurrent ? "#7B6FD4" : reached ? "#E8E8E8" : "#3a3a3a",
                      fontSize: 15,
                    }}
                    className="flex-1"
                  >
                    {lvl.name}
                  </p>

                  {/* Right label */}
                  {isCurrent && (
                    <p
                      style={{
                        fontFamily: "var(--font-sans)",
                        color: "#7B6FD4",
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        fontWeight: 600,
                      }}
                    >
                      Niveau actuel
                    </p>
                  )}
                  {reached && !isCurrent && (
                    <p style={{ fontFamily: "var(--font-sans)", color: "#666666", fontSize: 12 }}>
                      Atteint
                    </p>
                  )}
                  {!reached && (
                    <p style={{ fontFamily: "var(--font-sans)", color: "#3a3a3a", fontSize: 12 }}>
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
