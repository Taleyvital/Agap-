"use client";

import { useEffect, useState } from "react";
import { X, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { getFlameColorHex } from "@/lib/flames";

interface Friend {
  userId: string;
  firstName: string;
  streakCount: number;
}

interface SendFlameSheetProps {
  isOpen: boolean;
  onClose: () => void;
  verseRef: string;
  verseText: string;
}

export function SendFlameSheet({ isOpen, onClose, verseRef, verseText }: SendFlameSheetProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelected(null);
    setMessage("");
    setSuccess(false);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: myFollows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);

      const iFollow = new Set((myFollows ?? []).map((r) => r.following_id as string));
      if (iFollow.size === 0) { setFriends([]); setLoading(false); return; }

      const { data: theirFollows } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", user.id)
        .in("follower_id", Array.from(iFollow));

      const mutualIds = (theirFollows ?? [])
        .map((r) => r.follower_id as string)
        .filter((id) => iFollow.has(id));

      if (mutualIds.length === 0) { setFriends([]); setLoading(false); return; }

      const [profilesRes, streaksRes] = await Promise.all([
        supabase
          .from("user_profiles_public")
          .select("user_id, first_name")
          .in("user_id", mutualIds),
        supabase
          .from("verse_streaks")
          .select("user_a, user_b, streak_count")
          .or(`user_a.eq.${user.id},user_b.eq.${user.id}`),
      ]);

      const streakMap = new Map<string, number>();
      for (const s of streaksRes.data ?? []) {
        const other = s.user_a === user.id ? s.user_b : s.user_a;
        streakMap.set(other, s.streak_count as number);
      }

      const list: Friend[] = (profilesRes.data ?? []).map((p) => ({
        userId: p.user_id as string,
        firstName: p.first_name as string,
        streakCount: streakMap.get(p.user_id as string) ?? 0,
      }));

      list.sort((a, b) => b.streakCount - a.streakCount || a.firstName.localeCompare(b.firstName));
      setFriends(list);
      setLoading(false);
    })();
  }, [isOpen]);

  const handleSend = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/flames/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selected.userId,
          verseRef,
          verseText,
          message: message.trim() || null,
        }),
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) {
        setSuccess(true);
        setTimeout(() => { setSuccess(false); onClose(); }, 1500);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[270] bg-black/60"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-[280] mx-auto max-w-[430px] rounded-t-3xl border-t border-separator bg-bg-secondary"
            style={{ maxHeight: "75vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-bg-tertiary" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-separator">
              <div>
                {selected ? (
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="font-sans text-xs text-text-tertiary"
                  >
                    ← Retour
                  </button>
                ) : (
                  <h3 className="font-serif text-base italic text-text-primary">Envoyer en Flammes</h3>
                )}
              </div>
              <button type="button" onClick={onClose} className="text-text-tertiary">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(75vh - 100px)" }}>

              {/* Success state */}
              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-3 py-8 text-center"
                >
                  <motion.span
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 0.5 }}
                    className="text-5xl"
                  >
                    🔥
                  </motion.span>
                  <p className="font-serif italic text-text-primary text-lg">Verset envoyé !</p>
                </motion.div>
              )}

              {/* Step 1: pick a friend */}
              {!selected && !success && (
                <>
                  {/* Verse preview */}
                  <div className="rounded-xl border border-separator bg-bg-tertiary px-4 py-3 mb-4">
                    <p className="font-sans text-[10px] text-accent uppercase tracking-wider mb-1">{verseRef}</p>
                    <p className="font-serif text-sm italic text-text-primary leading-relaxed line-clamp-2">{verseText}</p>
                  </div>

                  <p className="font-sans text-xs text-text-tertiary mb-3 uppercase tracking-wider">À qui l&apos;envoyer ?</p>

                  {loading && (
                    <div className="flex justify-center py-8">
                      <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
                    </div>
                  )}

                  {!loading && friends.length === 0 && (
                    <div className="flex flex-col items-center gap-2 py-8 text-center">
                      <span className="text-3xl">🕊️</span>
                      <p className="font-sans text-sm text-text-secondary">Aucun ami mutuel pour l&apos;instant</p>
                      <p className="font-sans text-xs text-text-tertiary">Suis des amis depuis la section Communauté</p>
                    </div>
                  )}

                  {!loading && friends.map((friend) => {
                    const flameColor = getFlameColorHex(friend.streakCount);
                    return (
                      <button
                        key={friend.userId}
                        type="button"
                        onClick={() => setSelected(friend)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-separator bg-bg-tertiary px-4 py-3 mb-2 active:bg-bg-primary transition-colors"
                      >
                        <div
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                          style={{ background: `${flameColor}20`, border: `1.5px solid ${flameColor}40` }}
                        >
                          🌿
                        </div>
                        <span className="flex-1 text-left font-sans text-sm text-text-primary">{friend.firstName}</span>
                        {friend.streakCount > 0 && (
                          <div className="flex items-center gap-1">
                            <span style={{ color: flameColor }}>🔥</span>
                            <span className="font-sans text-xs font-semibold" style={{ color: flameColor }}>
                              {friend.streakCount}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {/* Step 2: compose + send */}
              {selected && !success && (
                <div className="flex flex-col gap-4">
                  {/* Selected friend */}
                  <div className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
                    <Flame className="h-4 w-4 text-accent shrink-0" />
                    <span className="font-sans text-sm text-accent">{selected.firstName}</span>
                  </div>

                  {/* Verse preview */}
                  <div className="rounded-xl border border-separator bg-bg-tertiary px-4 py-3">
                    <p className="font-sans text-[10px] text-accent uppercase tracking-wider mb-1">{verseRef}</p>
                    <p className="font-serif text-sm italic text-text-primary leading-relaxed">{verseText}</p>
                  </div>

                  {/* Optional message */}
                  <div>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value.slice(0, 140))}
                      placeholder="Ajouter un message court… (optionnel)"
                      rows={3}
                      className="w-full rounded-xl border border-separator bg-bg-tertiary px-4 py-3 font-sans text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none"
                    />
                    <p className="text-right font-sans text-[10px] text-text-tertiary mt-1">{message.length}/140</p>
                  </div>

                  {/* Send button */}
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={sending}
                    className="w-full rounded-2xl bg-accent py-3.5 font-sans text-sm font-medium text-white disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <>Envoyer 🔥</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
