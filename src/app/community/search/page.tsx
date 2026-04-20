"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Search, UserCheck, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { createSupabaseBrowserClient } from "@/lib/supabase";

interface PublicProfile {
  user_id: string;
  first_name: string;
  avatar_level: number;
}

// Simple tree avatar using avatar_level 1-7 (same palette as XP levels)
function TreeAvatar({ level, size = 40 }: { level: number; size?: number }) {
  const colors = ["#7B6FD4", "#9D93E8", "#6DB88F", "#E8C84A", "#E87A4A", "#E84A6D", "#FFFFFF"];
  const color = colors[Math.min(level - 1, colors.length - 1)];
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-serif italic text-white"
      style={{ width: size, height: size, background: `${color}22`, border: `1.5px solid ${color}55`, fontSize: size * 0.4 }}
    >
      🌿
    </div>
  );
}

export default function CommunitySearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [following, setFollowing] = useState<Set<string>>(new Set());
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setCurrentUserId(user.id);

      // Load who I already follow
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      if (data) setFollowing(new Set(data.map((r) => r.following_id as string)));
    })();
  }, [router]);

  const search = useCallback(async (q: string) => {
    if (!q.trim() || !currentUserId) { setResults([]); return; }
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("user_profiles_public")
      .select("user_id, first_name, avatar_level")
      .ilike("first_name", `%${q}%`)
      .neq("user_id", currentUserId)
      .limit(20);
    setResults((data ?? []) as PublicProfile[]);
    setLoading(false);
  }, [currentUserId]);

  useEffect(() => {
    const timer = setTimeout(() => void search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const toggleFollow = async (targetId: string) => {
    if (!currentUserId) return;
    const supabase = createSupabaseBrowserClient();
    const isFollowing = following.has(targetId);

    if (isFollowing) {
      await supabase.from("follows").delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetId);
      setFollowing((prev) => { const next = new Set(prev); next.delete(targetId); return next; });
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: targetId });
      setFollowing((prev) => new Set(prev).add(targetId));
    }
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-32">

        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <Link href="/community" className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-secondary">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-serif text-xl italic text-text-primary">Trouver des amis</h1>
        </header>

        {/* Search input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par prénom…"
            className="w-full rounded-2xl border border-separator bg-bg-secondary pl-10 pr-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>

        {/* Results */}
        <AnimatePresence mode="popLayout">
          {loading && (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex justify-center py-8">
              <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            </motion.div>
          )}

          {!loading && query && results.length === 0 && (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center font-sans text-sm text-text-tertiary py-8">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </motion.p>
          )}

          {!loading && results.map((profile, i) => (
            <motion.div
              key={profile.user_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-2xl border border-separator bg-bg-secondary px-4 py-3 mb-2"
            >
              <TreeAvatar level={profile.avatar_level} size={40} />
              <span className="flex-1 font-sans text-sm text-text-primary">{profile.first_name}</span>
              <button
                type="button"
                onClick={() => void toggleFollow(profile.user_id)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-sans text-xs font-medium transition-all ${
                  following.has(profile.user_id)
                    ? "border border-separator bg-bg-tertiary text-text-secondary"
                    : "bg-accent text-white"
                }`}
              >
                {following.has(profile.user_id)
                  ? <><UserCheck className="h-3.5 w-3.5" /> Abonné</>
                  : <><UserPlus className="h-3.5 w-3.5" /> Suivre</>
                }
              </button>
            </motion.div>
          ))}
        </AnimatePresence>

        {!query && (
          <p className="text-center font-sans text-xs text-text-tertiary pt-8">
            Le suivi mutuel débloque l&apos;envoi de versets 🔥
          </p>
        )}

      </div>
    </AppShell>
  );
}
