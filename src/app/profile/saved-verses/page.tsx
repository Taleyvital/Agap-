"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Trash2, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { getChapter } from "@/lib/bible";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import type { BibleVerseRow } from "@/lib/types";

interface SavedVerse {
  bookId: number;
  chapter: number;
  verse: number;
  color: string;
  text: string;
  bookName?: string;
}

export default function SavedVersesPage() {
  const router = useRouter();
  const [savedVerses, setSavedVerses] = useState<SavedVerse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Load books first
      let booksData: { bookid: number; name: string }[] = [];
      try {
        const { getBooks } = await import("@/lib/bible");
        booksData = await getBooks("FRLSG");
      } catch (e) {
        console.error("Failed to load books", e);
      }

      // Load saved verses from localStorage
      const savedColors = localStorage.getItem("bible-colors");
      if (!savedColors) {
        setLoading(false);
        return;
      }

      const colors = JSON.parse(savedColors);
      const verseKeys = Object.keys(colors);

      if (verseKeys.length === 0) {
        setLoading(false);
        return;
      }

      // Parse keys and fetch verse texts
      const verses: SavedVerse[] = [];

      for (const key of verseKeys) {
        const [bookId, chapter, verse] = key.split("-").map(Number);
        verses.push({
          bookId,
          chapter,
          verse,
          color: colors[key],
          text: "",
        });
      }

      // Group by book and chapter to minimize API calls
      const chapterGroups = verses.reduce((acc, v) => {
        const key = `${v.bookId}-${v.chapter}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(v);
        return acc;
      }, {} as Record<string, SavedVerse[]>);

      // Fetch chapters
      for (const [key, groupVerses] of Object.entries(chapterGroups)) {
        const [bookId, chapter] = key.split("-").map(Number);
        try {
          const chapterData = await getChapter("FRLSG", bookId, chapter);
          const bookInfo = booksData.find(b => b.bookid === bookId);

          for (const v of groupVerses) {
            const verseData = chapterData.find((row: BibleVerseRow) => row.verse === v.verse);
            if (verseData) {
              v.text = verseData.text.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
              v.bookName = bookInfo?.name;
            }
          }
        } catch (e) {
          console.error("Failed to load chapter", e);
        }
      }

      setSavedVerses(verses.filter(v => v.text));
      setLoading(false);
    })();
  }, [router]);

  const removeVerse = (bookId: number, chapter: number, verse: number) => {
    const savedColors = localStorage.getItem("bible-colors");
    if (savedColors) {
      const colors = JSON.parse(savedColors);
      const key = `${bookId}-${chapter}-${verse}`;
      delete colors[key];
      localStorage.setItem("bible-colors", JSON.stringify(colors));
      setSavedVerses(prev => prev.filter(v => !(v.bookId === bookId && v.chapter === chapter && v.verse === verse)));
    }
  };

  const clearAll = () => {
    if (confirm("Voulez-vous vraiment supprimer tous les versets marqués ?")) {
      localStorage.removeItem("bible-colors");
      setSavedVerses([]);
    }
  };

  return (
    <AppShell>
      <div className="px-5 pt-6 pb-32">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-secondary border border-separator text-text-primary"
            aria-label="Retour"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h1 className="font-serif text-xl text-text-primary">Versets marqués</h1>
        </header>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-bg-secondary animate-pulse" />
            ))}
          </div>
        ) : savedVerses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <BookOpen className="h-12 w-12 text-text-tertiary mb-4" />
            <p className="font-serif text-lg text-text-secondary">Aucun verset marqué</p>
            <p className="mt-2 font-sans text-sm text-text-tertiary">
              Marquez des versets dans la Bible pour les retrouver ici
            </p>
            <Link
              href="/bible"
              className="mt-6 rounded-full bg-accent px-6 py-3 font-sans text-xs uppercase tracking-wider text-white"
            >
              Aller à la Bible
            </Link>
          </div>
        ) : (
          <>
            {/* Clear all button */}
            {savedVerses.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="mb-4 flex items-center gap-2 text-xs text-danger hover:text-danger/80 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Tout effacer
              </button>
            )}

            {/* Verses list */}
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {savedVerses.map((verse) => (
                  <motion.div
                    key={`${verse.bookId}-${verse.chapter}-${verse.verse}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative rounded-xl border-l-4 p-4"
                    style={{
                      backgroundColor: `${verse.color}15`,
                      borderLeftColor: verse.color,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => removeVerse(verse.bookId, verse.chapter, verse.verse)}
                      className="absolute top-3 right-3 p-1 text-text-tertiary hover:text-danger transition-colors"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    <p className="font-serif italic text-text-primary pr-8">
                      &ldquo;{verse.text}&rdquo;
                    </p>

                    <Link
                      href={`/bible?book=${verse.bookId}&chapter=${verse.chapter}`}
                      className="mt-3 inline-flex items-center gap-1.5 font-sans text-xs uppercase tracking-wider text-accent hover:text-accent/80 transition-colors"
                    >
                      <BookOpen className="h-3 w-3" />
                      {verse.bookName} {verse.chapter}:{verse.verse}
                    </Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
