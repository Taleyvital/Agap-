"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { BiblicalObject } from "@/lib/biblicalObjects";
import { CATEGORY_LABELS, CATEGORY_ICONS } from "@/lib/biblicalObjects";

interface BiblicalObjectSheetProps {
  objects: BiblicalObject[];
  isOpen: boolean;
  onClose: () => void;
  language?: "fr" | "en" | "pt" | "es";
}

async function fetchWikiThumbnail(title: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { thumbnail?: { source: string } };
    return data.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

export function BiblicalObjectSheet({
  objects,
  isOpen,
  onClose,
  language = "fr",
}: BiblicalObjectSheetProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [gallery, setGallery] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [imgLoading, setImgLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);

  const current = objects[selectedIndex] ?? null;

  // Fetch all gallery images when object changes
  useEffect(() => {
    if (!isOpen || !current) return;
    setGallery([]);
    setGalleryIndex(0);
    setImgLoading(true);

    const titles: string[] = current.wikipedia_en
      ? Array.isArray(current.wikipedia_en)
        ? current.wikipedia_en
        : [current.wikipedia_en]
      : [];

    if (titles.length === 0) {
      if (current.image_url) setGallery([current.image_url]);
      setImgLoading(false);
      return;
    }

    // Fetch all thumbnails in parallel, keep the ones that succeed
    Promise.all(titles.map(fetchWikiThumbnail)).then((results) => {
      const valid = results.filter((url): url is string => url !== null);
      setGallery(valid.length > 0 ? valid : (current.image_url ? [current.image_url] : []));
      setImgLoading(false);
    });
  }, [isOpen, current?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset object selection when new objects arrive
  useEffect(() => {
    setSelectedIndex(0);
  }, [objects]);

  // Swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && galleryIndex < gallery.length - 1) setGalleryIndex((i) => i + 1);
    if (dx > 0 && galleryIndex > 0) setGalleryIndex((i) => i - 1);
  };

  if (!current) return null;

  const categoryLabel = CATEGORY_LABELS[current.category][language];
  const categoryIcon = CATEGORY_ICONS[current.category];
  const description = current.description[language];
  const displayName = current.names[language]?.[0] ?? current.names.fr[0];
  const currentImg = gallery[galleryIndex] ?? null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 380 }}
            className="fixed inset-x-0 bottom-0 z-[90] mx-auto max-w-[430px] rounded-t-3xl bg-[#141414] overflow-hidden"
            style={{ maxHeight: "88vh" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#333]" />
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#1c1c1c] text-[#666] hover:text-[#E8E8E8] transition-colors"
              aria-label="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Multi-object selector */}
            {objects.length > 1 && (
              <div className="flex gap-2 px-4 pt-2 pb-3 overflow-x-auto scrollbar-none">
                {objects.map((obj, idx) => (
                  <button
                    key={obj.key}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-[11px] uppercase tracking-widest transition-all ${
                      idx === selectedIndex
                        ? "bg-[#7B6FD4] text-white"
                        : "bg-[#1c1c1c] text-[#666] border border-[#2a2a2a]"
                    }`}
                  >
                    <span>{CATEGORY_ICONS[obj.category]}</span>
                    <span>{obj.names[language]?.[0] ?? obj.names.fr[0]}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="overflow-y-auto" style={{ maxHeight: "calc(88vh - 80px)" }}>

              {/* ── Image Gallery ── */}
              <div
                className="relative h-56 w-full overflow-hidden bg-[#1a1830] select-none"
                onTouchStart={onTouchStart}
                onTouchEnd={onTouchEnd}
              >
                {/* Loading spinner */}
                {imgLoading && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="w-8 h-8 border-2 border-[#7B6FD4] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* Image */}
                <AnimatePresence mode="wait">
                  {currentImg && (
                    <motion.div
                      key={currentImg}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={currentImg}
                        alt={displayName}
                        className="w-full h-full object-cover opacity-85"
                        onLoad={() => setImgLoading(false)}
                        onError={() => setImgLoading(false)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent pointer-events-none" />

                {/* Dot indicators (gallery count > 1) */}
                {gallery.length > 1 && (
                  <div className="absolute bottom-10 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                    {gallery.map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-full transition-all ${
                          i === galleryIndex
                            ? "w-4 h-1.5 bg-[#7B6FD4]"
                            : "w-1.5 h-1.5 bg-white/30"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Category badge */}
                <div className="absolute bottom-3 left-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141414]/80 backdrop-blur-sm border border-[#7B6FD4]/30 font-sans text-[10px] uppercase tracking-[0.15em] text-[#7B6FD4]">
                    {categoryIcon} {categoryLabel}
                  </span>
                </div>

                {/* Swipe hint (only shown for gallery) */}
                {gallery.length > 1 && (
                  <div className="absolute bottom-3 right-4">
                    <span className="font-sans text-[9px] uppercase tracking-widest text-white/30">
                      ← swipe →
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="px-5 pt-4 pb-10">
                <h2 className="font-serif italic text-2xl text-[#E8E8E8] capitalize mb-1">
                  {displayName}
                </h2>
                <p className="font-sans text-[14px] text-[#c9c4d4] leading-relaxed mt-3">
                  {description}
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
