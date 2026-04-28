"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getFlameColorHex } from "@/lib/flames";

interface MutualFriend {
  userId: string;
  firstName: string;
  avatarLevel: number;
  avatarUrl: string | null;
  streakCount: number;
  lastVerseRef: string | null;
  lastVerseText: string | null;
  unreadCount: number;
}

interface PendingFollower {
  userId: string;
  firstName: string;
  avatarUrl: string | null;
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

function ContactAvatar({ avatarUrl, firstName, size = 48 }: { avatarUrl: string | null; firstName: string; size?: number }) {
  const initial = (firstName ?? "?").charAt(0).toUpperCase();
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 overflow-hidden relative bg-bg-secondary"
      style={{ width: size, height: size, border: "1.5px solid rgba(123,111,212,0.3)" }}
    >
      {avatarUrl ? (
        <Image src={avatarUrl} alt={firstName} fill className="object-cover" sizes={`${size}px`} />
      ) : (
        <span className="font-serif italic text-text-secondary" style={{ fontSize: size * 0.38 }}>
          {initial}
        </span>
      )}
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

// Module-level cache — survives navigation without persisting auth data to storage
let _cachedConversations: MutualFriend[] | null = null;
let _cachedPending: PendingFollower[] | null = null;

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<MutualFriend[]>(_cachedConversations ?? []);
  const [pendingFollowers, setPendingFollowers] = useState<PendingFollower[]>(_cachedPending ?? []);
  const [followingBack, setFollowingBack] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(_cachedConversations === null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<"conversations" | "demandes">("conversations");
  const currentUserIdRef = useRef<string | null>(null);
  const iFollowRef = useRef<Set<string>>(new Set());

  const ignorePending = (userId: string) => {
    const ignored = JSON.parse(localStorage.getItem("ignored-followers") ?? "[]") as string[];
    localStorage.setItem("ignored-followers", JSON.stringify([...ignored, userId]));
    setPendingFollowers((prev) => prev.filter((p) => p.userId !== userId));
  };

  const followBack = async (target: PendingFollower) => {
    const uid = currentUserIdRef.current;
    if (!uid) return;
    setFollowingBack((prev) => new Set(prev).add(target.userId));
    const supabase = createSupabaseBrowserClient();
    await supabase.from("follows").insert({ follower_id: uid, following_id: target.userId });
    iFollowRef.current.add(target.userId);
    setPendingFollowers((prev) => {
      const next = prev.filter((p) => p.userId !== target.userId);
      _cachedPending = next;
      return next;
    });
    setFollowingBack((prev) => { const s = new Set(prev); s.delete(target.userId); return s; });
    const newFriend: MutualFriend = {
      userId: target.userId,
      firstName: target.firstName,
      avatarLevel: 1,
      avatarUrl: target.avatarUrl,
      streakCount: 0,
      lastVerseRef: null,
      lastVerseText: null,
      unreadCount: 0,
    };
    setConversations((prev) => {
      const next = [newFriend, ...prev];
      _cachedConversations = next;
      return next;
    });
  };

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      currentUserIdRef.current = user.id;

      const seen = localStorage.getItem("flames-onboarding-seen");
      if (!seen) setShowOnboarding(true);

      const ignoredSet = new Set(
        JSON.parse(localStorage.getItem("ignored-followers") ?? "[]") as string[]
      );

      // Fetch follows both directions in parallel
      const [{ data: myFollows }, { data: theirFollows }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id),
        supabase.from("follows").select("follower_id").eq("following_id", user.id),
      ]);

      const iFollow = new Set((myFollows ?? []).map((r) => r.following_id as string));
      iFollowRef.current = iFollow;
      const followsMe = (theirFollows ?? []).map((r) => r.follower_id as string);

      // Pending demandes: follows me but I don't follow back
      const pendingIds = followsMe.filter((id) => !iFollow.has(id) && !ignoredSet.has(id));
      if (pendingIds.length > 0) {
        const { data: pendingProfiles } = await supabase
          .from("profiles")
          .select("id, first_name, anonymous_name, avatar_url")
          .in("id", pendingIds);
        const pending = (pendingProfiles ?? []).map((p) => ({
          userId: p.id as string,
          firstName: ((p.first_name as string | null) ?? (p.anonymous_name as string | null) ?? "?"),
          avatarUrl: (p.avatar_url as string | null) ?? null,
        }));
        _cachedPending = pending;
        setPendingFollowers(pending);
      } else {
        _cachedPending = [];
      }

      // Realtime: new follower while on this page
      channel = supabase.channel(`follows-incoming-${user.id}`);
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "follows", filter: `following_id=eq.${user.id}` },
          async (payload) => {
            const newFollowerId = (payload.new as { follower_id: string }).follower_id;
            const ignored = new Set(
              JSON.parse(localStorage.getItem("ignored-followers") ?? "[]") as string[]
            );
            if (ignored.has(newFollowerId) || iFollowRef.current.has(newFollowerId)) return;
            const { data: profileData } = await supabase
              .from("profiles")
              .select("first_name, anonymous_name, avatar_url")
              .eq("id", newFollowerId)
              .maybeSingle();
            if (!profileData) return;
            const newPending = {
              userId: newFollowerId,
              firstName: ((profileData.first_name as string | null) ?? (profileData.anonymous_name as string | null) ?? "?"),
              avatarUrl: (profileData.avatar_url as string | null) ?? null,
            };
            setPendingFollowers((prev) => {
              if (prev.some((p) => p.userId === newFollowerId)) return prev;
              const next = [newPending, ...prev];
              _cachedPending = next;
              return next;
            });
          }
        )
        .subscribe();

      // Mutual friends: I follow them AND they follow me
      const mutualIds = followsMe.filter((id) => iFollow.has(id));
      if (mutualIds.length === 0) { setLoading(false); return; }

      // Fetch mutual profiles + streaks in parallel (profiles only, no user_profiles_public)
      const [{ data: mutualProfiles }, { data: streaks }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, first_name, anonymous_name, avatar_url")
          .in("id", mutualIds),
        supabase
          .from("verse_streaks")
          .select("user_a, user_b, streak_count")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
      ]);

      const streakMap = new Map<string, number>();
      for (const s of streaks ?? []) {
        const other = s.user_a === user.id ? s.user_b : s.user_a;
        streakMap.set(other, s.streak_count as number);
      }

      // Fetch last message + unread for ALL conversations in parallel
      const convResults = await Promise.all(
        (mutualProfiles ?? []).map(async (profile) => {
          const pid = profile.id as string;
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
          return {
            userId: pid,
            firstName: ((profile.first_name as string | null) ?? (profile.anonymous_name as string | null) ?? "?"),
            avatarLevel: 1,
            avatarUrl: (profile.avatar_url as string | null) ?? null,
            streakCount: streakMap.get(pid) ?? 0,
            lastVerseRef: lastMsgRes.data?.verse_ref ?? null,
            lastVerseText: lastMsgRes.data?.verse_text ?? null,
            unreadCount: unreadRes.count ?? 0,
          } satisfies MutualFriend;
        })
      );

      convResults.sort((a, b) => b.streakCount - a.streakCount || a.firstName.localeCompare(b.firstName));
      _cachedConversations = convResults;
      setConversations(convResults);
      setLoading(false);
    })();

    return () => {
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  const handleCloseOnboarding = () => {
    localStorage.setItem("flames-onboarding-seen", "1");
    setShowOnboarding(false);
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-32">

        {/* Header */}
        <header className="flex items-center gap-3 mb-5">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-secondary shrink-0"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="font-serif text-[22px] italic text-text-primary flex-1">Flammes</h1>
          <Link
            href="/community/search"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-secondary shrink-0"
            aria-label="Trouver des amis"
          >
            <UserPlus className="h-4 w-4" />
          </Link>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-separator mb-5">
          <button
            type="button"
            onClick={() => setActiveTab("conversations")}
            className="relative mr-6 pb-3 font-sans text-sm font-semibold uppercase tracking-widest transition-colors"
            style={{ color: activeTab === "conversations" ? "#E8E8E8" : "#666666" }}
          >
            Conversations
            {activeTab === "conversations" && (
              <motion.div layoutId="msg-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("demandes")}
            className="relative pb-3 font-sans text-sm font-semibold uppercase tracking-widest transition-colors"
            style={{ color: activeTab === "demandes" ? "#E8E8E8" : "#666666" }}
          >
            Demandes
            {pendingFollowers.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 font-sans text-[9px] font-bold text-white align-middle">
                {pendingFollowers.length > 9 ? "9+" : pendingFollowers.length}
              </span>
            )}
            {activeTab === "demandes" && (
              <motion.div layoutId="msg-tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent" />
            )}
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        )}

        {/* Tab: Demandes */}
        <AnimatePresence mode="wait">
          {activeTab === "demandes" && !loading && (
            <motion.div
              key="demandes"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.18 }}
            >
              {pendingFollowers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 pt-16 text-center">
                  <span className="text-4xl">🤝</span>
                  <p className="font-serif italic text-text-secondary text-lg">Aucune demande</p>
                  <p className="font-sans text-xs text-text-tertiary max-w-[240px]">
                    Quand quelqu&apos;un te suit, tu pourras accepter et allumer une flamme ensemble.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingFollowers.map((p) => (
                    <motion.div
                      key={p.userId}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-3 rounded-2xl border border-accent/25 bg-bg-secondary px-4 py-3"
                    >
                      <ContactAvatar avatarUrl={p.avatarUrl} firstName={p.firstName} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="font-sans text-sm font-medium text-text-primary">{p.firstName}</p>
                        <p className="font-sans text-[11px] text-text-tertiary">veut se connecter avec toi 🔥</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void followBack(p)}
                          disabled={followingBack.has(p.userId)}
                          className="flex items-center gap-1.5 rounded-xl bg-accent px-3 py-1.5 font-sans text-xs font-medium text-white disabled:opacity-60"
                        >
                          {followingBack.has(p.userId) ? (
                            <div className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                          ) : (
                            "Suivre"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => ignorePending(p.userId)}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-tertiary font-sans text-xs text-text-tertiary hover:text-text-primary transition-colors"
                          aria-label="Ignorer"
                        >
                          ✕
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab: Conversations */}
        <AnimatePresence mode="wait">
          {activeTab === "conversations" && !loading && (
            <motion.div
              key="conversations"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.18 }}
            >
              {conversations.length === 0 && (
                <motion.div className="flex flex-col items-center gap-4 pt-16">
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
              {conversations.length > 0 && (
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
                    <ContactAvatar avatarUrl={conv.avatarUrl} firstName={conv.firstName} size={48} />
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showOnboarding && <OnboardingModal onClose={handleCloseOnboarding} />}
      </AnimatePresence>
    </AppShell>
  );
}
