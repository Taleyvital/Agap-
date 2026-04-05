"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, Image as ImageIcon, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { VerseImageCard } from "@/components/ui/VerseImageCard";
import {
  DEFAULT_TRANSLATION,
  getBooks,
  getChapter,
} from "@/lib/bible";
import type { BibleBook, BibleVerseRow } from "@/lib/types";

// Livres de l'Ancien Testament (bookid 1–39) et Nouveau Testament (40–66)
const AT_MAX_ID = 39;

type ViewMode = "books" | "chapters" | "verses";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
}

// Abréviations courtes pour les pills de livres

export default function BiblePage() {
  // ── State ──────────────────────────────────
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [translation, setTranslation] = useState(DEFAULT_TRANSLATION);
  const [bookId, setBookId] = useState<number | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [verses, setVerses] = useState<BibleVerseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [booksLoading, setBooksLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [longPressVerse, setLongPressVerse] = useState<number | null>(null);
  const [verseImageVerse, setVerseImageVerse] = useState<BibleVerseRow | null>(null);
  const [view, setView] = useState<ViewMode>("books");
  const [testamentFilter, setTestamentFilter] = useState<"AT" | "NT">("NT");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(16); // px
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings on outside click
  useEffect(() => {
    if (!settingsOpen) return;
    const handler = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [settingsOpen]);

  // ── Derived ────────────────────────────────
  const selectedBook = useMemo(
    () => books.find((b) => b.bookid === bookId) ?? null,
    [books, bookId],
  );

  const ATBooks = useMemo(() => books.filter((b) => b.bookid <= AT_MAX_ID), [books]);
  const NTBooks = useMemo(() => books.filter((b) => b.bookid > AT_MAX_ID), [books]);
  const displayedBooks = testamentFilter === "AT" ? ATBooks : NTBooks;

  // ── Load books ─────────────────────────────
  useEffect(() => {
    setBooksLoading(true);
    void getBooks(translation)
      .then(setBooks)
      .catch(() => setBooks([]))
      .finally(() => setBooksLoading(false));
  }, [translation]);

  // ── Load chapter ───────────────────────────
  const loadChapter = useCallback(async (trans: string, bid: number, ch: number) => {
    setLoading(true);
    setErr(null);
    try {
      const data = await getChapter(trans, bid, ch);
      setVerses(data);
    } catch {
      setErr("Impossible de charger ce chapitre.");
      setVerses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (bookId !== null && chapter !== null) {
      void loadChapter(translation, bookId, chapter);
    }
  }, [translation, bookId, chapter, loadChapter]);

  // ── Navigation handlers ────────────────────
  const selectBook = (b: BibleBook) => {
    setBookId(b.bookid);
    setChapter(null);
    setSelectedVerse(null);
    setView("chapters");
  };

  const selectChapter = (ch: number) => {
    setChapter(ch);
    setSelectedVerse(null);
    setView("verses");
  };

  const goBack = () => {
    if (view === "verses") { setView("chapters"); setChapter(null); }
    else if (view === "chapters") { setView("books"); setBookId(null); }
  };

  // ── Long press ─────────────────────────────
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onVersePointerDown = (v: number) => {
    pressTimerRef.current = setTimeout(() => {
      setLongPressVerse(v);
      setSheetOpen(true);
    }, 500);
  };
  const onVersePointerUp = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  // ── Render helpers ─────────────────────────
  const chapterCount = selectedBook?.chapters ?? 0;
  const chapterTitle =
    view === "verses" && bookId && chapter
      ? `${selectedBook?.name ?? ""} ${chapter}`
      : "";

  return (
    <AppShell>
      <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 68px)" }}>

        {/* ══ STICKY HEADER ══════════════════════════════════ */}
        <header className="sticky top-0 z-20 bg-bg-primary/90 backdrop-blur-md px-4 pt-4 pb-3 border-b border-separator">
          <div className="flex items-center gap-3">
            {/* Back button */}
            <AnimatePresence mode="wait">
              {view !== "books" && (
                <motion.button
                  key="back"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  type="button"
                  onClick={goBack}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-primary"
                  aria-label="Retour"
                >
                  <ChevronLeft className="h-4 w-4" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Breadcrumb title */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {view === "books" && (
                  <motion.p
                    key="title-books"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="font-sans text-xs uppercase tracking-[0.18em] text-text-tertiary"
                  >
                    BIBLE
                  </motion.p>
                )}
                {view === "chapters" && (
                  <motion.div
                    key="title-chapters"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                      BIBLE
                    </p>
                    <p className="font-serif text-base text-text-primary leading-tight truncate">
                      {selectedBook?.name}
                    </p>
                  </motion.div>
                )}
                {view === "verses" && (
                  <motion.div
                    key="title-verses"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
                      {selectedBook?.name}
                    </p>
                    <p className="font-serif text-base text-text-primary leading-tight">
                      {chapterTitle}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ⋯ Settings button */}
            <div ref={settingsRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setSettingsOpen((o) => !o)}
                aria-label="Paramètres de lecture"
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
                  settingsOpen
                    ? "border-accent/60 bg-accent/10 text-accent"
                    : "border-separator bg-bg-secondary text-text-secondary hover:text-text-primary"
                }`}
              >
                {/* Three dots */}
                <span className="flex items-center gap-[3px]">
                  <span className="block h-1 w-1 rounded-full bg-current" />
                  <span className="block h-1 w-1 rounded-full bg-current" />
                  <span className="block h-1 w-1 rounded-full bg-current" />
                </span>
              </button>

              {/* Dropdown panel */}
              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-separator bg-bg-secondary/95 backdrop-blur-xl p-4 shadow-xl shadow-black/40"
                  >
                    {/* Language */}
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">
                      Langue
                    </p>
                    <div className="flex gap-2 mb-4">
                      {[
                        { slug: "NBS", label: "FR" },
                        { slug: "NKJV", label: "EN" },
                      ].map((t) => (
                        <button
                          key={t.slug}
                          type="button"
                          onClick={() => { setTranslation(t.slug); setVerses([]); }}
                          className={`flex-1 rounded-full py-2 font-sans text-xs font-semibold uppercase tracking-wider transition-all ${
                            translation === t.slug
                              ? "bg-accent text-white shadow-md shadow-accent/30"
                              : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-separator"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {/* Font size */}
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2">
                      Taille du texte
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="font-serif text-xs text-text-tertiary select-none">A</span>
                      <input
                        type="range"
                        min={13}
                        max={22}
                        step={1}
                        value={fontSize}
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="flex-1 h-1 appearance-none rounded-full bg-bg-tertiary accent-accent cursor-pointer"
                        aria-label="Taille de la police"
                      />
                      <span className="font-serif text-base text-text-tertiary select-none">A</span>
                    </div>
                    <p className="mt-1.5 text-center font-sans text-[10px] text-text-tertiary">
                      {fontSize}px
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* ══ MAIN CONTENT SWITCHER ══════════════════════════ */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">

            {/* ── VIEW: BOOKS ── */}
            {view === "books" && (
              <motion.div
                key="view-books"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.22 }}
                className="px-4 pt-5 pb-28"
              >
                {/* AT / NT toggle */}
                <div className="flex gap-2 mb-6">
                  {(["NT", "AT"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTestamentFilter(t)}
                      className={`flex-1 rounded-full py-2.5 font-sans text-xs uppercase tracking-[0.18em] transition-all duration-200 ${
                        testamentFilter === t
                          ? "bg-accent text-white shadow-lg shadow-accent/25"
                          : "bg-bg-secondary border border-separator text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {t === "NT" ? "Nouveau Testament" : "Ancien Testament"}
                    </button>
                  ))}
                </div>

                {/* Books grid */}
                {booksLoading ? (
                  <div className="grid grid-cols-3 gap-2.5">
                    {Array.from({ length: 18 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-14 rounded-xl bg-bg-secondary animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5">
                    {displayedBooks.map((b) => (
                      <motion.button
                        key={b.bookid}
                        type="button"
                        onClick={() => selectBook(b)}
                        whileTap={{ scale: 0.96 }}
                        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-separator bg-bg-secondary px-2 py-3 text-center transition-colors hover:border-accent/40 hover:bg-bg-tertiary active:bg-bg-tertiary"
                      >
                        <span className="font-serif text-[13px] leading-tight text-text-primary">
                          {/* Show full short name */}
                          {b.name.split(" ").slice(-1)[0]}
                        </span>
                        <span className="font-sans text-[9px] text-text-tertiary">
                          {b.chapters} ch.
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── VIEW: CHAPTERS ── */}
            {view === "chapters" && selectedBook && (
              <motion.div
                key={`view-chapters-${bookId}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.22 }}
                className="px-4 pt-5 pb-28"
              >
                {/* Book info */}
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent/15 border border-accent/20">
                    <BookOpen className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-serif text-xl text-text-primary">{selectedBook.name}</p>
                    <p className="font-sans text-xs text-text-tertiary">
                      {selectedBook.chapters} chapitre{selectedBook.chapters > 1 ? "s" : ""}
                      {" · "}
                      {selectedBook.bookid <= AT_MAX_ID ? "Ancien Testament" : "Nouveau Testament"}
                    </p>
                  </div>
                </div>

                {/* Chapter grid */}
                <div className="grid grid-cols-5 gap-2.5">
                  {Array.from({ length: chapterCount }, (_, i) => i + 1).map((ch) => (
                    <motion.button
                      key={ch}
                      type="button"
                      onClick={() => selectChapter(ch)}
                      whileTap={{ scale: 0.92 }}
                      className="flex aspect-square items-center justify-center rounded-xl border border-separator bg-bg-secondary font-sans text-sm text-text-primary transition-colors hover:border-accent/40 hover:bg-accent/10 hover:text-accent active:bg-accent/20"
                    >
                      {ch}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── VIEW: VERSES ── */}
            {view === "verses" && bookId !== null && chapter !== null && (
              <motion.div
                key={`view-verses-${bookId}-${chapter}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.22 }}
                className="px-4 pt-5 pb-28"
              >
                {err && (
                  <p className="text-center text-sm text-danger">{err}</p>
                )}
                {loading ? (
                  <div className="space-y-5 mt-2">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="mt-1 h-3 w-4 shrink-0 rounded bg-bg-tertiary animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 rounded bg-bg-tertiary animate-pulse" />
                          <div className="h-3.5 w-4/5 rounded bg-bg-tertiary animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-separator/40">
                    {verses.map((row) => {
                      const active = selectedVerse === row.verse;
                      return (
                        <motion.div
                          key={row.pk}
                          layout
                          className={`py-4 cursor-pointer transition-colors ${
                            active ? "rounded-xl bg-bg-secondary px-3 -mx-3" : ""
                          }`}
                          onClick={() =>
                            setSelectedVerse((v) => (v === row.verse ? null : row.verse))
                          }
                          onPointerDown={() => onVersePointerDown(row.verse)}
                          onPointerUp={onVersePointerUp}
                          onPointerLeave={onVersePointerUp}
                        >
                          <p className="flex gap-3 leading-[1.9]">
                            <span className="min-w-[1.5rem] shrink-0 font-sans text-xs text-text-tertiary pt-1">
                              {row.verse}
                            </span>
                            <span
                              className="font-serif text-text-primary"
                              style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
                            >
                              {stripHtml(row.text)}
                            </span>
                          </p>
                          {active && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-3 ml-[2.1rem] flex items-center gap-4"
                            >
                              <Link
                                href={`/chat?verse=${bookId}-${chapter}-${row.verse}`}
                                className="font-sans text-xs uppercase tracking-wider text-accent"
                              >
                                PARTAGER AVEC AGAPE →
                              </Link>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setVerseImageVerse(row);
                                }}
                                className="flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-text-secondary hover:text-text-primary transition-colors"
                                aria-label="Voir en image"
                              >
                                <ImageIcon className="h-3.5 w-3.5" />
                                VOIR EN IMAGE
                              </button>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ══ BOTTOM SHEET: Notes ════════════════════════════ */}
      <AnimatePresence>
        {sheetOpen && longPressVerse ? (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[430px] rounded-t-2xl border border-separator bg-bg-secondary p-6"
          >
            <p className="ui-label text-text-tertiary">NOTE — Verset {longPressVerse}</p>
            <p className="mt-2 font-serif italic text-text-primary">
              Ici tu pourras ajouter une note (sync Supabase).
            </p>
            <Button
              variant="primary"
              className="mt-4 w-full"
              onClick={() => setSheetOpen(false)}
            >
              Fermer
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ══ FULLSCREEN VERSE IMAGE ═════════════════════════ */}
      <AnimatePresence>
        {verseImageVerse ? (
          <motion.div
            key="verse-image-fullscreen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90]"
          >
            <VerseImageCard
              verseText={stripHtml(verseImageVerse.text)}
              reference={`${selectedBook?.name ?? ""} ${chapter}:${verseImageVerse.verse}`}
              variant="fullscreen"
              onClose={() => setVerseImageVerse(null)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppShell>
  );
}
