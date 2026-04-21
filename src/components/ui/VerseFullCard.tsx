"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Share2, Check, ImageIcon } from "lucide-react";
import Image from "next/image";

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
  /** Optional background image URL (e.g., daily image) */
  backgroundImage?: string;
  /** Called when user taps "Envoyer en Flammes" */
  onSendAsFlame?: () => void;
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

// ── Full pool of 45 nature/spiritual Unsplash images ─────────
const IMAGE_POOL = [
  { id: 1,  url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", thumb: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60", name: "Montagnes" },
  { id: 2,  url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", thumb: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&q=60", name: "Nature" },
  { id: 3,  url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", thumb: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&q=60", name: "Forêt" },
  { id: 4,  url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80", thumb: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&q=60", name: "Lac" },
  { id: 5,  url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80", thumb: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200&q=60", name: "Cascade" },
  { id: 6,  url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80", thumb: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&q=60", name: "Brume" },
  { id: 7,  url: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80", thumb: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=200&q=60", name: "Étoiles" },
  { id: 8,  url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80", thumb: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&q=60", name: "Océan" },
  { id: 9,  url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80", thumb: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=200&q=60", name: "Prairie" },
  { id: 10, url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", thumb: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=60", name: "Neige" },
  { id: 11, url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80", thumb: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=200&q=60", name: "Désert" },
  { id: 12, url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80", thumb: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=200&q=60", name: "Aurore" },
  { id: 13, url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80", thumb: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&q=60", name: "Yosemite" },
  { id: 14, url: "https://images.unsplash.com/photo-1418065460487-3e41a6c84af5?w=800&q=80", thumb: "https://images.unsplash.com/photo-1418065460487-3e41a6c84af5?w=200&q=60", name: "Aube" },
  { id: 15, url: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80", thumb: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=200&q=60", name: "Lac de montagne" },
  { id: 16, url: "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80", thumb: "https://images.unsplash.com/photo-1511497584788-876760111969?w=200&q=60", name: "Pins" },
  { id: 17, url: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80", thumb: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=200&q=60", name: "Brouillard" },
  { id: 18, url: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=800&q=80", thumb: "https://images.unsplash.com/photo-1523712999610-f77fbcfc3843?w=200&q=60", name: "Lever du soleil" },
  { id: 19, url: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=800&q=80", thumb: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=200&q=60", name: "Collines" },
  { id: 20, url: "https://images.unsplash.com/photo-1444628838545-ac4016a5418a?w=800&q=80", thumb: "https://images.unsplash.com/photo-1444628838545-ac4016a5418a?w=200&q=60", name: "Voie lactée" },
  { id: 21, url: "https://images.unsplash.com/photo-1421789665209-c9b2a435e3dc?w=800&q=80", thumb: "https://images.unsplash.com/photo-1421789665209-c9b2a435e3dc?w=200&q=60", name: "Automne" },
  { id: 22, url: "https://images.unsplash.com/photo-1455156218388-5e61b526818b?w=800&q=80", thumb: "https://images.unsplash.com/photo-1455156218388-5e61b526818b?w=200&q=60", name: "Rivière" },
  { id: 23, url: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=800&q=80", thumb: "https://images.unsplash.com/photo-1504701954957-2010ec3bcec1?w=200&q=60", name: "Alpes" },
  { id: 24, url: "https://images.unsplash.com/photo-1540329957110-b11e19a3f85b?w=800&q=80", thumb: "https://images.unsplash.com/photo-1540329957110-b11e19a3f85b?w=200&q=60", name: "Ciel dramatique" },
  { id: 25, url: "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=800&q=80", thumb: "https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?w=200&q=60", name: "Dunes" },
  { id: 26, url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80", thumb: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200&q=60", name: "Plage" },
  { id: 27, url: "https://images.unsplash.com/photo-1546587348-d12660c30c50?w=800&q=80", thumb: "https://images.unsplash.com/photo-1546587348-d12660c30c50?w=200&q=60", name: "Campagne" },
  { id: 28, url: "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=800&q=80", thumb: "https://images.unsplash.com/photo-1490682143684-14369e18dce8?w=200&q=60", name: "Heure dorée" },
  { id: 29, url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&q=80", thumb: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=200&q=60", name: "Côte rocheuse" },
  { id: 30, url: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=800&q=80", thumb: "https://images.unsplash.com/photo-1542401886-65d6c61db217?w=200&q=60", name: "Ciel étoilé" },
  { id: 31, url: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80", thumb: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=200&q=60", name: "Glacier" },
  { id: 32, url: "https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?w=800&q=80", thumb: "https://images.unsplash.com/photo-1434725039720-aaad6dd32dfe?w=200&q=60", name: "Fjord" },
  { id: 33, url: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80", thumb: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=200&q=60", name: "Champs" },
  { id: 34, url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80", thumb: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=200&q=60", name: "Arbres lumineux" },
  { id: 35, url: "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=800&q=80", thumb: "https://images.unsplash.com/photo-1462275646964-a0e3386b89fa?w=200&q=60", name: "Vallée" },
  { id: 36, url: "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=800&q=80", thumb: "https://images.unsplash.com/photo-1516912481808-3406841bd33c?w=200&q=60", name: "Aurore boréale" },
  { id: 37, url: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=800&q=80", thumb: "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=200&q=60", name: "Coucher de soleil" },
  { id: 38, url: "https://images.unsplash.com/photo-1497449493050-aad1e7cad165?w=800&q=80", thumb: "https://images.unsplash.com/photo-1497449493050-aad1e7cad165?w=200&q=60", name: "Sentier" },
  { id: 39, url: "https://images.unsplash.com/photo-1503264116251-35a269479413?w=800&q=80", thumb: "https://images.unsplash.com/photo-1503264116251-35a269479413?w=200&q=60", name: "Mer nuageuse" },
  { id: 40, url: "https://images.unsplash.com/photo-1491466424936-e304919aada7?w=800&q=80", thumb: "https://images.unsplash.com/photo-1491466424936-e304919aada7?w=200&q=60", name: "Reflet" },
  { id: 41, url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80", thumb: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&q=60", name: "Sommet" },
  { id: 42, url: "https://images.unsplash.com/photo-1510797215324-95aa89f43c33?w=800&q=80", thumb: "https://images.unsplash.com/photo-1510797215324-95aa89f43c33?w=200&q=60", name: "Soleil couchant" },
  { id: 43, url: "https://images.unsplash.com/photo-1446329813274-7c9036bd9a1f?w=800&q=80", thumb: "https://images.unsplash.com/photo-1446329813274-7c9036bd9a1f?w=200&q=60", name: "Forêt brumeuse" },
  { id: 44, url: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=800&q=80", thumb: "https://images.unsplash.com/photo-1458668383970-8ddd3927deed?w=200&q=60", name: "Alpes suisses" },
  { id: 45, url: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80", thumb: "https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=200&q=60", name: "Ciel rose" },
];

// ── Seeded PRNG (mulberry32) — deterministic daily shuffle ────
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns 15 images chosen deterministically for today's date. */
function getDailyImages(count = 15) {
  const daysSinceEpoch = Math.floor(Date.now() / 86_400_000);
  const rand = mulberry32(daysSinceEpoch);
  // Fisher-Yates shuffle on a copy
  const pool = [...IMAGE_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

// ── Main component ────────────────────────────────────────────
export function VerseFullCard({ book, chapter, verse, text, isOpen, onClose, backgroundImage, onSendAsFlame }: VerseFullCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);

  // 15 images change every day (seeded by today's date)
  const dailyImages = useMemo(() => getDailyImages(15), []);

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
              overflow: "hidden",
            }}
          >
            {/* ── Background Image (inside capture zone for sharing) ── */}
            {(selectedBg || backgroundImage) && (
              <div className="absolute inset-0 z-0">
                <Image
                  src={selectedBg || backgroundImage || ""}
                  alt="Background"
                  fill
                  className={`object-cover transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                  priority
                />
                {/* Dark overlay for text readability */}
                <div 
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.7) 100%)' }}
                />
              </div>
            )}

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
                zIndex: 1,
              }}
            />

            {/* Grain duplicated inside capture zone so png looks right */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                filter: "url(#vc-noise)",
                opacity: 0.5,
                pointerEvents: "none",
                zIndex: 1,
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
                zIndex: 2,
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
                zIndex: 2,
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
              {copied ? "Copié !" : "Copier"}
            </button>

            {/* Background Image Picker Button */}
            <button
              type="button"
              onClick={() => setShowImagePicker(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                color: "#777777",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                transition: "color 0.2s",
                padding: "8px 12px",
              }}
            >
              <ImageIcon size={16} />
              Fond
            </button>

            {/* Send as Flame */}
            {onSendAsFlame && (
              <button
                type="button"
                onClick={onSendAsFlame}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#7B6FD4",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  transition: "color 0.2s",
                  padding: "8px 12px",
                }}
              >
                🔥 Flammes
              </button>
            )}

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

          {/* ── Image Picker Modal ── */}
          <AnimatePresence>
            {showImagePicker && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[250] bg-black/80"
                  onClick={() => setShowImagePicker(false)}
                />
                
                {/* Modal */}
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                  className="fixed inset-x-0 bottom-0 z-[260] mx-auto max-w-[430px] rounded-t-3xl bg-bg-secondary border-t border-x border-separator"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                          FOND D&apos;ÉCRAN
                        </p>
                        <p className="font-serif text-lg text-text-primary mt-0.5">
                          Choisir une image
                        </p>
                      </div>
                      <button
                        onClick={() => setShowImagePicker(false)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-tertiary text-text-secondary hover:text-text-primary"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    {/* Grid of images */}
                    <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pb-4">
                      {/* Option: None (solid black) */}
                      <button
                        onClick={() => { setSelectedBg(null); setShowImagePicker(false); }}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          !selectedBg ? 'border-accent' : 'border-transparent hover:border-accent/50'
                        }`}
                      >
                        <div className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center">
                          <span className="text-white/50 text-xs">Aucun</span>
                        </div>
                      </button>

                      {dailyImages.map((img) => (
                        <button
                          key={img.id}
                          onClick={() => { setSelectedBg(img.url); setShowImagePicker(false); }}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                            selectedBg === img.url ? 'border-accent' : 'border-transparent hover:border-accent/50'
                          }`}
                        >
                          <Image
                            src={img.thumb}
                            alt={img.name}
                            fill
                            className="object-cover"
                            sizes="120px"
                          />
                          {selectedBg === img.url && (
                            <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                              <Check className="w-6 h-6 text-accent" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
