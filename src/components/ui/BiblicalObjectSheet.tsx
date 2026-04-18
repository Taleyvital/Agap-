"use client";

import { useState, useEffect } from "react";
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

/** Fetch Wikipedia thumbnail for an article title */
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
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgLoading, setImgLoading] = useState(true);

  const current = objects[selectedIndex] ?? null;

  // Fetch Wikipedia thumbnail whenever the selected object changes
  useEffect(() => {
    if (!isOpen || !current) return;
    setImgSrc(null);
    setImgLoading(true);

    if (current.wikipedia_en) {
      fetchWikiThumbnail(current.wikipedia_en).then((url) => {
        setImgSrc(url ?? current.image_url ?? null);
        setImgLoading(false);
      });
    } else {
      setImgSrc(current.image_url ?? null);
      setImgLoading(false);
    }
  }, [isOpen, current?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset selection when new objects arrive
  useEffect(() => {
    setSelectedIndex(0);
  }, [objects]);

  if (!current) return null;

  const categoryLabel = CATEGORY_LABELS[current.category][language];
  const categoryIcon = CATEGORY_ICONS[current.category];
  const description = current.description[language];
  const displayName = current.names[language]?.[0] ?? current.names.fr[0];

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
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#333]" />
            </div>

            {/* Close button */}
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
                {objects.map((obj, idx) => {
                  const label = obj.names[language]?.[0] ?? obj.names.fr[0];
                  const icon = CATEGORY_ICONS[obj.category];
                  return (
                    <button
                      key={obj.key}
                      type="button"
                      onClick={() => setSelectedIndex(idx)}
                      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-sans text-[11px] uppercase tracking-widest transition-all ${
                        idx === selectedIndex
                          ? "bg-[#7B6FD4] text-white"
                          : "bg-[#1c1c1c] text-[#666] border border-[#2a2a2a] hover:border-[#7B6FD4]/40 hover:text-[#E8E8E8]"
                      }`}
                    >
                      <span>{icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="overflow-y-auto" style={{ maxHeight: "calc(88vh - 80px)" }}>
              {/* Image area */}
              <div className="relative h-52 w-full overflow-hidden bg-[#1a1830]">
                {imgLoading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-[#7B6FD4] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {imgSrc && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={imgSrc}
                    alt={displayName}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoading ? "opacity-0" : "opacity-85"}`}
                    onLoad={() => setImgLoading(false)}
                    onError={() => {
                      setImgSrc(null);
                      setImgLoading(false);
                    }}
                  />
                )}
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />

                {/* Category badge */}
                <div className="absolute bottom-3 left-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#141414]/80 backdrop-blur-sm border border-[#7B6FD4]/30 font-sans text-[10px] uppercase tracking-[0.15em] text-[#7B6FD4]">
                    {categoryIcon} {categoryLabel}
                  </span>
                </div>
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
