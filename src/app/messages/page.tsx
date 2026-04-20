"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getFlameColorHex } from "@/lib/flames";

interface MutualFriend {
  userId: string;
  firstName: string;
  avatarLevel: number;
  streakCount: number;
  lastVerseRef: string | null;
  lastVerseText: string | null;
  unreadCount: number;
}

function FlameIcon({ streak, size = 20 }: { streak: number; size?: number }) {
  const color = getFlameColorHex(streak);
  return (
    <motion.span
      animate={{ rotate: [0, -4, 4, -4, 0], scale: [1, 1.05, 1, 1.05, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      style={{ display: "inline-block", fontSize: size, color, filter: streak >= 30 ? "drop-shadow(0 0 4px #ffffff88)" : "none" }}
    >
      🔥
    </motion.span>
  );
}

function TreeAvatar({ level, size = 48 }: { level: number; size?: number }) {
  const colors = ["#7B6FD4", "#9D93E8", "#6DB88F", "#E8C84A", "#E87A4A", "#E84A6D", "#FFFFFF"];
  const color = colors[Math.min(level - 1, colors.length - 1)];
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: `${color}22`, border: `1.5px solid ${color}55`, fontSize: size * 0.42 }}
    >
      🌿
    </div>
  );
}

function OnboardingModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 backdrop-blur-[2px]"
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="w-full max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary px-6 pb-10 pt-8"
      >
        {/* Animated flame SVG */}
        <div className="flex justify-center mb-5">
          <motion.svg
            width="64" height="80" viewBox="0 0 64 80" fill="none"
            animate={{ scale: [1, 1.06, 1], rotate: [0, -3, 3, -3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <path
              d="M32 4C32 4 12 24 12 44C12 55.046 21.177 64 32 64C42.823 64 52 55.046 52 44C52 24 32 4 32 4Z"
              fill="#7B6FD4" fillOpacity="0.9"
            />
            <path
              d="M32 28C32 28 22 40 22 48C22 53.523 26.477 58 32 58C37.523 58 42 53.523 42 48C42 40 32 28 32 28Z"
              fill="#9D93E8"
            />
            <path
              d="M32 44C32 44 28 48 28 51C28 53.209 29.791 55 32 55C34.209 55 36 53.209 36 51C36 48 32 44 32 44Z"
              fill="#E8E8E8"
            />
          </motion.svg>
        </div>

        <h2 className="font-serif text-2xl italic text-text-primary text-center mb-3">
          Les Flammes Spirituelles
        </h2>
        <p className="font-sans text-sm text-text-secondary text-center leading-relaxed mb-6">
          Envoie un verset chaque jour à un ami.<br />
          Gardez la flamme allumée ensemble.
        </p>

        <div className="flex flex-col gap-2 mb-6 text-center font-sans text-xs text-text-tertiary">
          <p>🔥 Gris — flamme naissante</p>
          <p style={{ color: "#7B6FD4" }}>🔥 Violet — 3 jours consécutifs</p>
          <p style={{ color: "#E8C84A" }}>🔥 Doré — 7 jours consécutifs</p>
          <p style={{ color: "#FFFFFF" }}>🔥 Blanc — 30 jours consécutifs</p>
        </div>

        <Link
          href="/community/search"
          onClick={onClose}
          className="block w-full rounded-2xl bg-accent py-3.5 text-center font-sans text-sm font-medium text-white"
        >
          Trouver des amis
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 block w-full text-center font-sans text-xs text-text-tertiary"
        >
          Continuer sans amis
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<MutualFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setCurrentUserId(user.id);

      // Show onboarding on first visit
      const seen = localStorage.getItem("flames-onboarding-seen");
      if (!seen) setShowOnboarding(true);

      // Get who I follow
      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const iFollow = new Set((myFollows ?? []).map((r) => r.following_id as string));
      if (iFollow.size === 0) { setLoading(false); return; }

      // Get who follows me back (mutual)
      const { data: theirFollows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id)
        .in("follower_id", Array.from(iFollow));

      const mutualIds = (theirFollows ?? [])
        .map((r) => r.follower_id as string)
        .filter((id) => iFollow.has(id));

      if (mutualIds.length === 0) { setLoading(false); return; }

      // Get profiles
      const { data: profiles } = await supabase
        .from("user_profiles_public")
        .select("user_id, first_name, avatar_level")
        .in("user_id", mutualIds);

      // Get streaks
      const { data: streaks } = await supabase
        .from("verse_streaks")
        .select("user_a, user_b, streak_count")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`);

      const streakMap = new Map<string, number>();
      for (const s of streaks ?? []) {
        const other = s.user_a === user.id ? s.user_b : s.user_a;
        streakMap.set(other, s.streak_count as number);
      }

      // Get last message + unread count per conversation
      const convList: MutualFriend[] = [];
      for (const profile of profiles ?? []) {
        const pid = profile.user_id as string;

        const [lastMsgRes, unreadRes] = await Promise.all([
          supabase
            .from("verse_messages")
            .select("verse_ref, verse_text")
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${pid}),and(sender_id.eq.${pid},receiver_id.eq.${user.id})`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from("verse_messages")
            .select("*", { count: "exact", head: true })
            .eq("sender_id", pid)
            .eq("receiver_id", user.id)
            .is("read_at", null),
        ]);

        convList.push({
          userId: pid,
          firstName: profile.first_name as string,
          avatarLevel: profile.avatar_level as number,
          streakCount: streakMap.get(pid) ?? 0,
          lastVerseRef: lastMsgRes.data?.verse_ref ?? null,
          lastVerseText: lastMsgRes.data?.verse_text ?? null,
          unreadCount: unreadRes.count ?? 0,
        });
      }

      // Sort by streak desc, then alphabetically
      convList.sort((a, b) => b.streakCount - a.streakCount || a.firstName.localeCompare(b.firstName));
      setConversations(convList);
      setLoading(false);
    })();
  }, [router]);

  const handleCloseOnboarding = () => {
    localStorage.setItem("flames-onboarding-seen", "1");
    setShowOnboarding(false);
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-32">

        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-[22px] italic text-text-primary">Messages</h1>
          <Link
            href="/community/search"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-secondary"
          >
            <UserPlus className="h-4 w-4" />
          </Link>
        </header>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 pt-16"
          >
            <span className="text-5xl">🔥</span>
            <p className="font-serif text-lg italic text-text-secondary text-center">
              Aucune conversation active
            </p>
            <p className="font-sans text-xs text-text-tertiary text-center max-w-[260px]">
              Suis des amis et attendez qu&apos;ils te suivent en retour pour commencer à échanger des versets.
            </p>
            <Link
              href="/community/search"
              className="mt-2 rounded-2xl bg-accent px-5 py-2.5 font-sans text-sm text-white"
            >
              Trouver des amis
            </Link>
          </motion.div>
        )}

        {!loading && conversations.length > 0 && (
          <div className="flex flex-col gap-1">
            {conversations.map((conv, i) => (
              <motion.div
                key={conv.userId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/messages/${conv.userId}`}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 border border-separator bg-bg-secondary active:bg-bg-tertiary transition-colors"
                >
                  <div className="relative">
                    <TreeAvatar level={conv.avatarLevel} size={48} />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 font-sans text-[9px] font-bold text-white">
                        {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-sm text-text-primary">{conv.firstName}</p>
                    {conv.lastVerseRef ? (
                      <p className="font-sans text-xs text-text-tertiary truncate">
                        {conv.lastVerseRef} — {conv.lastVerseText}
                      </p>
                    ) : (
                      <p className="font-sans text-xs text-text-tertiary">Aucun message encore</p>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <FlameIcon streak={conv.streakCount} size={20} />
                    {conv.streakCount > 0 && (
                      <span
                        className="font-sans text-[11px] font-semibold"
                        style={{ color: getFlameColorHex(conv.streakCount) }}
                      >
                        {conv.streakCount}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
      </AnimatePresence>
    </AppShell>
  );
}
