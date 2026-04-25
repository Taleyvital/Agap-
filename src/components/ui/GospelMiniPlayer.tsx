"use client";

import { usePathname, useRouter } from "next/navigation";
import { Play, Pause, X, ChevronUp } from "lucide-react";
import { useGospelPlayer } from "@/components/providers/GospelPlayerProvider";
import { formatDuration } from "@/types/gospel";

export function GospelMiniPlayer() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentTrack, isPlaying, currentTime, duration, togglePlay, close } = useGospelPlayer();

  // Hide on full player page
  if (!currentTrack || pathname.startsWith("/gospel/") && pathname !== "/gospel") return null;

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      className="fixed left-1/2 z-40 -translate-x-1/2 px-3"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 8px) + 4px + 72px)", width: "min(430px, 100vw)" }}
    >
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{ backgroundColor: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 h-[2px] w-full" style={{ backgroundColor: "#2a2a2a" }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progress}%`, backgroundColor: "#7B6FD4" }}
          />
        </div>

        <div className="flex items-center gap-3 px-4 py-3 pt-4">
          {/* Cover */}
          <button
            className="shrink-0 cursor-pointer"
            onClick={() => router.push(`/gospel/${currentTrack.id}`)}
            aria-label="Ouvrir le lecteur"
          >
            {currentTrack.cover_url ? (
              <img
                src={currentTrack.cover_url}
                alt={currentTrack.title}
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                style={{ backgroundColor: "#7B6FD4" }}
              >
                🎵
              </div>
            )}
          </button>

          {/* Info */}
          <button
            className="min-w-0 flex-1 text-left"
            onClick={() => router.push(`/gospel/${currentTrack.id}`)}
          >
            <p className="truncate font-sans text-[13px] font-semibold text-[#E8E8E8]">
              {currentTrack.title}
            </p>
            <p className="truncate font-sans text-[11px] text-[#666666]">
              {currentTrack.artist_name}
            </p>
          </button>

          {/* Time */}
          <span className="shrink-0 font-sans text-[11px] text-[#666666]">
            {formatDuration(Math.floor(currentTime))}
          </span>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "#7B6FD4" }}
            aria-label={isPlaying ? "Pause" : "Lecture"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-white text-white" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
            )}
          </button>

          {/* Expand to full player */}
          <button
            onClick={() => router.push(`/gospel/${currentTrack.id}`)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ color: "#666666" }}
            aria-label="Ouvrir le lecteur"
          >
            <ChevronUp className="h-4 w-4" />
          </button>

          {/* Close */}
          <button
            onClick={close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{ color: "#666666" }}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
