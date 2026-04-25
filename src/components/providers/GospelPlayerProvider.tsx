"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { GospelTrack } from "@/types/gospel";

interface GospelPlayerState {
  currentTrack: GospelTrack | null;
  queue: GospelTrack[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isShuffle: boolean;
  isRepeat: boolean;
}

interface GospelPlayerActions {
  play: (track: GospelTrack, queue?: GospelTrack[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  next: () => void;
  prev: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  close: () => void;
}

type GospelPlayerContextValue = GospelPlayerState & GospelPlayerActions;

const GospelPlayerContext = createContext<GospelPlayerContextValue | null>(null);

export function GospelPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playCountedRef = useRef(false);

  const [state, setState] = useState<GospelPlayerState>({
    currentTrack: null,
    queue: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isShuffle: false,
    isRepeat: false,
  });

  // Initialize audio element once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const audio = new Audio();
    audio.preload = "metadata";

    audio.addEventListener("timeupdate", () => {
      setState((s) => ({ ...s, currentTime: audio.currentTime }));

      // Award play XP once per track after 30s
      if (audio.currentTime >= 30 && !playCountedRef.current) {
        playCountedRef.current = true;
        fetch("/api/xp/award", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actionType: "GOSPEL_TRACK_PLAYED" }),
        }).catch(() => {});
      }
    });

    audio.addEventListener("loadedmetadata", () => {
      setState((s) => ({ ...s, duration: audio.duration || 0 }));
    });

    audio.addEventListener("ended", () => {
      setState((s) => {
        if (s.isRepeat) {
          audio.currentTime = 0;
          audio.play().catch(() => {});
          return s;
        }
        const currentIndex = s.queue.findIndex((t) => t.id === s.currentTrack?.id);
        const nextIndex = s.isShuffle
          ? Math.floor(Math.random() * s.queue.length)
          : currentIndex + 1;
        const nextTrack = s.queue[nextIndex] ?? null;
        if (nextTrack) {
          audio.src = nextTrack.audio_url;
          audio.play().catch(() => {});
          playCountedRef.current = false;
          return { ...s, currentTrack: nextTrack, isPlaying: true, currentTime: 0 };
        }
        return { ...s, isPlaying: false, currentTime: 0 };
      });
    });

    audio.addEventListener("play",  () => setState((s) => ({ ...s, isPlaying: true  })));
    audio.addEventListener("pause", () => setState((s) => ({ ...s, isPlaying: false })));

    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const play = useCallback((track: GospelTrack, queue?: GospelTrack[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    playCountedRef.current = false;
    audio.src = track.audio_url;
    audio.play().catch(() => {});

    // Increment play count in background
    fetch(`/api/gospel/tracks/${track.id}/play`, { method: "POST" }).catch(() => {});

    setState((s) => ({
      ...s,
      currentTrack: track,
      queue: queue ?? s.queue,
      isPlaying: true,
      currentTime: 0,
    }));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(() => {
    audioRef.current?.play().catch(() => {});
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setState((s) => ({ ...s, currentTime: time }));
  }, []);

  const next = useCallback(() => {
    setState((s) => {
      const idx = s.queue.findIndex((t) => t.id === s.currentTrack?.id);
      const nextIdx = s.isShuffle
        ? Math.floor(Math.random() * s.queue.length)
        : (idx + 1) % s.queue.length;
      const nextTrack = s.queue[nextIdx];
      if (!nextTrack || !audioRef.current) return s;
      playCountedRef.current = false;
      audioRef.current.src = nextTrack.audio_url;
      audioRef.current.play().catch(() => {});
      fetch(`/api/gospel/tracks/${nextTrack.id}/play`, { method: "POST" }).catch(() => {});
      return { ...s, currentTrack: nextTrack, isPlaying: true, currentTime: 0 };
    });
  }, []);

  const prev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setState((s) => {
      const idx = s.queue.findIndex((t) => t.id === s.currentTrack?.id);
      const prevIdx = idx > 0 ? idx - 1 : s.queue.length - 1;
      const prevTrack = s.queue[prevIdx];
      if (!prevTrack || !audioRef.current) return s;
      playCountedRef.current = false;
      audioRef.current.src = prevTrack.audio_url;
      audioRef.current.play().catch(() => {});
      return { ...s, currentTrack: prevTrack, isPlaying: true, currentTime: 0 };
    });
  }, []);

  const toggleShuffle = useCallback(() => {
    setState((s) => ({ ...s, isShuffle: !s.isShuffle }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState((s) => ({ ...s, isRepeat: !s.isRepeat }));
  }, []);

  const close = useCallback(() => {
    audioRef.current?.pause();
    if (audioRef.current) audioRef.current.src = "";
    setState((s) => ({ ...s, currentTrack: null, isPlaying: false, currentTime: 0 }));
  }, []);

  return (
    <GospelPlayerContext.Provider
      value={{ ...state, play, pause, resume, togglePlay, seek, next, prev, toggleShuffle, toggleRepeat, close }}
    >
      {children}
    </GospelPlayerContext.Provider>
  );
}

export function useGospelPlayer(): GospelPlayerContextValue {
  const ctx = useContext(GospelPlayerContext);
  if (!ctx) throw new Error("useGospelPlayer must be used inside GospelPlayerProvider");
  return ctx;
}
