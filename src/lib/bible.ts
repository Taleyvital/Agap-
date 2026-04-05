import type { BibleBook, BibleVerseRow } from "@/lib/types";

/** Traduction française NBS (Nouvelle Bible Segond) sur Bolls — texte des versets en français. */
export const DEFAULT_TRANSLATION = "NBS";

/** NBS = français par défaut ; NKJV conservé en option pour comparaison. */
export const TRANSLATION_OPTIONS: { slug: string; label: string }[] = [
  { slug: "NBS", label: "Français (NBS)" },
  { slug: "NKJV", label: "English (NKJV)" },
];

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
  fetch(
    `${BASE_URL}/get-chapter/${translation}/${book}/${chapter}/`,
  ).then(async (r) => {
    if (!r.ok) throw new Error("Impossible de charger le chapitre");
    const data = (await r.json()) as BibleVerseRow[];
    return data;
  });
