"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Heart, Play, Upload, Music } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { PremiumPaywall } from "@/components/ui/PremiumPaywall";
import { useGospelPlayer } from "@/components/providers/GospelPlayerProvider";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { GospelTrack } from "@/types/gospel";
import { formatDuration, GOSPEL_GENRES } from "@/types/gospel";

export default function GospelPage() {
  const router = useRouter();
  const { play, currentTrack, isPlaying } = useGospelPlayer();

  // When NEXT_PUBLIC_GOSPEL_PREMIUM_ONLY=true the paywall is enforced;
  // during beta the var is absent/false so all authenticated users get full access.
  const premiumGateEnabled = process.env.NEXT_PUBLIC_GOSPEL_PREMIUM_ONLY === "true";

  const [isPremium, setIsPremium]       = useState<boolean | null>(null);
  const [showPaywall, setShowPaywall]   = useState(false);
  const [tracks, setTracks]             = useState<GospelTrack[]>([]);
  const [featured, setFeatured]         = useState<GospelTrack[]>([]);
  const [activeGenre, setActiveGenre]   = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);

  // Resolve access: skip DB lookup entirely when gate is disabled
  useEffect(() => {
    if (!premiumGateEnabled) {
      setIsPremium(true);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", user.id)
        .maybeSingle();
      const premium = data?.is_premium ?? false;
      setIsPremium(premium);
      if (!premium) setShowPaywall(true);
    });
  }, [premiumGateEnabled]);

  const fetchTracks = useCallback(async (genre?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "40" });
    if (genre) params.set("genre", genre);
    const res  = await fetch(`/api/gospel/tracks?${params}`);
    const data = await res.json();
    const list: GospelTrack[] = data.tracks ?? [];
    setTracks(list);
    // Featured = top 5 by play_count
    setFeatured([...list].sort((a, b) => b.play_count - a.play_count).slice(0, 5));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isPremium) fetchTracks(activeGenre ?? undefined);
  }, [isPremium, activeGenre, fetchTracks]);

  const handleTrackClick = (track: GospelTrack) => {
    play(track, tracks);
    router.push(`/gospel/${track.id}`);
  };

  const handleLike = async (e: React.MouseEvent, track: GospelTrack) => {
    e.stopPropagation();
    await fetch(`/api/gospel/tracks/${track.id}/like`, { method: "POST" });
    setTracks((prev) =>
      prev.map((t) =>
        t.id === track.id ? { ...t, is_liked: !t.is_liked } : t,
      ),
    );
  };

  if (isPremium === null) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center bg-[#141414]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7B6FD4] border-t-transparent" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="relative min-h-screen bg-[#141414]">
        {/* Blurred overlay for non-premium */}
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
              <h1 className="font-serif text-[22px] text-[#E8E8E8]">Gospel</h1>
              <p className="mt-0.5 font-sans text-[13px] text-[#666666]">Musique qui élève l&apos;âme</p>
            </div>
            <button
              onClick={() => router.push("/gospel/upload")}
              className="flex items-center gap-2 rounded-2xl px-4 py-2 font-sans text-[13px] font-semibold"
              style={{ border: "1px solid rgba(123,111,212,0.4)", color: "#7B6FD4" }}
            >
              <Upload className="h-4 w-4" />
              Soumettre
            </button>
          </div>

          {loading ? (
            <SkeletonLoader />
          ) : (
            <>
              {/* Genre chips */}
              <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <GenreChip label="Tous" active={!activeGenre} onClick={() => setActiveGenre(null)} />
                {GOSPEL_GENRES.map((g) => (
                  <GenreChip
                    key={g}
                    label={g}
                    active={activeGenre === g}
                    onClick={() => setActiveGenre(g)}
                  />
                ))}
              </div>

              {/* En ce moment — featured carousel */}
              {featured.length > 0 && (
                <section className="mb-8">
                  <h2 className="mb-4 font-sans text-[15px] font-semibold text-[#E8E8E8]">En ce moment</h2>
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

              {/* Recently added */}
              {tracks.length > 0 && (
                <section>
                  <h2 className="mb-4 font-sans text-[15px] font-semibold text-[#E8E8E8]">
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
                  <Music className="h-12 w-12 text-[#2a2a2a]" />
                  <p className="font-sans text-[14px] text-[#666666]">Aucun titre disponible</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showPaywall && (
        <PremiumPaywall onClose={() => setShowPaywall(false)} />
      )}
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
          ? { backgroundColor: "#7B6FD4", color: "#fff" }
          : { backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a", color: "#666666" }
      }
    >
      {label}
    </button>
  );
}

function FeaturedCard({
  track,
  isActive,
  onClick,
}: {
  track: GospelTrack;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button className="shrink-0 text-left" style={{ width: 160 }} onClick={onClick}>
      <div className="relative mb-2">
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={track.title}
            className="h-40 w-40 rounded-2xl object-cover"
          />
        ) : (
          <div
            className="flex h-40 w-40 items-center justify-center rounded-2xl text-3xl"
            style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
          >
            🎵
          </div>
        )}
        {isActive && (
          <div
            className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: "#7B6FD4" }}
          >
            <Play className="ml-0.5 h-3 w-3 fill-white text-white" />
          </div>
        )}
      </div>
      <p className="truncate font-sans text-[13px] font-semibold text-[#E8E8E8]">{track.title}</p>
      <p className="truncate font-sans text-[11px] text-[#666666]">{track.artist_name}</p>
    </button>
  );
}

function TrackRow({
  track,
  isActive,
  onClick,
  onLike,
}: {
  track: GospelTrack;
  isActive: boolean;
  onClick: () => void;
  onLike: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors"
      style={isActive ? { backgroundColor: "rgba(123,111,212,0.1)" } : {}}
      onClick={onClick}
    >
      {/* Cover */}
      {track.cover_url ? (
        <img src={track.cover_url} alt={track.title} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      ) : (
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-xl"
          style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
        >
          🎵
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[14px] font-semibold text-[#E8E8E8]">{track.title}</p>
        <p className="truncate font-sans text-[12px] text-[#666666]">{track.artist_name}</p>
      </div>

      {/* Duration */}
      <span className="shrink-0 font-sans text-[11px] text-[#666666]">
        {formatDuration(track.duration_seconds)}
      </span>

      {/* Like */}
      <button
        onClick={onLike}
        className="shrink-0 p-1"
        aria-label={track.is_liked ? "Retirer des favoris" : "Ajouter aux favoris"}
      >
        <Heart
          className="h-5 w-5 transition-colors"
          style={track.is_liked ? { color: "#7B6FD4", fill: "#7B6FD4" } : { color: "#444" }}
        />
      </button>
    </button>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-4 w-32 rounded-full bg-[#1c1c1c]" />
      <div className="flex gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 w-40 shrink-0 rounded-2xl bg-[#1c1c1c]" />
        ))}
      </div>
      <div className="mt-6 h-4 w-40 rounded-full bg-[#1c1c1c]" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 rounded-xl bg-[#1c1c1c]" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-2/3 rounded-full bg-[#1c1c1c]" />
            <div className="h-3 w-1/2 rounded-full bg-[#1c1c1c]" />
          </div>
        </div>
      ))}
    </div>
  );
}
