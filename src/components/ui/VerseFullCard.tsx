"use client";

import { useCallback, useRef, useState } from "react";
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

// ── 15 Unsplash background images ─────────────────────────────
const BACKGROUND_IMAGES = [
  { id: 1, url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80", thumb: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&q=60", name: "Montagnes" },
  { id: 2, url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80", thumb: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=60", name: "Sunset" },
  { id: 3, url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80", thumb: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&q=60", name: "Nature" },
  { id: 4, url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80", thumb: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&q=60", name: "Forêt" },
  { id: 5, url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80", thumb: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=200&q=60", name: "Lac" },
  { id: 6, url: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&q=80", thumb: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=200&q=60", name: "Cascade" },
  { id: 7, url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80", thumb: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&q=60", name: "Brume" },
  { id: 8, url: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=800&q=80", thumb: "https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=200&q=60", name: "Étoiles" },
  { id: 9, url: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=800&q=80", thumb: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=200&q=60", name: "Océan" },
  { id: 10, url: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80", thumb: "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=200&q=60", name: "Prairie" },
  { id: 11, url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80", thumb: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=200&q=60", name: "Neige" },
  { id: 12, url: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800&q=80", thumb: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=200&q=60", name: "Désert" },
  { id: 13, url: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=800&q=80", thumb: "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=200&q=60", name: "Aurore" },
  { id: 14, url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80", thumb: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&q=60", name: "Yosemite" },
  { id: 15, url: "https://images.unsplash.com/photo-1418065460487-3e41a6c84af5?w=800&q=80", thumb: "https://images.unsplash.com/photo-1418065460487-3e41a6c84af5?w=200&q=60", name: "Aube" },
];

// ── Main component ────────────────────────────────────────────
export function VerseFullCard({ book, chapter, verse, text, isOpen, onClose, backgroundImage }: VerseFullCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [selectedBg, setSelectedBg] = useState<string | null>(null);

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
          {/* ── Background Image ── */}
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
              background: (selectedBg || backgroundImage) ? "transparent" : "#0a0a0a",
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

                      {BACKGROUND_IMAGES.map((img) => (
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
