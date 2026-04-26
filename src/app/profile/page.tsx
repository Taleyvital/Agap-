"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Camera,
  Check,
  ChevronRight,
  Crown,
  Eye,
  EyeOff,
  FileText,
  Flame,
  HelpCircle,
  KeyRound,
  Loader2,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Settings,
  Shield,
  Sun,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { AppShell } from "@/components/layout/AppShell";
import { PremiumPaywall } from "@/components/ui/PremiumPaywall";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import Image from "next/image";
import { useRef } from "react";
import { useLanguage, LANGUAGE_OPTIONS, type AppLanguage } from "@/lib/i18n";
import { getFlameColorHex } from "@/lib/flames";

interface Profile {
  first_name: string | null;
  anonymous_name: string | null;
  created_at: string | null;
  avatar_url: string | null;
  verse_font_size: number | null;
  verse_bold: boolean | null;
  verse_font_family: string | null;
  verse_letter_spacing: number | null;
  app_language: string | null;
  is_admin: boolean | null;
}

const FONT_OPTIONS = [
  { value: "var(--font-serif)", label: "Classique" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "var(--font-sans)", label: "Moderne" },
  { value: "'Times New Roman', serif", label: "Times" },
];


function stagger(i: number) {
  return { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.3 } };
}

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [versesRead, setVersesRead] = useState(0);
  const [activePlan, setActivePlan] = useState<{ title: string; currentDay: number; totalDays: number; planId: string } | null>(null);
  const [topFlames, setTopFlames] = useState<{ userId: string; firstName: string; streakCount: number }[]>([]);
  const [initial, setInitial] = useState("");
  const [since, setSince] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [themeSheetOpen, setThemeSheetOpen]     = useState(false);
  const [pwSheetOpen, setPwSheetOpen]           = useState(false);
  const [pwCurrent, setPwCurrent]               = useState("");
  const [pwNew, setPwNew]                       = useState("");
  const [pwConfirm, setPwConfirm]               = useState("");
  const [pwShowCurrent, setPwShowCurrent]       = useState(false);
  const [pwShowNew, setPwShowNew]               = useState(false);
  const [pwLoading, setPwLoading]               = useState(false);
  const [pwError, setPwError]                   = useState("");
  const [pwSuccess, setPwSuccess]               = useState(false);
  const [verseFontSize, setVerseFontSize] = useState(16);
  const [verseBold, setVerseBold] = useState(false);
  const [verseFontFamily, setVerseFontFamily] = useState("var(--font-serif)");
  const [verseLetterSpacing, setVerseLetterSpacing] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const MENU_SECTIONS = [
    {
      title: t("profile_section_contents"),
      items: [
        { href: "/dashboard", label: t("profile_item_progress"), Icon: Zap },
        { href: "/profile/posts", label: t("profile_item_posts"), Icon: FileText },
        { href: "/profile/saved-verses", label: t("profile_item_saved_verses"), Icon: BookOpen },
        { href: "/profile/chat-history", label: t("profile_item_chat_history"), Icon: MessageCircle },
        { href: "/profile/prayer-journal", label: t("profile_item_prayer_journal"), Icon: Flame },
      ],
    },
    {
      title: t("profile_section_preferences"),
      items: [
        { href: "/home", label: t("profile_item_notifications"), Icon: Bell },
        { href: "/home", label: t("profile_item_privacy"), Icon: Shield },
        { href: "/home", label: t("profile_item_help"), Icon: HelpCircle },
      ],
    },
  ];

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      const { data } = await supabase
        .from("profiles")
        .select("first_name, anonymous_name, created_at, avatar_url, verse_font_size, verse_bold, verse_font_family, verse_letter_spacing, app_language, is_admin")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data);
        setInitial((data.first_name ?? data.anonymous_name ?? "A").charAt(0).toUpperCase());
        setVerseFontSize(data.verse_font_size ?? 16);
        setVerseBold(data.verse_bold ?? false);
        if (data.verse_font_family) setVerseFontFamily(data.verse_font_family);
        if (data.verse_letter_spacing !== null) setVerseLetterSpacing(Number(data.verse_letter_spacing));
        if (data.app_language) setLanguage(data.app_language as AppLanguage);
        if (data.created_at) {
          setSince(
            new Date(data.created_at).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            }),
          );
        }
      }

      // Fetch real stats in parallel
      const [prayerRes, levelRes, versesRes] = await Promise.all([
        supabase
          .from("prayer_requests")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("exaucee", true),
        supabase
          .from("user_levels")
          .select("current_streak")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_xp")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("action_type", "VERSE_ANNOTATED"),
      ]);
      if (prayerRes.count !== null) setAnsweredCount(prayerRes.count);
      if (levelRes.data) setStreak(levelRes.data.current_streak ?? 0);
      if (versesRes.count !== null) setVersesRead(versesRes.count);

      // Fetch active reading plan progress
      try {
        const { data: progressData } = await supabase
          .from("user_plan_progress")
          .select("plan_id, current_day, completed_days, reading_plans(title, total_days)")
          .eq("user_id", user.id)
          .order("last_read_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (progressData) {
          const plan = (Array.isArray(progressData.reading_plans) ? progressData.reading_plans[0] : progressData.reading_plans) as { title: string; total_days: number } | null;
          if (plan) {
            setActivePlan({
              title: plan.title,
              currentDay: progressData.current_day,
              totalDays: plan.total_days,
              planId: progressData.plan_id,
            });
          }
        }
      } catch {
        // table may not exist yet
      }

      // Fetch top 3 active flame streaks
      try {
        const { data: streaksData } = await supabase
          .from("verse_streaks")
          .select("user_a, user_b, streak_count")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
          .order("streak_count", { ascending: false })
          .limit(3);

        if (streaksData && streaksData.length > 0) {
          const otherIds = streaksData.map((s) =>
            s.user_a === user.id ? s.user_b : s.user_a,
          );
          const { data: flameProfiles } = await supabase
            .from("user_profiles_public")
            .select("user_id, first_name")
            .in("user_id", otherIds);

          const profileMap = new Map(
            (flameProfiles ?? []).map((p) => [p.user_id as string, p.first_name as string]),
          );
          setTopFlames(
            streaksData.map((s) => {
              const otherId = s.user_a === user.id ? s.user_b : s.user_a;
              return {
                userId: otherId as string,
                firstName: profileMap.get(otherId as string) ?? "…",
                streakCount: s.streak_count as number,
              };
            }),
          );
        }
      } catch {
        // table may not exist yet
      }
    })();
  }, []);

  const displayName = profile?.first_name ?? profile?.anonymous_name ?? "Anonyme";

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const supabase = createSupabaseBrowserClient();

      // 1. Upload file — path is relative inside the "avatars" bucket
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // 3. Update profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // 4. Update local state
      setProfile((prev) => prev ? { ...prev, avatar_url: publicUrl } : null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Error uploading avatar:", msg);
      alert("Erreur : " + msg);
    } finally {
      setUploading(false);
    }
  };

  const saveVerseSettings = useCallback(async () => {
    if (!user) return;
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase
        .from("profiles")
        .update({
          verse_font_size: verseFontSize,
          verse_bold: verseBold,
          verse_font_family: verseFontFamily,
          verse_letter_spacing: verseLetterSpacing,
        })
        .eq("id", user.id);
    } catch (error) {
      console.error("Error saving verse settings:", error);
    }
  }, [user, verseFontSize, verseBold, verseFontFamily, verseLetterSpacing]);

  const saveLanguage = useCallback(async (lang: AppLanguage) => {
    if (!user) return;
    setLanguage(lang);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.from("profiles").update({ app_language: lang }).eq("id", user.id);
    } catch (error) {
      console.error("Error saving language:", error);
    }
  }, [user, setLanguage]);

  useEffect(() => {
    saveVerseSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verseFontSize, verseBold, verseFontFamily, verseLetterSpacing]);

  const openPwSheet = () => {
    setPwCurrent(""); setPwNew(""); setPwConfirm("");
    setPwError(""); setPwSuccess(false);
    setPwSheetOpen(true);
  };

  const changePassword = async () => {
    setPwError("");
    if (pwNew.length < 8) { setPwError("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (pwNew !== pwConfirm) { setPwError("Les mots de passe ne correspondent pas."); return; }

    setPwLoading(true);
    const supabase = createSupabaseBrowserClient();

    // Verify current password via re-auth
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const email = authUser?.email ?? "";
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: pwCurrent });
    if (signInErr) { setPwError("Mot de passe actuel incorrect."); setPwLoading(false); return; }

    // Update password
    const { error: updateErr } = await supabase.auth.updateUser({ password: pwNew });
    setPwLoading(false);
    if (updateErr) { setPwError(updateErr.message); return; }
    setPwSuccess(true);
    setTimeout(() => setPwSheetOpen(false), 1800);
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-32">

        {/* ── Header ────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-text-tertiary">
            {t("profile_title")}
          </p>
          <button
            type="button"
            onClick={() => setThemeSheetOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-separator bg-bg-secondary text-text-secondary transition-colors hover:text-text-primary hover:border-text-tertiary"
            aria-label="Paramètres"
          >
            <Settings className="h-4 w-4" />
          </button>
        </header>

        {/* ── Avatar + Identity ─────────────────────── */}
        <motion.div {...stagger(0)} className="mt-8 flex flex-col items-center">
          {/* Avatar container */}
          <div className="relative group overflow-visible">
            {/* Main Avatar Clickable Area */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-28 w-28 rounded-full transition-all duration-300 active:scale-95 focus:outline-none"
              aria-label="Changer la photo de profil"
            >
              {/* Gradient ring */}
              <div
                className="absolute inset-0 rounded-full animate-pulse-slow shadow-xl shadow-accent/10"
                style={{
                  background: "conic-gradient(from 180deg, #7B6FD4, #9D93E8, #5B5099, #7B6FD4)",
                  padding: "4px",
                }}
              >
                <div className="h-full w-full rounded-full bg-bg-primary" />
              </div>
              
              {/* Avatar content */}
              <div className="absolute inset-[6px] overflow-hidden rounded-full bg-bg-secondary flex items-center justify-center">
                {profile?.avatar_url ? (
                  <Image 
                    src={profile.avatar_url} 
                    alt={displayName} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <span className="font-serif text-4xl italic text-text-primary">{initial}</span>
                )}
                
                {/* Hover overlay (subtle) */}
                <div className={`absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${uploading ? 'opacity-100' : ''}`}>
                  {uploading && <Loader2 className="h-8 w-8 animate-spin text-white" />}
                </div>
              </div>
            </button>

            {/* Camera Trigger Button (Icon) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="absolute bottom-1 right-1 z-20 flex h-9 w-9 items-center justify-center rounded-full border-2 border-bg-primary bg-accent text-white shadow-lg transition-all duration-300 hover:bg-accent-light hover:scale-110 active:scale-90"
              aria-label="Prendre une photo"
            >
              <Camera className="h-4.5 w-4.5" />
            </button>

            {/* Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/*"
              className="hidden"
              aria-hidden="true"
            />
          </div>

          {/* Name */}
          <p className="mt-5 font-serif text-2xl italic text-text-primary">{displayName}</p>

          {/* Since */}
          {since && (
            <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
              {t("profile_member_since")} {since}
            </p>
          )}
        </motion.div>

        {/* ── Stats strip ───────────────────────────── */}
        <motion.div {...stagger(1)} className="mt-8 flex flex-col gap-4">
          <div className="flex divide-x divide-separator overflow-hidden rounded-2xl border border-separator bg-bg-secondary">
            {[
              { value: streak.toString(), label: t("profile_stat_streak") },
              { value: versesRead.toString(), label: t("profile_stat_verses") },
              { value: answeredCount.toString(), label: t("profile_stat_prayers") },
            ].map((s) => (
              <div key={s.label} className="flex flex-1 flex-col items-center py-4">
                <span className="font-serif text-2xl font-semibold text-text-primary">
                  {s.label === "Prières exaucées" ? (
                    <Check className="mr-1 inline-block h-5 w-5 align-[-2px] text-green-600" aria-hidden />
                  ) : null}
                  {s.value}
                </span>
                <span className="mt-0.5 px-1 text-center font-sans text-[9px] uppercase tracking-wider text-text-tertiary leading-tight">{s.label}</span>
              </div>
            ))}
          </div>

          <Link
            href="/prayer"
            className="flex items-center justify-center gap-2 rounded-xl bg-bg-secondary/50 py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] text-accent hover:bg-bg-tertiary transition-colors"
          >
            {t("profile_prayer_history")} <ChevronRight size={12} />
          </Link>
        </motion.div>

        {/* ── Reading progress ──────────────────────── */}
        <motion.div {...stagger(2)} className="mt-5 rounded-2xl border border-separator bg-bg-secondary p-5">
          {activePlan ? (() => {
            const pct = Math.min(100, Math.round((activePlan.currentDay - 1) / activePlan.totalDays * 100));
            return (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                      {t("profile_reading_plan")}
                    </p>
                    <p className="mt-1 font-serif text-lg italic text-text-primary">
                      {activePlan.title}
                    </p>
                    <p className="mt-0.5 font-sans text-xs text-text-secondary">
                      Jour {activePlan.currentDay} / {activePlan.totalDays}
                    </p>
                  </div>
                  <span className="font-serif text-3xl text-accent">{pct}%</span>
                </div>
                <div className="mt-4 h-1.5 w-full rounded-full bg-bg-tertiary">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full bg-accent"
                  />
                </div>
                <Link
                  href={`/reading-plan/${activePlan.planId}`}
                  className="mt-4 inline-block font-sans text-xs uppercase tracking-wider text-accent"
                >
                  {t("profile_reading_resume")} →
                </Link>
              </>
            );
          })() : (
            <>
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                {t("profile_reading_plan")}
              </p>
              <p className="mt-2 font-sans text-sm text-text-secondary">
                Aucun parcours actif pour l&apos;instant.
              </p>
              <Link
                href="/reading-plan"
                className="mt-3 inline-block font-sans text-xs uppercase tracking-wider text-accent"
              >
                Commencer un parcours →
              </Link>
            </>
          )}
        </motion.div>

        {/* ── Mes flammes actives ───────────────────── */}
        {topFlames.length > 0 && (
          <motion.div {...stagger(3)} className="mt-5">
            <p className="mb-2 px-1 font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              Mes flammes actives
            </p>
            <div className="overflow-hidden rounded-2xl border border-separator bg-bg-secondary divide-y divide-separator">
              {topFlames.map((flame) => (
                <Link
                  key={flame.userId}
                  href={`/messages/${flame.userId}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg-tertiary"
                >
                  <span
                    className="text-xl"
                    style={{ filter: flame.streakCount >= 30 ? "drop-shadow(0 0 4px #ffffff88)" : "none" }}
                  >
                    🔥
                  </span>
                  <span className="flex-1 font-sans text-sm text-text-primary">{flame.firstName}</span>
                  <span
                    className="font-sans text-sm font-semibold"
                    style={{ color: getFlameColorHex(flame.streakCount) }}
                  >
                    {flame.streakCount} jour{flame.streakCount > 1 ? "s" : ""}
                  </span>
                  <ChevronRight className="h-4 w-4 text-text-tertiary" />
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Menu sections ─────────────────────────── */}
        {MENU_SECTIONS.map((section, si) => (
          <motion.div key={section.title} {...stagger(4 + si)} className="mt-6">
            <p className="mb-2 px-1 font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              {section.title}
            </p>
            <div className="overflow-hidden rounded-2xl border border-separator bg-bg-secondary divide-y divide-separator">
              {section.items.map(({ href, label, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-bg-tertiary"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bg-tertiary">
                    <Icon className="h-4 w-4 text-text-secondary" />
                  </div>
                  <span className="flex-1 font-sans text-sm text-text-primary">{label}</span>
                  <ChevronRight className="h-4 w-4 text-text-tertiary" />
                </Link>
              ))}
            </div>
          </motion.div>
        ))}

        {/* ── Change password ───────────────────────── */}
        <motion.div {...stagger(5)} className="mt-6">
          <button
            type="button"
            onClick={openPwSheet}
            className="flex w-full items-center gap-3 rounded-2xl border border-separator bg-bg-secondary px-4 py-3.5 transition-colors hover:bg-bg-tertiary"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-bg-tertiary">
              <KeyRound className="h-4 w-4 text-text-secondary" />
            </div>
            <span className="flex-1 text-left font-sans text-sm text-text-primary">Modifier le mot de passe</span>
            <ChevronRight className="h-4 w-4 text-text-tertiary" />
          </button>
        </motion.div>

        {/* ── Premium ───────────────────────────────── */}
        <motion.div {...stagger(6)} className="mt-6">
          <button
            type="button"
            onClick={() => setShowPaywall(true)}
            className="relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-4 py-4"
            style={{ background: "linear-gradient(135deg, #7B6FD4 0%, #5B5099 100%)" }}
          >
            {/* Glow */}
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-xl" />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Crown className="h-4.5 w-4.5 text-white" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-sans text-sm font-semibold text-white">Passer à Premium</p>
              <p className="font-sans text-[11px] text-white/60">Gospel, parcours exclusifs, IA illimitée</p>
            </div>
            <ChevronRight className="h-4 w-4 text-white/60" />
          </button>
        </motion.div>

        {/* ── Sign out ──────────────────────────────── */}
        <motion.div {...stagger(7)} className="mt-3">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 py-3.5 font-sans text-sm text-danger/80 transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            {t("profile_sign_out")}
          </button>
        </motion.div>

        {/* ── Admin links ──────────────────────────── */}
        {profile?.is_admin && (
          <motion.div {...stagger(8)} className="mt-4 flex flex-col gap-2">
            <Link
              href="/admin/gospel"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#7B6FD4]/20 bg-[#7B6FD4]/5 py-3.5 font-sans text-sm text-[#7B6FD4]/80 transition-colors hover:bg-[#7B6FD4]/10"
            >
              <Settings className="h-4 w-4" />
              Dashboard Admin Gospel
            </Link>
            <Link
              href="/admin/reading-plan"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#7B6FD4]/20 bg-[#7B6FD4]/5 py-3.5 font-sans text-sm text-[#7B6FD4]/80 transition-colors hover:bg-[#7B6FD4]/10"
            >
              <BookOpen className="h-4 w-4" />
              Dashboard Admin Plans
            </Link>
          </motion.div>
        )}

        {/* ── App version ───────────────────────────── */}
        <p className="mt-6 text-center font-sans text-[10px] text-text-tertiary/40">
          Agape studio Webey
        </p>

      </div>

      {/* ── Premium Paywall ──────────────────────────── */}
      {showPaywall && <PremiumPaywall onClose={() => setShowPaywall(false)} />}

      {/* ── Settings Bottom Sheet ────────────────────── */}
      <AnimatePresence>
        {themeSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setThemeSheetOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary p-6 shadow-2xl overflow-y-auto"
              style={{ maxHeight: "90vh" }}
            >
              <div className="mb-6 flex items-center justify-between">
                <h2 className="font-serif text-xl italic text-text-primary">{t("settings_title")}</h2>
                <button
                  type="button"
                  onClick={() => setThemeSheetOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                  aria-label={t("close")}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {/* Theme section */}
              <div>
                <p className="mb-3 font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                  {t("settings_appearance")}
                </p>
                <div className="flex gap-3">
                  {[
                    { id: "light", labelKey: "settings_theme_light" as const, Icon: Sun },
                    { id: "dark", labelKey: "settings_theme_dark" as const, Icon: Moon },
                    { id: "system", labelKey: "settings_theme_system" as const, Icon: Monitor },
                  ].map(({ id, labelKey, Icon }) => {
                    const active = mounted && theme === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setTheme(id)}
                        className={`flex flex-1 flex-col items-center gap-2.5 rounded-2xl border px-2 py-4 transition-all ${
                          active
                            ? "border-accent bg-accent/10 text-accent shadow-sm shadow-accent/20"
                            : "border-separator bg-bg-tertiary text-text-secondary hover:border-text-tertiary hover:text-text-primary"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="font-sans text-[10px] font-medium uppercase tracking-wider">
                          {t(labelKey)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Language section */}
              <div className="mt-6">
                <p className="mb-3 font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                  {t("settings_language")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const active = language === opt.code;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => void saveLanguage(opt.code)}
                        className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 transition-all ${
                          active
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-separator bg-bg-tertiary text-text-secondary hover:text-text-primary"
                        }`}
                      >
                        <span className="text-base leading-none">{opt.flag}</span>
                        <span className="font-sans text-xs font-medium">{opt.label}</span>
                        {active && <Check className="ml-auto h-3.5 w-3.5 text-accent shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Verse reading settings */}
              <div className="mt-6">
                <p className="mb-3 font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                  {t("settings_verse_reading")}
                </p>

                {/* Font size */}
                <div className="mb-4">
                  <p className="mb-2 font-sans text-xs text-text-secondary">{t("settings_font_size")}</p>
                  <div className="flex items-center gap-3">
                    <span className="font-serif text-xs text-text-tertiary select-none">A</span>
                    <input
                      type="range"
                      min={13}
                      max={22}
                      step={1}
                      value={verseFontSize}
                      onChange={(e) => setVerseFontSize(Number(e.target.value))}
                      className="flex-1 h-1 appearance-none rounded-full bg-bg-tertiary accent-accent cursor-pointer"
                      aria-label="Taille de la police des versets"
                    />
                    <span
                      className="font-serif text-text-tertiary select-none transition-all duration-200"
                      style={{ fontSize: `${verseFontSize}px` }}
                    >
                      A
                    </span>
                  </div>
                  <p className="mt-1 text-center font-sans text-[10px] text-text-tertiary">
                    {verseFontSize}px
                  </p>
                </div>

                {/* Font family */}
                <div className="mb-4">
                  <p className="mb-2 font-sans text-xs text-text-secondary">{t("settings_font_family")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {FONT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setVerseFontFamily(opt.value)}
                        className={`rounded-xl border px-3 py-2.5 text-sm transition-all ${
                          verseFontFamily === opt.value
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-separator bg-bg-tertiary text-text-secondary hover:text-text-primary"
                        }`}
                        style={{ fontFamily: opt.value }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Letter spacing */}
                <div className="mb-4">
                  <p className="mb-2 font-sans text-xs text-text-secondary">{t("settings_letter_spacing")}</p>
                  <div className="flex items-center gap-3">
                    <span className="font-sans text-xs text-text-tertiary select-none" style={{ letterSpacing: "0em" }}>Aa</span>
                    <input
                      type="range"
                      min={0}
                      max={0.12}
                      step={0.02}
                      value={verseLetterSpacing}
                      onChange={(e) => setVerseLetterSpacing(Number(e.target.value))}
                      className="flex-1 h-1 appearance-none rounded-full bg-bg-tertiary accent-accent cursor-pointer"
                      aria-label="Espacement des lettres"
                    />
                    <span className="font-sans text-xs text-text-tertiary select-none" style={{ letterSpacing: "0.12em" }}>Aa</span>
                  </div>
                  <p className="mt-1 text-center font-sans text-[10px] text-text-tertiary">
                    {verseLetterSpacing === 0 ? t("spacing_tight") : verseLetterSpacing <= 0.04 ? t("spacing_normal") : verseLetterSpacing <= 0.08 ? t("spacing_wide") : t("spacing_wider")}
                  </p>
                </div>

                {/* Bold toggle */}
                <div className="flex items-center justify-between rounded-xl border border-separator bg-bg-tertiary px-4 py-3">
                  <span className="font-sans text-sm text-text-primary">{t("settings_bold")}</span>
                  <button
                    type="button"
                    onClick={() => setVerseBold(!verseBold)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      verseBold ? "bg-accent" : "bg-separator"
                    }`}
                    aria-label="Activer le texte en gras"
                  >
                    <span
                      className={`absolute left-0.5 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                        verseBold ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Password sheet ───────────────────────────── */}
      <AnimatePresence>
        {pwSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setPwSheetOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 260 }}
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary p-6 shadow-2xl"
            >
              {/* Handle */}
              <div className="mb-5 flex justify-center">
                <div className="h-1 w-12 rounded-full bg-separator" />
              </div>

              <h2 className="mb-5 font-serif text-xl italic text-text-primary">Modifier le mot de passe</h2>

              {pwSuccess ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-7 w-7 text-green-500" />
                  </div>
                  <p className="font-sans text-sm text-text-secondary">Mot de passe mis à jour !</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Current password */}
                  <div className="relative">
                    <input
                      type={pwShowCurrent ? "text" : "password"}
                      placeholder="Mot de passe actuel"
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      className="w-full rounded-2xl border border-separator bg-bg-tertiary px-4 py-3 pr-11 font-sans text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
                    />
                    <button type="button" onClick={() => setPwShowCurrent((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                      {pwShowCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* New password */}
                  <div className="relative">
                    <input
                      type={pwShowNew ? "text" : "password"}
                      placeholder="Nouveau mot de passe (8 caractères min.)"
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      className="w-full rounded-2xl border border-separator bg-bg-tertiary px-4 py-3 pr-11 font-sans text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
                    />
                    <button type="button" onClick={() => setPwShowNew((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
                      {pwShowNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Confirm */}
                  <input
                    type="password"
                    placeholder="Confirmer le nouveau mot de passe"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    className="w-full rounded-2xl border border-separator bg-bg-tertiary px-4 py-3 font-sans text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
                  />

                  {pwError && (
                    <p className="rounded-xl bg-danger/10 px-3 py-2 font-sans text-xs text-danger">{pwError}</p>
                  )}

                  <button
                    type="button"
                    onClick={() => void changePassword()}
                    disabled={pwLoading || !pwCurrent || !pwNew || !pwConfirm}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-sans text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                  >
                    {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                    {pwLoading ? "Vérification…" : "Enregistrer"}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
