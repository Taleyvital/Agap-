"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, RotateCw, Share2, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────
interface BibleStory {
  id: string;
  passage_ref: string;
  character_name: string;
  title: string | null;
  narrative_text: string | null;
  quote: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
}

type Phase =
  | "idle"
  | "generating"
  | "requesting_audio"
  | "ready"
  | "audio_failed";

// ── Helpers ───────────────────────────────────────────────────
function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.4'/%3E%3C/svg%3E")`;

// ── Main component ────────────────────────────────────────────
function StoryPlayerContent() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const router       = useRouter();
  const passageRef = decodeURIComponent(params.passageRef as string);
  const character  = searchParams.get("character") ?? "";
  const language   = searchParams.get("language")  ?? "fr";
  const bookId     = searchParams.get("bookId")  ? Number(searchParams.get("bookId"))  : undefined;
  const chapterNum = searchParams.get("chapter") ? Number(searchParams.get("chapter")) : undefined;

  // ── State ────────────────────────────────────────────────────
  const [phase,      setPhase]      = useState<Phase>("idle");
  const [story,      setStory]      = useState<BibleStory | null>(null);
  const [audioUrl,   setAudioUrl]   = useState<string | null>(null);
  const [error,      setError]      = useState("");
  const [completed,  setCompleted]  = useState(false);
  const [shareOpen,  setShareOpen]  = useState(false);

  // Audio state
  const audioRef     = useRef<HTMLAudioElement>(null);
  const [isPlaying,  setIsPlaying]  = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [speed,      setSpeed]      = useState(1);

  // Text scroll
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);

  // ── Paragraphs ───────────────────────────────────────────────
  const paragraphs = useMemo(() => {
    if (!story?.narrative_text) return [];
    return story.narrative_text.split("\n").filter((p) => p.trim().length > 0);
  }, [story?.narrative_text]);

  const paragraphTimestamps = useMemo(() => {
    if (!paragraphs.length || !duration) return [];
    const totalChars = paragraphs.reduce((sum, p) => sum + p.length, 0);
    let cumulative = 0;
    return paragraphs.map((p) => {
      const start = (cumulative / totalChars) * duration;
      cumulative += p.length;
      const end = (cumulative / totalChars) * duration;
      return { start, end };
    });
  }, [paragraphs, duration]);

  const activeParagraphIndex = useMemo(() => {
    if (!paragraphTimestamps.length) return 0;
    const idx = paragraphTimestamps.findIndex(
      (t) => currentTime >= t.start && currentTime < t.end,
    );
    return idx === -1 ? paragraphs.length - 1 : idx;
  }, [currentTime, paragraphTimestamps, paragraphs.length]);

  // ── Auto-scroll to active paragraph ─────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const el = paragraphRefs.current[activeParagraphIndex];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeParagraphIndex, isPlaying]);

  // ── Fetch / generate story ───────────────────────────────────
  const fetchOrGenerate = useCallback(async () => {
    setPhase("generating");
    setError("");

    try {
      const res = await fetch("/api/bible/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          passage_ref: passageRef,
          character,
          language,
          book_id:     bookId,
          chapter_num: chapterNum,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Génération échouée");
      }

      const { story: s } = (await res.json()) as {
        story: BibleStory & { audio_url: string | null };
        cached: boolean;
      };

      setStory(s);

      if (s.audio_url) {
        // Cached story already has a signed URL
        setAudioUrl(s.audio_url);
        setPhase("ready");
      } else {
        // Need to generate audio
        setPhase("requesting_audio");
        await requestAudio(s.id, s.narrative_text ?? "");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
      setPhase("idle");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passageRef, character, language, bookId, chapterNum]);

  const requestAudio = async (storyId: string, narrativeText: string) => {
    try {
      const res = await fetch("/api/bible/stories/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ story_id: storyId, narrative_text: narrativeText }),
      });

      if (res.ok) {
        const { audioUrl: url } = (await res.json()) as { audioUrl: string };
        setAudioUrl(url);
        setPhase("ready");
      } else {
        setPhase("audio_failed");
      }
    } catch {
      setPhase("audio_failed");
    }
  };

  useEffect(() => {
    fetchOrGenerate();
  }, [fetchOrGenerate]);

  // ── Audio event listeners ────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate    = () => setCurrentTime(audio.currentTime);
    const onDuration      = () => setDuration(audio.duration || 0);
    const onPlay          = () => setIsPlaying(true);
    const onPause         = () => setIsPlaying(false);
    const onEnded         = async () => {
      setIsPlaying(false);
      setCompleted(true);
      // Award XP
      try {
        await fetch("/api/xp/award", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ actionType: "STORY_LISTENED_COMPLETE" }),
        });
      } catch { /* best-effort */ }
    };

    audio.addEventListener("timeupdate",      onTimeUpdate);
    audio.addEventListener("durationchange",  onDuration);
    audio.addEventListener("loadedmetadata",  onDuration);
    audio.addEventListener("play",            onPlay);
    audio.addEventListener("pause",           onPause);
    audio.addEventListener("ended",           onEnded);

    return () => {
      audio.removeEventListener("timeupdate",      onTimeUpdate);
      audio.removeEventListener("durationchange",  onDuration);
      audio.removeEventListener("loadedmetadata",  onDuration);
      audio.removeEventListener("play",            onPlay);
      audio.removeEventListener("pause",           onPause);
      audio.removeEventListener("ended",           onEnded);
    };
  }, [audioUrl]);

  // ── Audio controls ───────────────────────────────────────────
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); } else { void audio.play(); }
  };

  const seek = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + delta));
  };

  const changeSpeed = () => {
    const speeds = [0.75, 1, 1.25];
    const next = speeds[(speeds.indexOf(speed) + 1) % speeds.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  };

  const seekToRatio = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (audioRef.current) audioRef.current.currentTime = ratio * duration;
  };

  // ── Share ────────────────────────────────────────────────────
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleShare = async () => {
    if (!shareCardRef.current) return;

    try {
      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(shareCardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const file = new File([blob], "bible-immersive.png", { type: "image/png" });
        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          navigator.share({ files: [file], title: `${character} — Bible Immersive` }).catch(() => {});
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "bible-immersive.png";
          a.click();
          URL.revokeObjectURL(url);
        }
      });
    } catch {
      setShareOpen(true); // fallback: show modal with quote
    }
  };

  const displayCharacter = character || story?.character_name || "Personnage";

  // ── Rendering ────────────────────────────────────────────────
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100dvh", position: "relative", overflowX: "hidden" }}>

      {/* Audio element */}
      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} preload="auto" />
      )}

      {/* Noise grain overlay */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0,
          backgroundImage: NOISE_SVG,
          opacity: 0.025,
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{
        position:   "fixed",
        top:        0,
        left:       0,
        right:      0,
        padding:    "calc(env(safe-area-inset-top) + 14px) 20px 14px",
        display:    "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex:     20,
        background: "linear-gradient(to bottom, rgba(10,10,10,0.95) 0%, transparent 100%)",
      }}>
        <div style={{ width: 32 }} />
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "#555", margin: 0 }}>
          {displayCharacter}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 4, display: "flex", alignItems: "center" }}
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Generating state ─────────────────────────────────── */}
      <AnimatePresence>
        {(phase === "generating" || phase === "requesting_audio") && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position:       "fixed",
              inset:          0,
              zIndex:         10,
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              background:     "#0a0a0a",
              gap:            24,
            }}
          >
            {/* Pulsing initial */}
            <motion.div
              animate={{ scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              style={{
                width: 100, height: 100, borderRadius: "50%",
                background: "#1a1830",
                border: "1px solid rgba(123,111,212,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 42, color: "#E8E8E8" }}>
                {displayCharacter[0]}
              </span>
            </motion.div>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "#E8E8E8", margin: "0 0 8px" }}>
                {phase === "generating" ? "L'IA compose ton histoire…" : "Génération de l'audio…"}
              </p>
              <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                {[0, 0.2, 0.4].map((d) => (
                  <motion.div
                    key={d}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: d }}
                    style={{ width: 5, height: 5, borderRadius: "50%", background: "#7B6FD4" }}
                  />
                ))}
              </div>
            </div>

            {/* Shimmer text placeholders */}
            <div style={{ width: "80%", maxWidth: 340 }}>
              {[100, 85, 95, 70].map((w, i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.06, 0.14, 0.06] }}
                  transition={{ repeat: Infinity, duration: 1.6, delay: i * 0.15 }}
                  style={{ height: 10, width: `${w}%`, background: "#7B6FD4", borderRadius: 4, marginBottom: 10 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error state ──────────────────────────────────────── */}
      {phase === "idle" && error && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100dvh", padding: 32, textAlign: "center" }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 14, color: "#ff6b6b", marginBottom: 24 }}>{error}</p>
          <button
            type="button"
            onClick={fetchOrGenerate}
            style={{ background: "#7B6FD4", border: "none", borderRadius: 14, padding: "12px 28px", color: "white", fontFamily: "var(--font-sans)", fontSize: 14, cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      )}

      {/* ── Story ready ──────────────────────────────────────── */}
      {(phase === "ready" || phase === "audio_failed") && story && (
        <div style={{ paddingTop: "calc(env(safe-area-inset-top) + 64px)", paddingBottom: "calc(env(safe-area-inset-bottom) + 140px)" }}>

          {/* ── Audio player circle ────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px 24px" }}>

            {/* Circle with pulse */}
            <div style={{ position: "relative", width: 120, height: 120, marginBottom: 24 }}>
              <AnimatePresence>
                {isPlaying && (
                  <motion.div
                    key="ring"
                    initial={{ opacity: 0, scale: 1 }}
                    animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0.1, 0.5] }}
                    exit={{ opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    style={{
                      position: "absolute",
                      inset: -10,
                      borderRadius: "50%",
                      border: "2px solid rgba(123,111,212,0.45)",
                    }}
                  />
                )}
              </AnimatePresence>

              <div
                onClick={phase === "audio_failed" ? undefined : togglePlay}
                style={{
                  width: 120, height: 120, borderRadius: "50%",
                  background: "#1a1830",
                  border: `1.5px solid ${isPlaying ? "#7B6FD4" : "#2a2a2a"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: phase === "audio_failed" ? "default" : "pointer",
                  position: "relative",
                  transition: "border-color 0.3s",
                }}
              >
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 42, color: "#E8E8E8" }}>
                  {displayCharacter[0]}
                </span>
                {phase !== "audio_failed" && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: "rgba(0,0,0,0.35)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isPlaying
                      ? <Pause size={22} color="white" />
                      : <Play size={22} color="white" fill="white" />
                    }
                  </div>
                )}
              </div>
            </div>

            {/* Audio unavailable banner */}
            {phase === "audio_failed" && (
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#555", marginBottom: 16, textAlign: "center" }}>
                Audio temporairement indisponible · Texte disponible ci-dessous
              </p>
            )}

            {/* Progress bar */}
            {phase === "ready" && (
              <>
                <div
                  onClick={seekToRatio}
                  style={{ width: "100%", maxWidth: 340, height: 2, background: "#2a2a2a", borderRadius: 1, cursor: "pointer", position: "relative", marginBottom: 8 }}
                >
                  <div style={{ height: "100%", width: `${duration ? (currentTime / duration) * 100 : 0}%`, background: "#7B6FD4", borderRadius: 1, transition: "width 0.5s linear" }} />
                </div>
                <div style={{ width: "100%", maxWidth: 340, display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#555" }}>{formatTime(currentTime)}</span>
                  <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#555" }}>{duration ? formatTime(duration) : "—:——"}</span>
                </div>

                {/* Controls row */}
                <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                  <button type="button" onClick={() => seek(-15)} style={iconBtnStyle}>
                    <RotateCcw size={18} color="#E8E8E8" />
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, color: "#666", marginTop: 1 }}>15s</span>
                  </button>

                  <motion.button type="button" onClick={togglePlay} whileTap={{ scale: 0.93 }} style={{
                    width: 52, height: 52, borderRadius: "50%", background: "#7B6FD4",
                    border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {isPlaying ? <Pause size={22} color="white" /> : <Play size={22} color="white" fill="white" />}
                  </motion.button>

                  <button type="button" onClick={() => seek(15)} style={iconBtnStyle}>
                    <RotateCw size={18} color="#E8E8E8" />
                    <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, color: "#666", marginTop: 1 }}>15s</span>
                  </button>
                </div>

                {/* Speed */}
                <button type="button" onClick={changeSpeed} style={{ marginTop: 14, background: "rgba(123,111,212,0.1)", border: "0.5px solid rgba(123,111,212,0.25)", borderRadius: 8, padding: "4px 12px", color: "#7B6FD4", fontFamily: "var(--font-sans)", fontSize: 12, cursor: "pointer" }}>
                  {speed}x
                </button>
              </>
            )}
          </div>

          {/* ── Narrative text ─────────────────────────────── */}
          <div style={{ padding: "0 24px", maxWidth: 560, margin: "0 auto" }}>
            {paragraphs.map((para, i) => {
              const state =
                i === activeParagraphIndex ? "current"
                : i < activeParagraphIndex  ? "past"
                : "future";
              return (
                <p
                  key={i}
                  ref={(el) => { paragraphRefs.current[i] = el; }}
                  style={{
                    fontFamily:  "var(--font-serif)",
                    fontSize:    16,
                    lineHeight:  1.85,
                    margin:      "0 0 20px",
                    color:       state === "current" ? "#E8E8E8" : state === "past" ? "#444" : "#333",
                    transition:  "color 0.5s ease",
                  }}
                >
                  {para}
                </p>
              );
            })}
          </div>

          {/* ── Floating verse reference ───────────────────── */}
          <div style={{
            position:       "fixed",
            bottom:         "calc(env(safe-area-inset-bottom) + 80px)",
            left:           "50%",
            transform:      "translateX(-50%)",
            maxWidth:       "calc(100vw - 40px)",
            background:     "rgba(26,24,48,0.85)",
            backdropFilter: "blur(12px)",
            borderRadius:   12,
            padding:        "10px 16px",
            zIndex:         15,
          }}>
            <p style={{ fontFamily: "var(--font-serif)", fontSize: 12, color: "#7B6FD4", fontStyle: "italic", margin: 0, textAlign: "center", lineHeight: 1.5 }}>
              {story.passage_ref}
            </p>
          </div>

          {/* ── Share button (after completion) ────────────── */}
          <AnimatePresence>
            {completed && (
              <motion.div
                key="share"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  position:       "fixed",
                  bottom:         "calc(env(safe-area-inset-bottom) + 20px)",
                  left:           "50%",
                  transform:      "translateX(-50%)",
                  zIndex:         20,
                }}
              >
                <button
                  type="button"
                  onClick={handleShare}
                  style={{
                    background:    "rgba(123,111,212,0.15)",
                    border:        "0.5px solid rgba(123,111,212,0.4)",
                    borderRadius:  14,
                    padding:       "11px 22px",
                    color:         "#7B6FD4",
                    fontFamily:    "var(--font-sans)",
                    fontSize:      13,
                    cursor:        "pointer",
                    display:       "flex",
                    alignItems:    "center",
                    gap:           8,
                  }}
                >
                  <Share2 size={14} />
                  Partager cette histoire
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Hidden share card (9:16 for Instagram Stories) ── */}
      <div
        ref={shareCardRef}
        style={{
          position:       "fixed",
          top:            "-9999px",
          left:           "-9999px",
          width:          360,
          height:         640,
          background:     "linear-gradient(175deg, #0a0a0a 0%, #1a1830 60%, #0a0a0a 100%)",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "48px 40px",
          gap:            24,
        }}
      >
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "#7B6FD4", letterSpacing: "0.25em", textTransform: "uppercase", margin: 0 }}>
          AGAPE — Bible Immersive
        </p>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(123,111,212,0.15)", border: "1px solid rgba(123,111,212,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 28, color: "#E8E8E8" }}>{displayCharacter[0]}</span>
        </div>
        <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 32, color: "#E8E8E8", textAlign: "center", lineHeight: 1.2, margin: 0 }}>
          {displayCharacter}
        </h1>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "#ccc", textAlign: "center", lineHeight: 1.65, fontStyle: "italic", margin: 0 }}>
          &quot;{story?.quote ?? story?.narrative_text?.slice(0, 130) ?? ""}&quot;
        </p>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "#444", margin: 0 }}>
          {passageRef}
        </p>
      </div>

      {/* ── Share fallback modal ─────────────────────────── */}
      <AnimatePresence>
        {shareOpen && (
          <motion.div
            key="share-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShareOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
          >
            <motion.div
              initial={{ y: 60 }}
              animate={{ y: 0 }}
              exit={{ y: 60 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: "#1c1c1c", borderRadius: "20px 20px 0 0", padding: "28px 24px calc(env(safe-area-inset-bottom) + 28px)", width: "100%", maxWidth: 480 }}
            >
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 17, color: "#E8E8E8", margin: "0 0 12px" }}>
                {displayCharacter}
              </p>
              <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "#999", fontStyle: "italic", lineHeight: 1.6, margin: "0 0 20px" }}>
                &quot;{story?.quote ?? story?.narrative_text?.slice(0, 180) ?? ""}&quot;
              </p>
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#555", margin: 0 }}>
                AGAPE · Bible Immersive · {passageRef}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────
const iconBtnStyle: React.CSSProperties = {
  background:    "none",
  border:        "none",
  cursor:        "pointer",
  display:       "flex",
  flexDirection: "column",
  alignItems:    "center",
  gap:           2,
};

export default function StoryPlayerPage() {
  return (
    <Suspense>
      <StoryPlayerContent />
    </Suspense>
  );
}
