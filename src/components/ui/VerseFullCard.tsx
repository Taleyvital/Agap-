"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Share2, Check } from "lucide-react";

// ── Props ─────────────────────────────────────────────────────
export interface VerseFullCardProps {
  /** Display name of the book, e.g. "Jean" or "Psaumes" */
  book: string;
  chapter: number;
  verse: number;
  /** Plain text of the verse (HTML already stripped) */
  text: string;
  isOpen: boolean;
  onClose: () => void;
}

// ── Grain overlay via CSS (no external file needed) ──────────
function GrainOverlay() {
  return (
    <>
      {/* SVG noise filter definition */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <filter id="vc-noise" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.62"
              numOctaves="4"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
            <feBlend in="SourceGraphic" in2="gray" mode="overlay" result="blended" />
            <feComposite in="blended" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      </svg>

      {/* Grain layer */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          filter: "url(#vc-noise)",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />
    </>
  );
}

// ── Main component ────────────────────────────────────────────
export function VerseFullCard({ book, chapter, verse, text, isOpen, onClose }: VerseFullCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Split reference into two lines like the screenshot: "PSAUME" / "28:7"
  const bookUpper = book.toUpperCase();
  const coords = `${chapter}:${verse}`;

  // ── Copy ──────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n— ${book} ${chapter}:${verse}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  }, [text, book, chapter, verse]);

  // ── Share (html2canvas → native share sheet) ──────────────
  const handleShare = useCallback(async () => {
    if (!cardRef.current || sharing) return;
    setSharing(true);

    try {
      const { default: html2canvas } = await import("html2canvas");

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
        logging: false,
        // Exclude buttons from capture
        ignoreElements: (el) => el.hasAttribute("data-html2canvas-ignore"),
      });

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const filename = `${bookUpper}-${chapter}-${verse}.png`;

        if (navigator.share) {
          const file = new File([blob], filename, { type: "image/png" });
          try {
            await navigator.share({ files: [file], title: `${bookUpper} ${coords}`, text });
          } catch {
            // User cancelled — no-op
          }
        } else {
          // Desktop fallback: download
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      }, "image/png");
    } catch {
      // silent
    } finally {
      setSharing(false);
    }
  }, [bookUpper, chapter, coords, verse, text, sharing]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          className="fixed inset-0 z-[200] flex flex-col overflow-hidden"
          style={{ background: "#0a0a0a" }}
        >
          {/* ── Grain ── */}
          <GrainOverlay />

          {/* ── Diffuse light — top-right haze ── */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(ellipse 75% 50% at 88% 6%, rgba(255,255,255,0.05) 0%, transparent 65%)",
              pointerEvents: "none",
            }}
          />

          {/* ── Close ── */}
          <button
            type="button"
            onClick={onClose}
            data-html2canvas-ignore
            style={{
              position: "absolute",
              top: 52,
              right: 20,
              zIndex: 10,
              color: "#666666",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
            }}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>

          {/* ── Capturable content area ── */}
          <div
            ref={cardRef}
            style={{
              flex: 1,
              position: "relative",
              background: "#0a0a0a",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              paddingBottom: "14vh",
              paddingLeft: 28,
              paddingRight: 28,
            }}
          >
            {/* Grain duplicated inside capture zone so png looks right */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                filter: "url(#vc-noise)",
                opacity: 0.5,
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "radial-gradient(ellipse 75% 50% at 88% 6%, rgba(255,255,255,0.05) 0%, transparent 65%)",
                pointerEvents: "none",
              }}
            />

            {/* Reference — Impact-style massive type */}
            <p
              style={{
                fontFamily: "'DM Sans', 'Arial Black', Impact, sans-serif",
                fontSize: "clamp(60px, 19vw, 80px)",
                fontWeight: 900,
                color: "#E8E8E8",
                letterSpacing: "-0.02em",
                lineHeight: 0.88,
                textTransform: "uppercase",
                marginBottom: "1.2rem",
                position: "relative",
              }}
            >
              <span style={{ display: "block" }}>{bookUpper}</span>
              <span style={{ display: "block" }}>{coords}</span>
            </p>

            {/* Verse text */}
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 400,
                color: "#C8C8C8",
                letterSpacing: "0.08em",
                lineHeight: 1.65,
                textTransform: "uppercase",
                textAlign: "justify",
                maxWidth: "85%",
                position: "relative",
              }}
            >
              {text}
            </p>
          </div>

          {/* ── Bottom action bar ── */}
          <div
            data-html2canvas-ignore
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: 24,
              paddingRight: 24,
              paddingTop: 18,
              paddingBottom: 40,
              borderTop: "0.5px solid rgba(255,255,255,0.07)",
            }}
          >
            {/* Copy */}
            <button
              type="button"
              onClick={handleCopy}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                color: copied ? "#E8E8E8" : "#777777",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                transition: "color 0.2s",
              }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copié !" : "Copier le verset"}
            </button>

            {/* Share */}
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                background: "#E8E8E8",
                color: "#0a0a0a",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderRadius: 100,
                paddingLeft: 20,
                paddingRight: 20,
                paddingTop: 10,
                paddingBottom: 10,
                opacity: sharing ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              <Share2 size={14} />
              {sharing ? "…" : "Partager"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
