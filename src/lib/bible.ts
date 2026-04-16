import type { BibleBook, BibleVerseRow } from "@/lib/types";

export const DEFAULT_TRANSLATION = "LSG";

export const TRANSLATIONS: { language: string; items: { slug: string; label: string }[] }[] = [
  {
    language: "Français",
    items: [
      { slug: "LSG", label: "Louis Segond 1910" },
      { slug: "NEG", label: "Nouvelle Édition de Genève" },
      { slug: "NBS", label: "Nouvelle Bible Segond" },
      { slug: "BDS", label: "Bible du Semeur" },
      { slug: "PDV", label: "Parole de Vie" },
      { slug: "S21", label: "Segond 21" },
      { slug: "TOB", label: "Traduction Œcuménique" },
    ],
  },
  {
    language: "English",
    items: [
      { slug: "KJV", label: "King James Version" },
      { slug: "NIV", label: "New International Version" },
      { slug: "ESV", label: "English Standard Version" },
      { slug: "NLT", label: "New Living Translation" },
      { slug: "NKJV", label: "New King James Version" },
      { slug: "MSG", label: "The Message" },
    ],
  },
  {
    language: "Português",
    items: [
      { slug: "ARC", label: "Almeida Revista e Corrigida" },
      { slug: "NVI-PT", label: "Nova Versão Internacional" },
    ],
  },
  {
    language: "Español",
    items: [
      { slug: "RVR1960", label: "Reina Valera 1960" },
      { slug: "NVI", label: "Nueva Versión Internacional" },
    ],
  },
];

/** Flat list of all translation options (for backward compat) */
export const TRANSLATION_OPTIONS = TRANSLATIONS.flatMap((g) => g.items);

const BASE_URL = "https://bolls.life";

export const getBooks = (translation = DEFAULT_TRANSLATION): Promise<BibleBook[]> =>
  fetch(`${BASE_URL}/get-books/${translation}/`).then(async (r) => {
    if (!r.ok) throw new Error("Impossible de charger les livres");
    const data = (await r.json()) as BibleBook[];
    return data;
  });

export const getChapter = (
  translation: string,
  book: number,
  chapter: number,
): Promise<BibleVerseRow[]> =>
  fetch(`${BASE_URL}/get-chapter/${translation}/${book}/${chapter}/`).then(async (r) => {
    if (!r.ok) throw new Error("Impossible de charger le chapitre");
    const data = (await r.json()) as BibleVerseRow[];
    return data;
  });
