"use client";

import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown, Heart, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Music,
} from "lucide-react";
import { useGospelPlayer } from "@/components/providers/GospelPlayerProvider";
import type { GospelTrack } from "@/types/gospel";
import { formatDuration } from "@/types/gospel";

interface PageProps {
  params: Promise<{ id: string }>;
}

type TabType = "player" | "lyrics";

export default function GospelPlayerPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const {
    currentTrack, isPlaying, currentTime, duration,
    play, togglePlay, seek, next, prev,
    toggleShuffle, toggleRepeat, isShuffle, isRepeat,
  } = useGospelPlayer();

  const [track, setTrack]       = useState<GospelTrack | null>(currentTrack);
  const [tab, setTab]           = useState<TabType>("player");
  const [isLiked, setIsLiked]   = useState(false);
  const [loading, setLoading]   = useState(!currentTrack || currentTrack.id !== id);
  const progressRef             = useRef<HTMLDivElement>(null);

  // Load track if not already in player
  useEffect(() => {
    if (currentTrack?.id === id) {
      setTrack(currentTrack);
      setIsLiked(!!currentTrack.is_liked);
      setLoading(false);
      return;
    }
    fetch(`/api/gospel/tracks/${id}`)
      .then((r) => r.json())
      .then(({ track: t }) => {
        if (t) {
          setTrack(t);
          setIsLiked(!!t.is_liked);
          play(t, [t]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync liked state when currentTrack changes
  useEffect(() => {
    if (currentTrack?.id === id) {
      setTrack(currentTrack);
    }
  }, [currentTrack, id]);

  const displayTrack = currentTrack?.id === id ? currentTrack : track;
  const displayTime  = currentTrack?.id === id ? currentTime : 0;
  const displayDur   = currentTrack?.id === id ? duration : (track?.duration_seconds ?? 0);
  const progress     = displayDur > 0 ? (displayTime / displayDur) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = (e.clientX - rect.left) / rect.width;
    seek(pct * displayDur);
  };

  const handleLike = async () => {
    if (!displayTrack) return;
    setIsLiked((v) => !v);
    await fetch(`/api/gospel/tracks/${displayTrack.id}/like`, { method: "POST" });
  };

  // Lyrics sync: estimate current line by position in text
  const lyricsLines = (displayTrack?.lyrics ?? "").split("\n").filter(Boolean);
  const currentLineIdx =
    displayDur > 0 && lyricsLines.length > 0
      ? Math.floor((displayTime / displayDur) * lyricsLines.length)
      : -1;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#141414]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#7B6FD4] border-t-transparent" />
      </div>
    );
  }

  if (!displayTrack) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#141414]">
        <Music className="h-12 w-12 text-[#2a2a2a]" />
        <p className="font-sans text-[14px] text-[#666666]">Titre introuvable</p>
        <button onClick={() => router.back()} className="font-sans text-[14px]" style={{ color: "#7B6FD4" }}>
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#141414]" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: "#1c1c1c" }}>
          <ChevronDown className="h-5 w-5 text-[#E8E8E8]" />
        </button>
        <div className="text-center">
          <p className="font-sans text-[11px] uppercase tracking-widest text-[#666666]">Lecture en cours</p>
        </div>
        <div className="h-10 w-10" />
      </div>

      {/* Tabs */}
      <div className="mx-5 mb-6 mt-2 flex rounded-2xl p-1" style={{ backgroundColor: "#1c1c1c" }}>
        {(["player", "lyrics"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 rounded-xl py-2 font-sans text-[13px] font-semibold transition-colors"
            style={
              tab === t
                ? { backgroundColor: "#7B6FD4", color: "#fff" }
                : { color: "#666666" }
            }
          >
            {t === "player" ? "Lecteur" : "Paroles"}
          </button>
        ))}
      </div>

      {tab === "player" ? (
        <div className="flex flex-1 flex-col items-center px-8">
          {/* Cover art */}
          <div className="mb-8 w-full max-w-[280px]">
            {displayTrack.cover_url ? (
              <img
                src={displayTrack.cover_url}
                alt={displayTrack.title}
                className="aspect-square w-full rounded-[20px] object-cover"
              />
            ) : (
              <div
                className="flex aspect-square w-full items-center justify-center rounded-[20px] text-6xl"
                style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              >
                🎵
              </div>
            )}
          </div>

          {/* Title + artist + like */}
          <div className="mb-6 flex w-full items-start justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="font-serif text-[22px] text-[#E8E8E8]">{displayTrack.title}</h1>
              <p className="mt-1 font-sans text-[14px] text-[#666666]">{displayTrack.artist_name}</p>
              {displayTrack.album && (
                <p className="font-sans text-[12px] text-[#444]">{displayTrack.album}</p>
              )}
            </div>
            <button onClick={handleLike} className="ml-3 mt-1 p-1">
              <Heart
                className="h-6 w-6 transition-colors"
                style={isLiked ? { color: "#7B6FD4", fill: "#7B6FD4" } : { color: "#444" }}
              />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-2 w-full">
            <div
              ref={progressRef}
              className="h-1 w-full cursor-pointer rounded-full"
              style={{ backgroundColor: "#2a2a2a" }}
              onClick={handleSeek}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: "#7B6FD4" }}
              />
            </div>
          </div>
          <div className="mb-8 flex w-full justify-between">
            <span className="font-sans text-[11px] text-[#666666]">{formatDuration(Math.floor(displayTime))}</span>
            <span className="font-sans text-[11px] text-[#666666]">{formatDuration(displayDur)}</span>
          </div>

          {/* Secondary controls */}
          <div className="mb-8 flex w-full items-center justify-between px-2">
            <button onClick={toggleShuffle} className="p-2">
              <Shuffle
                className="h-5 w-5"
                style={{ color: isShuffle ? "#7B6FD4" : "#444" }}
              />
            </button>
            {/* Main controls */}
            <div className="flex items-center gap-6">
              <button onClick={prev} className="p-2">
                <SkipBack className="h-7 w-7 text-[#E8E8E8]" />
              </button>
              <button
                onClick={togglePlay}
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: "#7B6FD4" }}
              >
                {isPlaying ? (
                  <Pause className="h-7 w-7 fill-white text-white" />
                ) : (
                  <Play className="ml-1 h-7 w-7 fill-white text-white" />
                )}
              </button>
              <button onClick={next} className="p-2">
                <SkipForward className="h-7 w-7 text-[#E8E8E8]" />
              </button>
            </div>
            <button onClick={toggleRepeat} className="p-2">
              <Repeat
                className="h-5 w-5"
                style={{ color: isRepeat ? "#7B6FD4" : "#444" }}
              />
            </button>
          </div>
        </div>
      ) : (
        /* Lyrics tab */
        <div
          className="flex-1 overflow-y-auto px-6 pb-12"
          style={{ backgroundColor: "#1a1830" }}
        >
          {lyricsLines.length > 0 ? (
            <div className="space-y-3 pt-4">
              {lyricsLines.map((line, idx) => (
                <p
                  key={idx}
                  className="font-sans text-[15px] leading-relaxed transition-colors"
                  style={{
                    color: idx === currentLineIdx ? "#7B6FD4" : "#E8E8E8",
                    lineHeight: 1.8,
                    fontWeight: idx === currentLineIdx ? 600 : 400,
                  }}
                >
                  {line}
                </p>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 pt-20">
              <Music className="h-10 w-10 text-[#2a2a2a]" />
              <p className="font-sans text-[14px] text-[#666666]">Paroles non disponibles</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
