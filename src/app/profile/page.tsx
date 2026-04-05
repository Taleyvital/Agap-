"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  LogOut,
  ChevronRight,
  BookOpen,
  MessageCircle,
  Flame,
  Bell,
  Shield,
  HelpCircle,
  Settings,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface Profile {
  first_name: string | null;
  anonymous_name: string | null;
  created_at: string | null;
}

const STATS = [
  { value: "12", label: "Jours consécutifs" },
  { value: "156", label: "Versets lus" },
  { value: "42", label: "Prières" },
];

const MENU_SECTIONS = [
  {
    title: "Mes contenus",
    items: [
      { href: "/bible", label: "Versets sauvegardés", Icon: BookOpen },
      { href: "/chat", label: "Historique AGAPE Chat", Icon: MessageCircle },
      { href: "/prayer", label: "Journal de prière", Icon: Flame },
    ],
  },
  {
    title: "Préférences",
    items: [
      { href: "/home", label: "Notifications", Icon: Bell },
      { href: "/home", label: "Confidentialité", Icon: Shield },
      { href: "/home", label: "Aide & Support", Icon: HelpCircle },
    ],
  },
];

function stagger(i: number) {
  return { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: i * 0.06, duration: 0.3 } };
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [initial, setInitial] = useState("A");
  const [since, setSince] = useState("");
  const [themeSheetOpen, setThemeSheetOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("first_name, anonymous_name, created_at")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data);
        setInitial((data.first_name ?? data.anonymous_name ?? "A").charAt(0).toUpperCase());
        if (data.created_at) {
          setSince(
            new Date(data.created_at).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            }),
          );
        }
      }
    })();
  }, []);

  const displayName = profile?.first_name ?? profile?.anonymous_name ?? "Anonyme";

  const signOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/onboarding");
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-32">

        {/* ── Header ────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <p className="font-sans text-[10px] uppercase tracking-[0.22em] text-text-tertiary">
            Profil
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
          {/* Avatar ring */}
          <div className="relative">
            <div className="relative h-20 w-20">
              {/* Gradient ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "conic-gradient(from 180deg, #7B6FD4, #9D93E8, #5B5099, #7B6FD4)",
                  padding: "2px",
                }}
              >
                <div className="h-full w-full rounded-full bg-bg-primary" />
              </div>
              {/* Initial */}
              <div className="absolute inset-[3px] flex items-center justify-center rounded-full bg-bg-secondary">
                <span className="font-serif text-2xl italic text-text-primary">{initial}</span>
              </div>
            </div>
            {/* Online dot */}
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-bg-primary bg-emerald-400" />
          </div>

          {/* Name */}
          <p className="mt-4 font-serif text-2xl italic text-text-primary">{displayName}</p>

          {/* Since */}
          {since && (
            <p className="mt-1 font-sans text-[11px] uppercase tracking-[0.18em] text-text-tertiary">
              Membre depuis {since}
            </p>
          )}
        </motion.div>

        {/* ── Stats strip ───────────────────────────── */}
        <motion.div {...stagger(1)} className="mt-8 flex divide-x divide-separator overflow-hidden rounded-2xl border border-separator bg-bg-secondary">
          {STATS.map((s) => (
            <div key={s.label} className="flex flex-1 flex-col items-center py-4">
              <span className="font-serif text-2xl font-semibold text-text-primary">{s.value}</span>
              <span className="mt-0.5 px-1 text-center font-sans text-[9px] uppercase tracking-wider text-text-tertiary leading-tight">{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Reading progress ──────────────────────── */}
        <motion.div {...stagger(2)} className="mt-5 rounded-2xl border border-separator bg-bg-secondary p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                Parcours de lecture
              </p>
              <p className="mt-1 font-serif text-lg italic text-text-primary">
                Nouveau Testament
              </p>
              <p className="mt-0.5 font-sans text-xs text-text-secondary">
                Actuellement dans Éphésiens 4
              </p>
            </div>
            <span className="font-serif text-3xl text-accent">64%</span>
          </div>
          <div className="mt-4 h-1.5 w-full rounded-full bg-bg-tertiary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "64%" }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-accent"
            />
          </div>
          <Link
            href="/bible"
            className="mt-4 inline-block font-sans text-xs uppercase tracking-wider text-accent"
          >
            Reprendre la lecture →
          </Link>
        </motion.div>

        {/* ── Menu sections ─────────────────────────── */}
        {MENU_SECTIONS.map((section, si) => (
          <motion.div key={section.title} {...stagger(3 + si)} className="mt-6">
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

        {/* ── Sign out ──────────────────────────────── */}
        <motion.div {...stagger(5)} className="mt-8">
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/20 bg-danger/5 py-3.5 font-sans text-sm text-danger/80 transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </motion.div>

        {/* ── App version ───────────────────────────── */}
        <p className="mt-6 text-center font-sans text-[10px] text-text-tertiary/40">
          AGAPE v2.0 · Fait avec 🕊️
        </p>

      </div>

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
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary p-6 shadow-2xl"
            >
              <div className="mb-8 flex items-center justify-between">
                <h2 className="font-serif text-xl italic text-text-primary">Paramètres</h2>
                <button
                  type="button"
                  onClick={() => setThemeSheetOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Fermer"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {/* Theme section */}
              <div>
                <p className="mb-4 font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                  Apparence
                </p>
                <div className="flex gap-3">
                  {[
                    { id: "light", label: "Clair", Icon: Sun },
                    { id: "dark", label: "Sombre", Icon: Moon },
                    { id: "system", label: "Système", Icon: Monitor },
                  ].map(({ id, label, Icon }) => {
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
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-8 mb-4">
                {/* Additional settings could go here */}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
