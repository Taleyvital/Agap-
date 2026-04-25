"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Heart, Play, Upload, Music, Pencil, Trash2, X, ChevronLeft, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { PremiumPaywall } from "@/components/ui/PremiumPaywall";
import { useGospelPlayer } from "@/components/providers/GospelPlayerProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { GospelTrack } from "@/types/gospel";
import { formatDuration, GOSPEL_GENRES } from "@/types/gospel";

type MyTrack = {
  id: string;
  title: string;
  artist_name: string;
  cover_url: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  lyrics: string | null;
  duration_seconds: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  approved: "Approuvé",
  rejected: "Rejeté",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "#f0c051",
  approved: "#4CAF82",
  rejected: "#ff6b6b",
};

export default function GospelPage() {
  const router = useRouter();
  const { play, currentTrack, isPlaying } = useGospelPlayer();

  const premiumGateEnabled = process.env.NEXT_PUBLIC_GOSPEL_PREMIUM_ONLY === "true";

  const [isPremium, setIsPremium]         = useState<boolean | null>(null);
  const [showPaywall, setShowPaywall]     = useState(false);
  const [tracks, setTracks]               = useState<GospelTrack[]>([]);
  const [featured, setFeatured]           = useState<GospelTrack[]>([]);
  const [activeGenre, setActiveGenre]     = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);
  const [userInitial, setUserInitial]     = useState("");

  // My tracks drawer state
  const [myTracks, setMyTracks]           = useState<MyTrack[]>([]);
  const [showDrawer, setShowDrawer]       = useState(false);
  const [editingTrack, setEditingTrack]   = useState<MyTrack | null>(null);
  const [lyricsValue, setLyricsValue]     = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving]               = useState(false);
  const [drawerMsg, setDrawerMsg]         = useState<{ text: string; ok: boolean } | null>(null);
  const lyricsRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // User initial for avatar
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, is_premium")
        .eq("id", user.id)
        .maybeSingle();

      const name = profile?.full_name || user.email || "?";
      setUserInitial(name.charAt(0).toUpperCase());

      if (!premiumGateEnabled) {
        setIsPremium(true);
        return;
      }
      const premium = profile?.is_premium ?? false;
      setIsPremium(premium);
      if (!premium) setShowPaywall(true);
    };
    init();
  }, [premiumGateEnabled]);

  const fetchMyTracks = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("gospel_tracks")
      .select("id,title,artist_name,cover_url,status,rejection_reason,lyrics,duration_seconds")
      .eq("artist_id", user.id)
      .order("submitted_at", { ascending: false });
    setMyTracks((data as MyTrack[]) || []);
  }, []);

  const fetchTracks = useCallback(async (genre?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "40" });
    if (genre) params.set("genre", genre);
    const res  = await fetch(`/api/gospel/tracks?${params}`);
    const data = await res.json();
    const list: GospelTrack[] = data.tracks ?? [];
    setTracks(list);
    setFeatured([...list].sort((a, b) => b.play_count - a.play_count).slice(0, 5));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isPremium) fetchTracks(activeGenre ?? undefined);
  }, [isPremium, activeGenre, fetchTracks]);

  const openDrawer = () => {
    fetchMyTracks();
    setShowDrawer(true);
    setEditingTrack(null);
    setConfirmDeleteId(null);
    setDrawerMsg(null);
  };

  const startEdit = (track: MyTrack) => {
    setEditingTrack(track);
    setLyricsValue(track.lyrics ?? "");
    setDrawerMsg(null);
    setTimeout(() => lyricsRef.current?.focus(), 200);
  };

  const saveLyrics = async () => {
    if (!editingTrack) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/gospel/tracks/${editingTrack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics: lyricsValue }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMyTracks((prev) =>
        prev.map((t) => t.id === editingTrack.id ? { ...t, lyrics: lyricsValue, status: json.resubmitted ? "pending" : t.status } : t)
      );
      setDrawerMsg({ text: json.resubmitted ? "Paroles mises à jour — track resoumise pour validation" : "Paroles sauvegardées", ok: true });
      setEditingTrack(null);
    } catch (e: unknown) {
      setDrawerMsg({ text: (e as Error).message || "Erreur", ok: false });
    } finally {
      setSaving(false);
    }
  };

  const deleteTrack = async (id: string) => {
    try {
      const res = await fetch(`/api/gospel/tracks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMyTracks((prev) => prev.filter((t) => t.id !== id));
      setConfirmDeleteId(null);
      setDrawerMsg({ text: "Titre supprimé", ok: true });
    } catch {
      setDrawerMsg({ text: "Impossible de supprimer", ok: false });
    }
  };

  const handleTrackClick = (track: GospelTrack) => {
    play(track, tracks);
    router.push(`/gospel/${track.id}`);
  };

  const handleLike = async (e: React.MouseEvent, track: GospelTrack) => {
    e.stopPropagation();
    await fetch(`/api/gospel/tracks/${track.id}/like`, { method: "POST" });
    setTracks((prev) =>
      prev.map((t) => t.id === track.id ? { ...t, is_liked: !t.is_liked } : t),
    );
  };

  if (isPremium === null) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center bg-bg-primary">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative min-h-screen bg-bg-primary">
        {!isPremium && (
          <div
            className="pointer-events-none absolute inset-0 z-30"
            style={{ backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}
          />
        )}

        <div className={`px-5 pb-40 pt-6 ${!isPremium ? "pointer-events-none select-none" : ""}`}>
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-serif text-[22px] text-text-primary">Gospel</h1>
              <p className="mt-0.5 font-sans text-[13px] text-text-secondary">Musique qui élève l&apos;âme</p>
            </div>

            <div className="flex items-center gap-2">
              {/* Artist avatar — opens my tracks drawer */}
              {userInitial && (
                <button
                  onClick={openDrawer}
                  className="flex h-9 w-9 items-center justify-center rounded-full font-sans text-[14px] font-bold text-white transition-transform active:scale-95"
                  style={{ background: "linear-gradient(135deg, #7B6FD4 0%, #9B8FF4 100%)" }}
                  title="Mes soumissions"
                >
                  {userInitial}
                </button>
              )}

              <button
                onClick={() => router.push("/gospel/upload")}
                className="flex items-center gap-2 rounded-2xl border border-accent/40 px-4 py-2 font-sans text-[13px] font-semibold text-accent"
              >
                <Upload className="h-4 w-4" />
                Soumettre
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonLoader />
          ) : (
            <>
              {/* Genre chips */}
              <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <GenreChip label="Tous" active={!activeGenre} onClick={() => setActiveGenre(null)} />
                {GOSPEL_GENRES.map((g) => (
                  <GenreChip key={g} label={g} active={activeGenre === g} onClick={() => setActiveGenre(g)} />
                ))}
              </div>

              {featured.length > 0 && (
                <section className="mb-8">
                  <h2 className="mb-4 font-sans text-[15px] font-semibold text-text-primary">En ce moment</h2>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {featured.map((track) => (
                      <FeaturedCard
                        key={track.id}
                        track={track}
                        isActive={currentTrack?.id === track.id && isPlaying}
                        onClick={() => handleTrackClick(track)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {tracks.length > 0 && (
                <section>
                  <h2 className="mb-4 font-sans text-[15px] font-semibold text-text-primary">
                    {activeGenre ?? "Récemment ajoutés"}
                  </h2>
                  <div className="space-y-1">
                    {tracks.map((track) => (
                      <TrackRow
                        key={track.id}
                        track={track}
                        isActive={currentTrack?.id === track.id && isPlaying}
                        onClick={() => handleTrackClick(track)}
                        onLike={(e) => handleLike(e, track)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {tracks.length === 0 && (
                <div className="mt-20 flex flex-col items-center gap-3">
                  <Music className="h-12 w-12 text-separator" />
                  <p className="font-sans text-[14px] text-text-secondary">Aucun titre disponible</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── My Tracks Drawer ── */}
      <AnimatePresence>
        {showDrawer && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60"
              onClick={() => { if (!editingTrack) setShowDrawer(false); }}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[24px] bg-[#1c1c1c] pb-safe"
              style={{ maxHeight: "85vh", overflowY: "auto" }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="h-1 w-10 rounded-full bg-[#2a2a2a]" />
              </div>

              {/* ── Edit lyrics view ── */}
              {editingTrack ? (
                <div className="px-5 pb-8">
                  <div className="mb-5 flex items-center gap-3">
                    <button onClick={() => setEditingTrack(null)} className="text-[#666]">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[11px] uppercase tracking-widest text-[#666]">Modifier les paroles</p>
                      <p className="truncate font-serif text-[16px] italic text-[#E8E8E8]">{editingTrack.title}</p>
                    </div>
                  </div>

                  <textarea
                    ref={lyricsRef}
                    value={lyricsValue}
                    onChange={(e) => setLyricsValue(e.target.value)}
                    maxLength={3000}
                    rows={12}
                    placeholder="Écris les paroles ici…"
                    className="w-full rounded-xl bg-[#141414] px-4 py-3 font-sans text-[14px] text-[#E8E8E8] placeholder-[#474552] focus:outline-none focus:ring-1 focus:ring-[#7B6FD4] resize-none"
                  />
                  <p className="mt-1 text-right font-sans text-[11px] text-[#444]">{lyricsValue.length}/3000</p>

                  {editingTrack.status === "approved" && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f0c051]/10 px-4 py-3">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#f0c051]" />
                      <p className="font-sans text-[12px] text-[#f0c051]">
                        Cette track est approuvée. Modifier les paroles la repassera en attente de validation.
                      </p>
                    </div>
                  )}

                  <button
                    onClick={saveLyrics}
                    disabled={saving}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#7B6FD4] py-4 font-sans text-[13px] font-bold tracking-wide text-white transition-opacity disabled:opacity-50"
                  >
                    {saving ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      <><Check className="h-4 w-4" /> Sauvegarder</>
                    )}
                  </button>
                </div>

              ) : (
                /* ── Track list view ── */
                <div className="px-5 pb-8">
                  <div className="mb-5 flex items-center justify-between">
                    <h2 className="font-serif text-[18px] italic text-[#E8E8E8]">Mes soumissions</h2>
                    <button onClick={() => setShowDrawer(false)}>
                      <X className="h-5 w-5 text-[#666]" />
                    </button>
                  </div>

                  {/* Feedback message */}
                  <AnimatePresence>
                    {drawerMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3"
                        style={{ backgroundColor: drawerMsg.ok ? "#4CAF8215" : "#ff6b6b15" }}
                      >
                        <div
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: drawerMsg.ok ? "#4CAF82" : "#ff6b6b" }}
                        />
                        <p
                          className="font-sans text-[13px]"
                          style={{ color: drawerMsg.ok ? "#4CAF82" : "#ff6b6b" }}
                        >
                          {drawerMsg.text}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {myTracks.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <Music className="h-10 w-10 text-[#333]" />
                      <p className="font-sans text-[14px] text-[#666]">Aucun titre soumis</p>
                      <button
                        onClick={() => { setShowDrawer(false); router.push("/gospel/upload"); }}
                        className="mt-1 rounded-2xl border border-[#7B6FD4]/40 px-5 py-2 font-sans text-[13px] font-semibold text-[#7B6FD4]"
                      >
                        Soumettre un titre
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {myTracks.map((track) => (
                        <div
                          key={track.id}
                          className="rounded-2xl bg-[#141414] border border-[#2a2a2a] p-4"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            {track.cover_url ? (
                              <img
                                src={track.cover_url}
                                alt={track.title}
                                className="h-12 w-12 shrink-0 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#1c1c1c] text-lg border border-[#2a2a2a]">
                                🎵
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-sans text-[14px] font-semibold text-[#E8E8E8]">
                                {track.title}
                              </p>
                              <p className="truncate font-sans text-[12px] text-[#666]">
                                {track.artist_name} · {formatDuration(track.duration_seconds)}
                              </p>
                            </div>
                            {/* Status chip */}
                            <span
                              className="shrink-0 rounded-full px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wide"
                              style={{
                                backgroundColor: `${STATUS_COLOR[track.status]}18`,
                                color: STATUS_COLOR[track.status],
                              }}
                            >
                              {STATUS_LABEL[track.status]}
                            </span>
                          </div>

                          {/* Rejection reason */}
                          {track.status === "rejected" && track.rejection_reason && (
                            <div className="mb-3 rounded-xl bg-[#ff6b6b]/10 px-3 py-2">
                              <p className="font-sans text-[12px] text-[#ff6b6b]">
                                {track.rejection_reason}
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          {confirmDeleteId === track.id ? (
                            <div className="flex items-center gap-2">
                              <p className="flex-1 font-sans text-[12px] text-[#666]">
                                Supprimer définitivement ?
                              </p>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="rounded-xl border border-[#2a2a2a] px-3 py-1.5 font-sans text-[12px] text-[#666]"
                              >
                                Annuler
                              </button>
                              <button
                                onClick={() => deleteTrack(track.id)}
                                className="rounded-xl bg-[#ff6b6b]/15 px-3 py-1.5 font-sans text-[12px] font-semibold text-[#ff6b6b]"
                              >
                                Supprimer
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <button
                                onClick={() => startEdit(track)}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#2a2a2a] py-2 font-sans text-[12px] font-medium text-[#E8E8E8] transition-colors active:bg-[#2a2a2a]"
                              >
                                <Pencil className="h-3.5 w-3.5 text-[#7B6FD4]" />
                                Paroles
                              </button>
                              <button
                                onClick={() => { setConfirmDeleteId(track.id); setDrawerMsg(null); }}
                                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#2a2a2a] py-2 font-sans text-[12px] font-medium text-[#E8E8E8] transition-colors active:bg-[#2a2a2a]"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-[#ff6b6b]" />
                                Supprimer
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {showPaywall && <PremiumPaywall onClose={() => setShowPaywall(false)} />}
    </AppShell>
  );
}

// ── Sub-components ────────────────────────────────────────────

function GenreChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-full px-4 py-1.5 font-sans text-[13px] font-medium transition-colors"
      style={
        active
          ? { backgroundColor: "rgb(var(--accent))", color: "#fff" }
          : { backgroundColor: "rgb(var(--bg-secondary))", border: "0.5px solid rgb(var(--separator))", color: "rgb(var(--text-secondary))" }
      }
    >
      {label}
    </button>
  );
}

function FeaturedCard({ track, isActive, onClick }: { track: GospelTrack; isActive: boolean; onClick: () => void }) {
  return (
    <button className="shrink-0 text-left" style={{ width: 160 }} onClick={onClick}>
      <div className="relative mb-2">
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} className="h-40 w-40 rounded-2xl object-cover" />
        ) : (
          <div
            className="flex h-40 w-40 items-center justify-center rounded-2xl text-3xl"
            style={{ backgroundColor: "rgb(var(--bg-secondary))", border: "0.5px solid rgb(var(--separator))" }}
          >
            🎵
          </div>
        )}
        {isActive && (
          <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-accent">
            <Play className="ml-0.5 h-3 w-3 fill-white text-white" />
          </div>
        )}
      </div>
      <p className="truncate font-sans text-[13px] font-semibold text-text-primary">{track.title}</p>
      <p className="truncate font-sans text-[11px] text-text-secondary">{track.artist_name}</p>
    </button>
  );
}

function TrackRow({ track, isActive, onClick, onLike }: { track: GospelTrack; isActive: boolean; onClick: () => void; onLike: (e: React.MouseEvent) => void }) {
  return (
    <button
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${isActive ? "bg-accent/10" : ""}`}
      onClick={onClick}
    >
      {track.cover_url ? (
        <img src={track.cover_url} alt={track.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: "rgb(var(--bg-secondary))", border: "0.5px solid rgb(var(--separator))" }}
        >
          🎵
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[14px] font-semibold text-text-primary">{track.title}</p>
        <p className="truncate font-sans text-[12px] text-text-secondary">{track.artist_name}</p>
      </div>

      <span className="shrink-0 font-sans text-[11px] text-text-secondary">
        {formatDuration(track.duration_seconds)}
      </span>

      <button onClick={onLike} className="shrink-0 p-1" aria-label={track.is_liked ? "Retirer des favoris" : "Ajouter aux favoris"}>
        <Heart
          className="h-5 w-5 transition-colors"
          style={track.is_liked ? { color: "rgb(var(--accent))", fill: "rgb(var(--accent))" } : { color: "rgb(var(--text-tertiary))" }}
        />
      </button>
    </button>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-32 rounded-full bg-bg-secondary" />
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 w-40 shrink-0 rounded-2xl bg-bg-secondary" />
        ))}
      </div>
      <div className="mt-6 h-4 w-40 rounded-full bg-bg-secondary" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-bg-secondary" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded-full bg-bg-secondary" />
            <div className="h-3 w-1/2 rounded-full bg-bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}
