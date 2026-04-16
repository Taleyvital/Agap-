"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { ChevronLeft, ChevronRight, BookOpen, Palette, StickyNote, Pencil, Sparkles, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import {
  DEFAULT_TRANSLATION,
  TRANSLATIONS,
  TRANSLATION_OPTIONS,
  getBooks,
  getChapter,
} from "@/lib/bible";
import type { BibleBook, BibleVerseRow } from "@/lib/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useXPToast, triggerXP } from "@/components/providers/XPToastProvider";

// Livres de l'Ancien Testament (bookid 1–39) et Nouveau Testament (40–66)
const AT_MAX_ID = 39;

type ViewMode = "books" | "chapters" | "verses";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
}

function BiblePageContent() {
  const { showXPToast } = useXPToast();

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
  const [view, setView] = useState<ViewMode>("books");
  const [testamentFilter, setTestamentFilter] = useState<"AT" | "NT">("NT");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontSize, setFontSize] = useState(16);
  const [verseBold, setVerseBold] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  const [verseNotes, setVerseNotes] = useState<Record<string, string>>({});
  const [noteInput, setNoteInput] = useState("");
  const [verseColors, setVerseColors] = useState<Record<string, string>>({});
  const colorsLoadedRef = useRef(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [verseToColor, setVerseToColor] = useState<number | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [verseToShare, setVerseToShare] = useState<{ verse: number; text: string } | null>(null);

  // Translation + compare state
  const [translationSheetOpen, setTranslationSheetOpen] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareTranslation, setCompareTranslation] = useState("KJV");
  const [compareVerses, setCompareVerses] = useState<BibleVerseRow[]>([]);
  const [compareLoading, setCompareLoading] = useState(false);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);
  const translationInitialized = useRef(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  const openShareModal = (v: number, text: string) => {
    setVerseToShare({ verse: v, text });
    setShareModalOpen(true);
  };

  const confirmShare = () => {
    if (verseToShare && bookId && chapter && selectedBook) {
      const verseText = stripHtml(verseToShare.text);
      const encodedText = encodeURIComponent(verseText);
      router.push(
        `/chat?verse=${bookId}-${chapter}-${verseToShare.verse}&text=${encodedText}&ref=${encodeURIComponent(selectedBook.name)}`,
      );
    }
    setShareModalOpen(false);
  };

  const HIGHLIGHT_COLORS = [
    { name: "Jaune", hex: "#FACC15" },
    { name: "Vert", hex: "#4ADE80" },
    { name: "Bleu", hex: "#60A5FA" },
    { name: "Rose", hex: "#F472B6" },
    { name: "Violet", hex: "#A78BFA" },
    { name: "Orange", hex: "#FB923C" },
    { name: "Rouge", hex: "#F87171" },
    { name: "Gris", hex: "#9CA3AF" },
  ];

  // ── Load data from localStorage ─────────────────────
  useEffect(() => {
    const savedColors = localStorage.getItem("bible-colors");
    if (savedColors) {
      try { setVerseColors(JSON.parse(savedColors)); } catch { setVerseColors({}); }
    }
    const savedNotes = localStorage.getItem("bible-notes");
    if (savedNotes) {
      try { setVerseNotes(JSON.parse(savedNotes)); } catch { setVerseNotes({}); }
    }
    const timer = setTimeout(() => { colorsLoadedRef.current = true; }, 0);
    return () => clearTimeout(timer);
  }, []);

  // ── Load verse settings + preferred_translation from Supabase ─────────────
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("verse_font_size, verse_bold, preferred_translation")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        if (data.verse_font_size) setFontSize(data.verse_font_size);
        if (data.verse_bold !== null) setVerseBold(data.verse_bold);
        if (data.preferred_translation && TRANSLATION_OPTIONS.some((t) => t.slug === data.preferred_translation)) {
          setTranslation(data.preferred_translation);
        }
      }
      translationInitialized.current = true;
    })();
  }, []);

  // ── Save verse settings to Supabase ─────────────────────
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ verse_font_size: fontSize, verse_bold: verseBold })
        .eq("id", user.id);
    })();
  }, [fontSize, verseBold]);

  // ── Save preferred_translation (skip initial load) ───────────────────────
  useEffect(() => {
    if (!translationInitialized.current) return;
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("profiles")
        .update({ preferred_translation: translation })
        .eq("id", user.id);
    })();
  }, [translation]);

  // ── Save to localStorage ─────────────────────
  useEffect(() => {
    if (colorsLoadedRef.current) localStorage.setItem("bible-colors", JSON.stringify(verseColors));
  }, [verseColors]);

  useEffect(() => {
    if (colorsLoadedRef.current) localStorage.setItem("bible-notes", JSON.stringify(verseNotes));
  }, [verseNotes]);

  // ── Load compare verses ─────────────────────
  useEffect(() => {
    if (!compareMode || bookId === null || chapter === null) {
      setCompareVerses([]);
      return;
    }
    setCompareLoading(true);
    void getChapter(compareTranslation, bookId, chapter)
      .then(setCompareVerses)
      .catch(() => setCompareVerses([]))
      .finally(() => setCompareLoading(false));
  }, [compareMode, compareTranslation, bookId, chapter]);

  // ── Color handlers ─────────────────────
  const getVerseKey = (bid: number, ch: number, v: number) => `${bid}-${ch}-${v}`;
  const getVerseColor = (bid: number, ch: number, v: number) => verseColors[getVerseKey(bid, ch, v)] || null;

  const openColorPicker = (v: number) => { setVerseToColor(v); setColorPickerOpen(true); };

  const applyColor = (colorHex: string) => {
    if (verseToColor !== null && bookId !== null && chapter !== null) {
      const key = getVerseKey(bookId, chapter, verseToColor);
      setVerseColors((prev) => ({ ...prev, [key]: colorHex }));
    }
    setColorPickerOpen(false);
    setVerseToColor(null);
  };

  const removeColor = () => {
    if (verseToColor !== null && bookId !== null && chapter !== null) {
      const key = getVerseKey(bookId, chapter, verseToColor);
      setVerseColors((prev) => { const next = { ...prev }; delete next[key]; return next; });
    }
    setColorPickerOpen(false);
    setVerseToColor(null);
  };

  // ── Note handlers ─────────────────────
  const openNoteSheet = (v: number) => {
    setLongPressVerse(v);
    const key = bookId !== null && chapter !== null ? getVerseKey(bookId, chapter, v) : "";
    setNoteInput(verseNotes[key] || "");
    setSheetOpen(true);
  };

  const saveNote = () => {
    if (longPressVerse !== null && bookId !== null && chapter !== null) {
      const key = getVerseKey(bookId, chapter, longPressVerse);
      const isNewNote = !verseNotes[key] && noteInput.trim().length > 0;
      setVerseNotes((prev) => ({ ...prev, [key]: noteInput }));
      if (isNewNote) {
        void triggerXP("VERSE_ANNOTATED", showXPToast);
      }
    }
    setSheetOpen(false);
    setNoteInput("");
  };

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

  // ── Handle URL parameters for direct navigation ─────────────────────
  useEffect(() => {
    const bookParam = searchParams.get("book");
    const chapterParam = searchParams.get("chapter");
    if (bookParam && chapterParam && books.length > 0) {
      const bookIdParam = Number(bookParam);
      const chapterNum = Number(chapterParam);
      const book = books.find((b) => b.bookid === bookIdParam);
      if (book && chapterNum > 0 && chapterNum <= book.chapters) {
        setBookId(bookIdParam);
        setChapter(chapterNum);
        setView("verses");
        router.replace("/bible", { scroll: false });
      }
    }
  }, [books, searchParams, router]);

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

  // ── Chapter navigation ─────────────────────
  const goToPreviousChapter = () => {
    if (bookId === null || chapter === null) return;
    if (chapter > 1) {
      setChapter(chapter - 1);
    } else {
      const prevBook = books.find((b) => b.bookid === bookId - 1);
      if (prevBook) { setBookId(prevBook.bookid); setChapter(prevBook.chapters); }
    }
    setSelectedVerse(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToNextChapter = () => {
    if (bookId === null || chapter === null) return;
    const currentBook = books.find((b) => b.bookid === bookId);
    if (!currentBook) return;
    if (chapter < currentBook.chapters) {
      setChapter(chapter + 1);
    } else {
      const nextBook = books.find((b) => b.bookid === bookId + 1);
      if (nextBook) { setBookId(nextBook.bookid); setChapter(1); }
    }
    setSelectedVerse(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasPreviousChapter = bookId !== null && (chapter !== null && (chapter > 1 || bookId > 1));
  const hasNextChapter = bookId !== null && chapter !== null && books.length > 0 && (() => {
    const currentBook = books.find((b) => b.bookid === bookId);
    if (!currentBook) return false;
    return chapter < currentBook.chapters || bookId < 66;
  })();

  // ── Long press ─────────────────────────────
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onVersePointerDown = (v: number) => {
    pressTimerRef.current = setTimeout(() => { setLongPressVerse(v); setSheetOpen(true); }, 500);
  };
  const onVersePointerUp = () => { if (pressTimerRef.current) clearTimeout(pressTimerRef.current); };

  // ── Render helpers ─────────────────────────
  const chapterCount = selectedBook?.chapters ?? 0;
  const chapterTitle =
    view === "verses" && bookId && chapter
      ? `${selectedBook?.name ?? ""} ${chapter}`
      : "";

  // Shared translation sheet JSX (reused for primary + compare pickers)
  const renderTranslationList = (
    activeSlug: string,
    disabledSlug: string | null,
    onSelect: (slug: string) => void,
  ) => (
    <div className="px-4 pb-8 pt-2">
      {TRANSLATIONS.map((group) => (
        <div key={group.language} className="mt-4">
          <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary mb-2 px-2">
            {group.language}
          </p>
          <div className="rounded-xl overflow-hidden border border-separator">
            {group.items.map((item, idx) => {
              const isActive = activeSlug === item.slug;
              const isDisabled = disabledSlug === item.slug;
              return (
                <button
                  key={item.slug}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelect(item.slug)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors ${
                    isDisabled
                      ? "opacity-40 cursor-not-allowed"
                      : isActive
                      ? "bg-accent/10"
                      : "hover:bg-bg-tertiary active:bg-bg-tertiary"
                  } ${idx > 0 ? "border-t border-separator/50" : ""}`}
                >
                  <div className="flex flex-col items-start">
                    <span
                      className={`font-sans text-sm font-medium ${isActive && !isDisabled ? "text-accent" : "text-text-primary"}`}
                    >
                      {item.slug}
                    </span>
                    <span className="font-sans text-xs text-text-tertiary mt-0.5">{item.label}</span>
                  </div>
                  {isActive && !isDisabled && (
                    <Check className="h-4 w-4 text-accent shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <AppShell>
      <div className="flex flex-col" style={{ minHeight: "calc(100dvh - 68px)" }}>

        {/* ══ STICKY HEADER ══════════════════════════════════ */}
        <header className="sticky top-0 z-20 bg-bg-primary/90 backdrop-blur-md px-4 pt-4 pb-3 border-b border-separator">
          {/* Row 1: Navigation */}
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
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">BIBLE</p>
                    <p className="font-serif text-base text-text-primary leading-tight truncate">{selectedBook?.name}</p>
                  </motion.div>
                )}
                {view === "verses" && (
                  <motion.div
                    key="title-verses"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                  >
                    <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">{selectedBook?.name}</p>
                    <p className="font-serif text-base text-text-primary leading-tight">{chapterTitle}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Settings button (font size + bold) */}
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
                <span className="flex items-center gap-[3px]">
                  <span className="block h-1 w-1 rounded-full bg-current" />
                  <span className="block h-1 w-1 rounded-full bg-current" />
                  <span className="block h-1 w-1 rounded-full bg-current" />
                </span>
              </button>

              <AnimatePresence>
                {settingsOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute right-0 top-11 z-50 w-56 rounded-2xl border border-separator bg-bg-secondary/95 backdrop-blur-xl p-4 shadow-xl shadow-black/40"
                  >
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
                      <span
                        className="font-serif text-text-tertiary select-none transition-all duration-200"
                        style={{ fontSize: `${fontSize}px` }}
                      >
                        A
                      </span>
                    </div>
                    <p className="mt-1.5 text-center font-sans text-[10px] text-text-tertiary">{fontSize}px</p>

                    {/* Bold toggle */}
                    <div className="mt-4 flex items-center justify-between rounded-xl border border-separator bg-bg-tertiary px-4 py-3">
                      <span className="font-sans text-xs text-text-primary">Texte en gras</span>
                      <button
                        type="button"
                        onClick={() => setVerseBold(!verseBold)}
                        className={`relative h-6 w-11 rounded-full transition-colors ${
                          verseBold ? "bg-accent" : "bg-separator"
                        }`}
                        aria-label="Activer le texte en gras"
                      >
                        <span
                          className={`absolute left-0.5 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                            verseBold ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Row 2: Translation selector + Compare button */}
          <div className="flex items-center gap-2 mt-2.5">
            {/* Primary translation pill */}
            <button
              type="button"
              onClick={() => setTranslationSheetOpen(true)}
              style={{
                background: "#1c1c1c",
                border: "0.5px solid #2a2a2a",
                borderRadius: "10px",
                color: "#E8E8E8",
                fontFamily: "var(--font-sans)",
                fontSize: "13px",
                padding: "5px 12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <span>{translation}</span>
              <span style={{ color: "#666666", fontSize: "10px" }}>▾</span>
            </button>

            {/* Compare toggle button */}
            <button
              type="button"
              onClick={() => {
                setCompareMode((prev) => {
                  if (prev) setCompareVerses([]);
                  return !prev;
                });
              }}
              style={{
                background: compareMode ? "rgba(123,111,212,0.15)" : "#1c1c1c",
                border: compareMode ? "0.5px solid rgba(123,111,212,0.5)" : "0.5px solid #2a2a2a",
                borderRadius: "10px",
                color: compareMode ? "#7B6FD4" : "#666666",
                fontFamily: "var(--font-sans)",
                fontSize: "12px",
                padding: "5px 12px",
                cursor: "pointer",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Comparer
            </button>

            {/* Compare translation pill (visible only in compare mode) */}
            <AnimatePresence>
              {compareMode && (
                <motion.button
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  type="button"
                  onClick={() => setCompareSheetOpen(true)}
                  style={{
                    background: "#1c1c1c",
                    border: "0.5px solid rgba(123,111,212,0.4)",
                    borderRadius: "10px",
                    color: "#7B6FD4",
                    fontFamily: "var(--font-sans)",
                    fontSize: "13px",
                    padding: "5px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <span>{compareTranslation}</span>
                  <span style={{ fontSize: "10px" }}>▾</span>
                </motion.button>
              )}
            </AnimatePresence>
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
                      <div key={i} className="h-14 rounded-xl bg-bg-secondary animate-pulse" />
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
                          {b.name.split(" ").slice(-1)[0]}
                        </span>
                        <span className="font-sans text-[9px] text-text-tertiary">{b.chapters} ch.</span>
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
                className="pt-5 pb-28"
              >
                {err && <p className="px-4 text-center text-sm text-danger">{err}</p>}

                {compareMode ? (
                  /* ── Compare mode: two columns ── */
                  <div className="grid grid-cols-2 divide-x divide-separator/40">
                    {/* Primary translation column */}
                    <div className="px-3">
                      <button
                        type="button"
                        onClick={() => setTranslationSheetOpen(true)}
                        className="mb-3 flex items-center gap-1"
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      >
                        <span className="font-sans text-[10px] uppercase tracking-wider text-accent">{translation}</span>
                        <span style={{ color: "#7B6FD4", fontSize: "9px" }}>▾</span>
                      </button>
                      {loading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="space-y-1">
                              <div className="h-2.5 rounded bg-bg-tertiary animate-pulse" />
                              <div className="h-2.5 w-4/5 rounded bg-bg-tertiary animate-pulse" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          {verses.map((row) => (
                            <p
                              key={row.pk}
                              className="py-2.5 border-b border-separator/30 font-serif text-text-primary leading-relaxed"
                              style={{ fontSize: "13px" }}
                            >
                              <span className="font-sans text-[10px] text-text-tertiary mr-1.5">{row.verse}</span>
                              {stripHtml(row.text)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Compare translation column */}
                    <div className="px-3">
                      <button
                        type="button"
                        onClick={() => setCompareSheetOpen(true)}
                        className="mb-3 flex items-center gap-1"
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                      >
                        <span className="font-sans text-[10px] uppercase tracking-wider text-accent">{compareTranslation}</span>
                        <span style={{ color: "#7B6FD4", fontSize: "9px" }}>▾</span>
                      </button>
                      {compareLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="space-y-1">
                              <div className="h-2.5 rounded bg-bg-tertiary animate-pulse" />
                              <div className="h-2.5 w-4/5 rounded bg-bg-tertiary animate-pulse" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div>
                          {compareVerses.map((row) => (
                            <p
                              key={row.pk}
                              className="py-2.5 border-b border-separator/30 font-serif text-text-primary leading-relaxed"
                              style={{ fontSize: "13px" }}
                            >
                              <span className="font-sans text-[10px] text-text-tertiary mr-1.5">{row.verse}</span>
                              {stripHtml(row.text)}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ── Normal mode ── */
                  <div className="px-4">
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
                          const verseColor = getVerseColor(bookId!, chapter!, row.verse);
                          const colorStyle = verseColor
                            ? { backgroundColor: `${verseColor}20`, borderLeft: `3px solid ${verseColor}` }
                            : undefined;
                          return (
                            <motion.div
                              key={row.pk}
                              layout
                              className={`py-4 cursor-pointer transition-colors ${
                                active ? "rounded-xl bg-bg-secondary px-3 -mx-3" : ""
                              }`}
                              style={colorStyle}
                              onClick={() =>
                                setSelectedVerse((v) => (v === row.verse ? null : row.verse))
                              }
                              onPointerDown={() => onVersePointerDown(row.verse)}
                              onPointerUp={onVersePointerUp}
                              onPointerLeave={onVersePointerUp}
                            >
                              <p className="flex gap-3 leading-[1.9]">
                                <span className="relative min-w-[1.5rem] shrink-0 font-sans text-xs text-text-tertiary pt-1">
                                  {row.verse}
                                  {verseNotes[getVerseKey(bookId!, chapter!, row.verse)] && (
                                    <span className="absolute -top-0.5 -right-1 h-1.5 w-1.5 rounded-full bg-accent" />
                                  )}
                                </span>
                                <span
                                  className={`font-serif text-text-primary ${verseBold ? "font-bold" : ""}`}
                                  style={{ fontSize: `${fontSize}px`, lineHeight: 1.85 }}
                                >
                                  {stripHtml(row.text)}
                                </span>
                              </p>
                              {active && (
                                <motion.div
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="mt-3 ml-[2.1rem] flex items-center gap-3 flex-wrap"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openShareModal(row.verse, row.text);
                                    }}
                                    className="flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                                    aria-label="Demander l'aide de l'IA"
                                  >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    EXPLIQUER AVEC AGAPE →
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openColorPicker(row.verse);
                                    }}
                                    className={`flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider transition-colors ${
                                      verseColors[getVerseKey(bookId!, chapter!, row.verse)]
                                        ? "text-accent"
                                        : "text-text-secondary hover:text-text-primary"
                                    }`}
                                    aria-label="Marquer le verset"
                                  >
                                    <Palette className="h-3.5 w-3.5" />
                                    {verseColors[getVerseKey(bookId!, chapter!, row.verse)] ? "MARQUÉ" : "MARQUER"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openNoteSheet(row.verse);
                                    }}
                                    className={`flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider transition-colors ${
                                      verseNotes[getVerseKey(bookId!, chapter!, row.verse)]
                                        ? "text-accent"
                                        : "text-text-secondary hover:text-text-primary"
                                    }`}
                                    aria-label="Ajouter une note"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {verseNotes[getVerseKey(bookId!, chapter!, row.verse)] ? "NOTE" : "NOTER"}
                                  </button>
                                </motion.div>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Chapter navigation buttons (normal mode only) */}
                {!loading && !err && verses.length > 0 && !compareMode && (
                  <div className="mt-8 px-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={goToPreviousChapter}
                      disabled={!hasPreviousChapter}
                      className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-sans text-xs uppercase tracking-wider transition-all ${
                        hasPreviousChapter
                          ? "bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-separator"
                          : "bg-bg-secondary/50 text-text-tertiary/50 cursor-not-allowed"
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Précédent
                    </button>
                    <button
                      type="button"
                      onClick={goToNextChapter}
                      disabled={!hasNextChapter}
                      className={`flex items-center gap-2 rounded-full px-4 py-2.5 font-sans text-xs uppercase tracking-wider transition-all ${
                        hasNextChapter
                          ? "bg-bg-secondary text-text-primary hover:bg-bg-tertiary border border-separator"
                          : "bg-bg-secondary/50 text-text-tertiary/50 cursor-not-allowed"
                      }`}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>

      {/* ══ MODAL: Confirmation pour l'IA ═════════════════════════ */}
      <AnimatePresence>
        {shareModalOpen && verseToShare ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShareModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[380px] rounded-2xl border border-separator bg-bg-secondary p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 border border-accent/20">
                  <Sparkles className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">COMPRENDRE AVEC AGAPE</p>
                  <p className="font-serif text-base text-text-primary">
                    {selectedBook?.name} {chapter}:{verseToShare.verse}
                  </p>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <p className="font-serif text-sm text-text-primary leading-relaxed">
                  &ldquo;Mais le Consolateur, l&apos;Esprit-Saint, que le Père enverra en mon nom, vous enseignera toutes choses.&rdquo;
                </p>
                <p className="font-sans text-xs text-text-secondary leading-relaxed">
                  Avant de demander à l&apos;IA une explication, nous t&apos;invitons à d&apos;abord chercher la compréhension du Saint-Esprit. L&apos;Agape de Dieu réside dans la communion avec Lui.
                </p>
                <p className="font-sans text-xs text-text-tertiary italic">
                  Es-tu sûr de vouloir continuer et demander l&apos;aide de l&apos;IA pour ce verset ?
                </p>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1" onClick={() => setShareModalOpen(false)}>
                  Annuler
                </Button>
                <Button variant="primary" className="flex-1" onClick={confirmShare}>
                  Je veux
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ══ BOTTOM SHEET: Color Picker ═════════════════════════ */}
      <AnimatePresence>
        {colorPickerOpen && verseToColor ? (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[430px] rounded-t-2xl border border-separator bg-bg-secondary p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 border border-accent/20">
                <Palette className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">SURLIGNER</p>
                <p className="font-serif text-base text-text-primary">
                  {selectedBook?.name} {chapter}:{verseToColor}
                </p>
              </div>
            </div>
            <p className="font-sans text-xs text-text-secondary mb-4">Choisis une couleur pour surligner ce verset :</p>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {HIGHLIGHT_COLORS.map((color) => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => applyColor(color.hex)}
                  className={`aspect-square rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${
                    verseColors[getVerseKey(bookId!, chapter!, verseToColor)] === color.hex
                      ? "border-accent ring-2 ring-accent/30"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color.hex + "40" }}
                  aria-label={`Couleur ${color.name}`}
                >
                  <div className="w-full h-full rounded-lg" style={{ backgroundColor: color.hex }} />
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => { setColorPickerOpen(false); setVerseToColor(null); }}
              >
                Annuler
              </Button>
              {verseColors[getVerseKey(bookId!, chapter!, verseToColor)] && (
                <Button
                  variant="ghost"
                  className="flex-1 bg-danger/10 text-danger border-danger/30 hover:bg-danger/20"
                  onClick={removeColor}
                >
                  Retirer
                </Button>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ══ BOTTOM SHEET: Notes ════════════════════════════ */}
      <AnimatePresence>
        {sheetOpen && longPressVerse ? (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-x-0 bottom-0 z-[60] mx-auto max-w-[430px] rounded-t-2xl border border-separator bg-bg-secondary p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 border border-accent/20">
                <StickyNote className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">NOTE</p>
                <p className="font-serif text-base text-text-primary">
                  {selectedBook?.name} {chapter}:{longPressVerse}
                </p>
              </div>
            </div>
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="Écris ta note ici..."
              className="w-full min-h-[120px] rounded-xl border border-separator bg-bg-primary px-4 py-3 font-serif text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent/50 resize-none"
            />
            <div className="mt-4 flex gap-3">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => { setSheetOpen(false); setNoteInput(""); }}
              >
                Annuler
              </Button>
              <Button variant="primary" className="flex-1" onClick={saveNote}>
                Enregistrer
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ══ BOTTOM SHEET: Translation picker (primary) ════════════════════════ */}
      <AnimatePresence>
        {translationSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[65] bg-black/50"
              onClick={() => setTranslationSheetOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-2xl border border-separator bg-bg-secondary"
              style={{ maxHeight: "80vh", overflowY: "auto" }}
            >
              <div className="sticky top-0 bg-bg-secondary px-6 pt-5 pb-3 border-b border-separator/50">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">TRADUCTION</p>
                <p className="font-serif text-lg text-text-primary mt-0.5">Choisir une traduction</p>
              </div>
              {renderTranslationList(translation, null, (slug) => {
                setTranslation(slug);
                setVerses([]);
                setTranslationSheetOpen(false);
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══ BOTTOM SHEET: Compare translation picker ════════════════════════ */}
      <AnimatePresence>
        {compareSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[65] bg-black/50"
              onClick={() => setCompareSheetOpen(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[430px] rounded-t-2xl border border-separator bg-bg-secondary"
              style={{ maxHeight: "80vh", overflowY: "auto" }}
            >
              <div className="sticky top-0 bg-bg-secondary px-6 pt-5 pb-3 border-b border-separator/50">
                <p className="font-sans text-[10px] uppercase tracking-[0.18em] text-text-tertiary">COMPARAISON</p>
                <p className="font-serif text-lg text-text-primary mt-0.5">Traduction à comparer</p>
              </div>
              {renderTranslationList(compareTranslation, translation, (slug) => {
                setCompareTranslation(slug);
                setCompareVerses([]);
                setCompareSheetOpen(false);
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </AppShell>
  );
}

export default function BiblePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BiblePageContent />
    </Suspense>
  );
}
