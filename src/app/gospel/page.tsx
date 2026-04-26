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
  lyrics_offset: number;
  duration_seconds: number;
  unique_plays: number;      // écoutes uniques (user × jour)
  unique_listeners: number;  // auditeurs distincts
  likes_count: number;
  submitted_at: string;
  published_at: string | null;
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
  const [offsetValue, setOffsetValue]     = useState(0);
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

    const { data: tracksData } = await supabase
      .from("gospel_tracks")
      .select("id,title,artist_name,cover_url,status,rejection_reason,lyrics,lyrics_offset,duration_seconds,submitted_at,published_at")
      .eq("artist_id", user.id)
      .order("submitted_at", { ascending: false });

    if (!tracksData || tracksData.length === 0) { setMyTracks([]); return; }

    const ids = tracksData.map((t) => t.id);

    // Fetch unique plays + likes in parallel
    const [playsRes, likesRes] = await Promise.all([
      supabase.from("gospel_plays").select("track_id, user_id").in("track_id", ids),
      supabase.from("gospel_likes").select("track_id").in("track_id", ids),
    ]);

    // Aggregate unique plays (rows) and unique listeners (distinct user_id) per track
    const playsCount: Record<string, number> = {};
    const listenersSet: Record<string, Set<string>> = {};
    for (const p of playsRes.data ?? []) {
      playsCount[p.track_id] = (playsCount[p.track_id] ?? 0) + 1;
      (listenersSet[p.track_id] ??= new Set()).add(p.user_id);
    }

    const likesByTrack: Record<string, number> = {};
    for (const l of likesRes.data ?? []) {
      likesByTrack[l.track_id] = (likesByTrack[l.track_id] ?? 0) + 1;
    }

    setMyTracks(
      tracksData.map((t) => ({
        ...t,
        unique_plays:     playsCount[t.id] ?? 0,
        unique_listeners: listenersSet[t.id]?.size ?? 0,
        likes_count:      likesByTrack[t.id] ?? 0,
      })) as MyTrack[]
    );
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
    setOffsetValue(track.lyrics_offset ?? 0);
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
        body: JSON.stringify({ lyrics: lyricsValue, lyrics_offset: offsetValue }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMyTracks((prev) =>
        prev.map((t) => t.id === editingTrack.id ? { ...t, lyrics: lyricsValue, lyrics_offset: offsetValue, status: json.resubmitted ? "pending" : t.status } : t)
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

            {/* Sheet — flex-col + fixed height, scroll inside */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-[24px] bg-bg-secondary"
              style={{ height: "88dvh" }}
            >
              {/* Handle */}
              <div className="flex-shrink-0 flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-separator" />
              </div>

              {/* ── Edit lyrics view ── */}
              {editingTrack ? (
                <>
                  <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 border-b border-separator">
                    <button onClick={() => setEditingTrack(null)} className="text-text-secondary">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-[10px] uppercase tracking-widest text-text-secondary">Modifier les paroles</p>
                      <p className="truncate font-serif text-[15px] italic text-text-primary">{editingTrack.title}</p>
                    </div>
                  </div>

                  {/* Scrollable zone */}
                  <div
                    className="flex-1 px-5 py-4"
                    style={{ overflowY: "scroll", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                  >
                    {/* Intro offset */}
                    <div className="mb-4 rounded-xl bg-bg-primary px-4 py-3">
                      <p className="font-sans text-[11px] uppercase tracking-widest text-text-secondary mb-2">
                        Début des paroles (secondes d&apos;intro)
                      </p>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min={0}
                          max={300}
                          value={offsetValue}
                          onChange={(e) => setOffsetValue(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                          className="w-24 rounded-lg bg-bg-secondary border border-separator px-3 py-2 font-sans text-[14px] text-text-primary text-center focus:outline-none focus:border-accent"
                        />
                        <p className="font-sans text-[12px] text-text-tertiary leading-snug">
                          Si ton instru dure 30s avant les paroles, écris 30
                        </p>
                      </div>
                    </div>

                    <textarea
                      ref={lyricsRef}
                      value={lyricsValue}
                      onChange={(e) => setLyricsValue(e.target.value)}
                      maxLength={3000}
                      rows={12}
                      placeholder="Écris les paroles ici…"
                      className="w-full rounded-xl bg-bg-primary px-4 py-3 font-sans text-[14px] text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                    />
                    <p className="mt-1 text-right font-sans text-[11px] text-text-tertiary">{lyricsValue.length}/3000</p>

                    {editingTrack.status === "approved" && (
                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f0c051]/10 px-4 py-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#f0c051]" />
                        <p className="font-sans text-[12px] text-[#f0c051]">
                          Cette track est approuvée. Modifier les paroles la repassera en attente de validation.
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex-shrink-0 px-5 py-4 border-t border-separator">
                    <button
                      onClick={saveLyrics}
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 font-sans text-[13px] font-bold tracking-wide text-white transition-opacity disabled:opacity-50"
                    >
                      {saving ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <><Check className="h-4 w-4" /> Sauvegarder</>
                      )}
                    </button>
                  </div>
                </>

              ) : (
                /* ── Dashboard view ── */
                <>
                  <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-separator">
                    <div>
                      <h2 className="font-serif text-[18px] italic text-text-primary">Studio</h2>
                      <p className="font-sans text-[11px] text-text-secondary">{myTracks.length} titre{myTracks.length !== 1 ? "s" : ""} soumis</p>
                    </div>
                    <button onClick={() => setShowDrawer(false)}>
                      <X className="h-5 w-5 text-text-secondary" />
                    </button>
                  </div>

                  {/* Scrollable zone */}
                  <div
                    className="flex-1 px-5 py-4"
                    style={{ overflowY: "scroll", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
                  >
                    <div className="space-y-4">
                      {/* Feedback message */}
                      <AnimatePresence>
                        {drawerMsg && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-center gap-2 rounded-xl px-4 py-3"
                            style={{ backgroundColor: drawerMsg.ok ? "#4CAF8215" : "#ff6b6b15" }}
                          >
                            <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: drawerMsg.ok ? "#4CAF82" : "#ff6b6b" }} />
                            <p className="font-sans text-[13px]" style={{ color: drawerMsg.ok ? "#4CAF82" : "#ff6b6b" }}>
                              {drawerMsg.text}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {myTracks.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 py-16">
                          <Music className="h-10 w-10 text-text-tertiary" />
                          <p className="font-sans text-[14px] text-text-secondary">Aucun titre soumis</p>
                          <button
                            onClick={() => { setShowDrawer(false); router.push("/gospel/upload"); }}
                            className="mt-1 rounded-2xl border border-accent/40 px-5 py-2 font-sans text-[13px] font-semibold text-accent"
                          >
                            Soumettre un titre
                          </button>
                        </div>
                      ) : (
                        <>
                          <ArtistStatsBanner tracks={myTracks} />
                          {myTracks.map((track) => (
                            <TrackDashboardCard
                              key={track.id}
                              track={track}
                              isConfirmingDelete={confirmDeleteId === track.id}
                              onEdit={() => startEdit(track)}
                              onDeleteRequest={() => { setConfirmDeleteId(track.id); setDrawerMsg(null); }}
                              onDeleteCancel={() => setConfirmDeleteId(null)}
                              onDeleteConfirm={() => deleteTrack(track.id)}
                            />
                          ))}
                          <div className="h-24" />
                        </>
                      )}
                    </div>
                  </div>
                </>
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

function ArtistStatsBanner({ tracks }: { tracks: MyTrack[] }) {
  const totalPlays     = tracks.reduce((s, t) => s + t.unique_plays, 0);
  const totalListeners = tracks.reduce((s, t) => s + t.unique_listeners, 0);
  const totalLikes     = tracks.reduce((s, t) => s + t.likes_count, 0);
  const approved       = tracks.filter((t) => t.status === "approved").length;

  return (
    <div className="grid grid-cols-2 gap-3 mb-1">
      <StatBox label="Écoutes uniques"  value={totalPlays.toLocaleString()}     icon="▶" color="#7B6FD4" />
      <StatBox label="Auditeurs"        value={totalListeners.toLocaleString()}  icon="👤" color="#9B8FF4" />
      <StatBox label="Likes totaux"     value={totalLikes.toLocaleString()}      icon="♥" color="#ff6b6b" />
      <StatBox label="Approuvés"        value={String(approved)}                 icon="✓" color="#4CAF82" />
    </div>
  );
}

function StatBox({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div className="rounded-2xl bg-bg-primary border border-separator px-4 py-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px]" style={{ color }}>{icon}</span>
        <span className="font-sans text-[10px] uppercase tracking-wider text-text-secondary">{label}</span>
      </div>
      <p className="font-serif text-[22px] text-text-primary leading-none">{value}</p>
    </div>
  );
}

function TrackDashboardCard({
  track,
  isConfirmingDelete,
  onEdit,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: {
  track: MyTrack;
  isConfirmingDelete: boolean;
  onEdit: () => void;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}) {
  const submitted = new Date(track.submitted_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const published = track.published_at
    ? new Date(track.published_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
    : null;

  return (
    <div className="rounded-2xl bg-bg-primary border border-separator overflow-hidden">
      {/* Track identity row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-bg-secondary text-lg border border-separator">🎵</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-sans text-[14px] font-semibold text-text-primary">{track.title}</p>
          <p className="truncate font-sans text-[11px] text-text-secondary">{track.artist_name} · {formatDuration(track.duration_seconds)}</p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 font-sans text-[10px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: `${STATUS_COLOR[track.status]}18`, color: STATUS_COLOR[track.status] }}
        >
          {STATUS_LABEL[track.status]}
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 divide-x divide-separator border-t border-separator">
        <div className="flex flex-col items-center py-3 gap-0.5">
          <span className="font-serif text-[16px] text-text-primary leading-none">{track.unique_plays.toLocaleString()}</span>
          <span className="font-sans text-[8px] uppercase tracking-wider text-text-tertiary">Écoutes</span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5">
          <span className="font-serif text-[16px] text-text-primary leading-none">{track.unique_listeners.toLocaleString()}</span>
          <span className="font-sans text-[8px] uppercase tracking-wider text-text-tertiary">Auditeurs</span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5">
          <span className="font-serif text-[16px] text-text-primary leading-none">{track.likes_count.toLocaleString()}</span>
          <span className="font-sans text-[8px] uppercase tracking-wider text-text-tertiary">Likes</span>
        </div>
        <div className="flex flex-col items-center py-3 gap-0.5">
          <span className="font-serif text-[16px] text-text-primary leading-none">{track.lyrics ? track.lyrics.split(/\s+/).length : 0}</span>
          <span className="font-sans text-[8px] uppercase tracking-wider text-text-tertiary">Mots</span>
        </div>
      </div>

      {/* Dates */}
      <div className="flex gap-4 px-4 py-2.5 border-t border-separator">
        <div className="flex items-center gap-1.5">
          <span className="font-sans text-[10px] text-text-tertiary">Soumis</span>
          <span className="font-sans text-[10px] text-text-secondary">{submitted}</span>
        </div>
        {published && (
          <div className="flex items-center gap-1.5">
            <span className="font-sans text-[10px] text-text-tertiary">Publié</span>
            <span className="font-sans text-[10px] text-[#4CAF82]">{published}</span>
          </div>
        )}
      </div>

      {/* Rejection reason */}
      {track.status === "rejected" && track.rejection_reason && (
        <div className="mx-4 mb-3 rounded-xl bg-danger/10 px-3 py-2 border border-danger/20">
          <p className="font-sans text-[11px] text-danger leading-relaxed">{track.rejection_reason}</p>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-separator">
        {isConfirmingDelete ? (
          <div className="flex items-center gap-2 px-4 py-3">
            <p className="flex-1 font-sans text-[12px] text-text-secondary">Supprimer définitivement ?</p>
            <button onClick={onDeleteCancel} className="rounded-xl border border-separator px-3 py-1.5 font-sans text-[12px] text-text-secondary">
              Annuler
            </button>
            <button onClick={onDeleteConfirm} className="rounded-xl bg-danger/15 px-3 py-1.5 font-sans text-[12px] font-semibold text-danger">
              Supprimer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-separator">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 py-3 font-sans text-[12px] font-medium text-text-primary transition-colors active:bg-bg-secondary"
            >
              <Pencil className="h-3.5 w-3.5 text-accent" />
              Paroles
            </button>
            <button
              onClick={onDeleteRequest}
              className="flex items-center justify-center gap-2 py-3 font-sans text-[12px] font-medium text-text-primary transition-colors active:bg-bg-secondary"
            >
              <Trash2 className="h-3.5 w-3.5 text-danger" />
              Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
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
