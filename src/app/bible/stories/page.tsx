"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Sparkles } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";

const PREMIUM_ONLY = process.env.NEXT_PUBLIC_STORIES_PREMIUM_ONLY === "true";
const FREE_STORY_LIMIT = 3;

const PRESET_STORIES = [
  { passageRef: "1Samuel17",  character: "David",           title: "Face à Goliath",       bookId: 9,  chapter: 17, color: "#1a2230" },
  { passageRef: "Ruth1",      character: "Ruth",            title: "Fidélité à Naomi",     bookId: 8,  chapter: 1,  color: "#1a2018" },
  { passageRef: "Luc1",       character: "Marie",           title: "L'Annonciation",       bookId: 42, chapter: 1,  color: "#1a1830" },
  { passageRef: "Matthieu14", character: "Pierre",          title: "Marche sur l'eau",     bookId: 40, chapter: 14, color: "#1a2230" },
  { passageRef: "Genese37",   character: "Joseph",          title: "Trahison des frères",  bookId: 1,  chapter: 37, color: "#231a18" },
  { passageRef: "Actes9",     character: "Paul",            title: "Chemin de Damas",      bookId: 44, chapter: 9,  color: "#1a1830" },
  { passageRef: "Daniel6",    character: "Daniel",          title: "La fosse aux lions",   bookId: 27, chapter: 6,  color: "#1a2018" },
  { passageRef: "Jean20",     character: "Marie-Madeleine", title: "La résurrection",      bookId: 43, chapter: 20, color: "#231a18" },
] as const;

function StoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [customRef, setCustomRef]     = useState(searchParams.get("customRef") ?? "");
  const [customChar, setCustomChar]   = useState(searchParams.get("customChar") ?? "");
  const [generating, setGenerating]   = useState(false);
  const [genError, setGenError]       = useState("");
  const carouselRef = useRef<HTMLDivElement>(null);

  function goToStory(passageRef: string, character: string, bookId?: number, chapter?: number) {
    const params = new URLSearchParams({ character });
    if (bookId)  params.set("bookId",  String(bookId));
    if (chapter) params.set("chapter", String(chapter));
    router.push(`/bible/stories/${encodeURIComponent(passageRef)}?${params}`);
  }

  async function handleGenerate() {
    if (!customRef.trim() || !customChar.trim()) {
      setGenError("Remplis les deux champs.");
      return;
    }
    setGenError("");
    setGenerating(true);
    // Normalise reference for URL (remove spaces)
    const ref = customRef.trim().replace(/\s+/g, "");
    goToStory(ref, customChar.trim());
  }

  return (
    <AppShell>
      <div style={{ background: "#141414", minHeight: "100vh", paddingBottom: 32 }}>

        {/* ── Header ──────────────────────────────────────── */}
        <div style={{ padding: "56px 20px 0" }}>
          <button
            type="button"
            onClick={() => router.back()}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#666", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}
          >
            <ChevronLeft size={18} />
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 13 }}>Bible</span>
          </button>

          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "#E8E8E8", margin: 0, lineHeight: 1.2 }}>
            Bible Immersive
          </h1>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "#666", fontStyle: "italic", marginTop: 6 }}>
            Vis la Parole de l'intérieur
          </p>
        </div>

        {/* ── Carousel "Histoires populaires" ─────────────── */}
        <div style={{ marginTop: 32 }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", padding: "0 20px", marginBottom: 14 }}>
            Histoires populaires
          </p>

          <div
            ref={carouselRef}
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              padding: "4px 20px 16px",
              scrollbarWidth: "none",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {PRESET_STORIES.map((story, i) => (
              <StoryCard
                key={story.passageRef}
                story={story}
                index={i}
                onPress={() => goToStory(story.passageRef, story.character, story.bookId, story.chapter)}
              />
            ))}
          </div>
        </div>

        {/* ── Générer une histoire ─────────────────────────── */}
        <div style={{ padding: "0 20px", marginTop: 8 }}>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#555", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 14 }}>
            Générer une histoire
          </p>

          <div style={{
            background: "#1a1830",
            border: "0.5px solid rgba(123,111,212,0.35)",
            borderRadius: 16,
            padding: "20px 18px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(123,111,212,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Sparkles size={16} color="#7B6FD4" />
              </div>
              <div>
                <p style={{ fontFamily: "var(--font-serif)", fontSize: 15, color: "#E8E8E8", margin: 0 }}>Ton histoire personnalisée</p>
                <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#555", margin: 0 }}>L'IA compose le récit en ~10 secondes</p>
              </div>
            </div>

            <input
              value={customRef}
              onChange={(e) => setCustomRef(e.target.value)}
              placeholder="Référence biblique (ex: Jean 3)"
              style={inputStyle}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />
            <input
              value={customChar}
              onChange={(e) => setCustomChar(e.target.value)}
              placeholder="Personnage principal (ex: Nicodème)"
              style={{ ...inputStyle, marginTop: 10 }}
              onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            />

            {genError && (
              <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "#ff6b6b", marginTop: 8 }}>{genError}</p>
            )}

            <motion.button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              whileTap={{ scale: 0.97 }}
              style={{
                width: "100%",
                marginTop: 16,
                background: generating ? "rgba(123,111,212,0.4)" : "#7B6FD4",
                border: "none",
                borderRadius: 14,
                padding: "13px 0",
                color: "white",
                fontFamily: "var(--font-sans)",
                fontSize: 14,
                fontWeight: 600,
                cursor: generating ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {generating ? (
                <>
                  <ShimmerDot />
                  <ShimmerDot delay={0.15} />
                  <ShimmerDot delay={0.3} />
                </>
              ) : (
                "Générer 🎙️"
              )}
            </motion.button>
          </div>
        </div>

        {/* ── Premium notice (structure prête, non active) ── */}
        {PREMIUM_ONLY && (
          <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#555" }}>
              {FREE_STORY_LIMIT} histoires gratuites · Premium pour accès illimité
            </span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Story card ───────────────────────────────────────────────
function StoryCard({
  story,
  index,
  onPress,
}: {
  story: typeof PRESET_STORIES[number];
  index: number;
  onPress: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      whileTap={{ scale: 0.96 }}
      style={{
        flexShrink: 0,
        width: 160,
        height: 200,
        background: story.color,
        border: "0.5px solid rgba(255,255,255,0.06)",
        borderRadius: 16,
        padding: "16px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Initial circle */}
      <div style={{
        width: 44,
        height: 44,
        borderRadius: "50%",
        background: "rgba(123,111,212,0.15)",
        border: "0.5px solid rgba(123,111,212,0.3)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}>
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "#E8E8E8" }}>
          {story.character[0]}
        </span>
      </div>

      <div>
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 16, color: "#E8E8E8", margin: "0 0 4px", lineHeight: 1.2 }}>
          {story.character}
        </p>
        <p style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "#7B6FD4", margin: "0 0 6px" }}>
          {story.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "#555" }}>~3 min</span>
          <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(123,111,212,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={10} color="#7B6FD4" fill="#7B6FD4" />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ── Helpers ──────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "0.5px solid #2a2a2a",
  borderRadius: 10,
  padding: "12px 14px",
  color: "#E8E8E8",
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

function ShimmerDot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ repeat: Infinity, duration: 0.9, delay, ease: "easeInOut" }}
      style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }}
    />
  );
}

export default function StoriesPage() {
  return (
    <Suspense>
      <StoriesContent />
    </Suspense>
  );
}
