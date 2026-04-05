"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";

const DURATIONS = [5, 10, 15, 30] as const;

const AMBIANCES = [
  {
    id: "ocean",
    title: "Ocean",
    img: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80",
  },
  {
    id: "forest",
    title: "Forest",
    img: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80",
  },
  {
    id: "church",
    title: "Church",
    img: "https://images.unsplash.com/photo-1438232992991-995b7058bbb3?w=400&q=80",
  },
  {
    id: "silence",
    title: "Silence",
    img: "https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=400&q=80",
  },
] as const;

export default function PrayerPage() {
  const [minutes, setMinutes] = useState(10);
  const [remaining, setRemaining] = useState(10 * 60);
  const [running, setRunning] = useState(false);
  const [ambiance, setAmbiance] = useState<string>(AMBIANCES[0].id);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const minutesRef = useRef(minutes);
  const ambianceRef = useRef(ambiance);

  useEffect(() => {
    minutesRef.current = minutes;
  }, [minutes]);
  useEffect(() => {
    ambianceRef.current = ambiance;
  }, [ambiance]);

  const totalSeconds = minutes * 60;
  const progress =
    totalSeconds > 0 ? Math.min(1, remaining / totalSeconds) : 0;

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  useEffect(() => {
    return () => clearTick();
  }, []);

  useEffect(() => {
    if (!running) return;
    tickRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearTick();
          setRunning(false);
          void fetch("/api/prayer/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              duration_minutes: minutesRef.current,
              ambiance: ambianceRef.current,
              completed: true,
            }),
          });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearTick();
  }, [running]);

  const start = useCallback(() => {
    setRemaining(minutes * 60);
    setRunning(true);
  }, [minutes]);

  const stop = () => {
    clearTick();
    setRunning(false);
    setRemaining(minutes * 60);
  };

  const pause = () => {
    clearTick();
    setRunning(false);
  };

  const reset = () => {
    clearTick();
    setRunning(false);
    setRemaining(minutes * 60);
  };

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const display = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const r = 56;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - progress);

  return (
    <AppShell>
      <div className="min-h-screen bg-bg-primary px-5 pb-28 pt-8 transition-colors duration-300">
        <div className="flex flex-col items-center">
          <div className="relative mt-4 flex h-52 w-52 items-center justify-center">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                className="stroke-bg-tertiary"
                strokeWidth="6"
              />
              <circle
                cx="60"
                cy="60"
                r={r}
                fill="none"
                className="stroke-accent transition-[stroke-dashoffset] duration-1000 ease-linear"
                strokeWidth="6"
                strokeDasharray={c}
                strokeDashoffset={dash}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-serif text-5xl text-text-primary">{display}</p>
              <p className="ui-label mt-2 text-text-tertiary">
                MINUTES REMAINING
              </p>
            </div>
          </div>

          <div className="mt-10 flex gap-3">
            <button
              type="button"
              onClick={stop}
              className="rounded-2xl bg-bg-secondary px-5 py-3 font-sans text-sm text-text-secondary"
            >
              ■ Stop
            </button>
            <button
              type="button"
              onClick={pause}
              className="rounded-2xl bg-bg-secondary px-5 py-3 font-sans text-sm text-text-secondary"
            >
              ▐▐ Pause
            </button>
            <button
              type="button"
              onClick={reset}
              className="rounded-2xl bg-bg-secondary px-5 py-3 font-sans text-sm text-text-secondary"
            >
              ↺ Reset
            </button>
          </div>

          {!running ? (
            <button
              type="button"
              onClick={start}
              className="mt-8 rounded-full bg-accent px-10 py-3 font-sans text-sm uppercase tracking-wider text-white"
            >
              Démarrer
            </button>
          ) : null}

          <p className="ui-label mt-12 text-text-tertiary">Durée</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {DURATIONS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (!running) {
                    setMinutes(m);
                    setRemaining(m * 60);
                  }
                }}
                className={`rounded-full px-4 py-2 font-sans text-xs uppercase tracking-wider transition-colors ${
                  minutes === m
                    ? "bg-text-primary text-bg-primary"
                    : "bg-bg-secondary text-text-secondary hover:text-text-primary"
                }`}
              >
                {m} MIN
              </button>
            ))}
          </div>

          <p className="ui-label mt-10 text-text-tertiary">SELECT AMBIANCE</p>
          <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-3">
            {AMBIANCES.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setAmbiance(a.id)}
                className={`relative h-28 overflow-hidden rounded-xl text-left ${
                  ambiance === a.id ? "ring-2 ring-accent" : ""
                }`}
              >
                <Image
                  src={a.img}
                  alt=""
                  fill
                  className="object-cover brightness-[0.55]"
                  sizes="200px"
                />
                <span className="absolute inset-0 bg-black/35" />
                <span className="absolute bottom-2 left-2 font-serif text-lg italic text-white">
                  {a.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
