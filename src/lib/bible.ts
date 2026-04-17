import type { BibleBook, BibleVerseRow } from "@/lib/types";

// ── Translation configuration ─────────────────────────────────────────────────
// Only translations available via getBible.net (free, CDN, no key required).
// Copyrighted translations (NBS, BDS, NIV, ESV…) require API.Bible — see
// /api/bible/* proxy routes which activate automatically when BIBLE_API_KEY is set.

export const DEFAULT_TRANSLATION = "FRLSG";

export const TRANSLATIONS: { language: string; items: { slug: string; label: string }[] }[] = [
  {
    language: "Français",
    items: [
      { slug: "FRLSG", label: "Louis Segond 1910" },
      { slug: "FRDBY", label: "Darby (1885)" },
    ],
  },
  {
    language: "English",
    items: [
      { slug: "KJV", label: "King James Version" },
      { slug: "ASV", label: "American Standard Version" },
      { slug: "WEB", label: "World English Bible" },
    ],
  },
  {
    language: "Español",
    items: [{ slug: "RV1909", label: "Reina Valera 1909" }],
  },
  {
    language: "Português",
    items: [{ slug: "ALMEIDA", label: "Almeida Atualizada" }],
  },
];

export const TRANSLATION_OPTIONS = TRANSLATIONS.flatMap((g) => g.items);

// ── getBible.net slug mapping ─────────────────────────────────────────────────
// Maps internal app slugs → getBible.net translation identifiers.
const GETBIBLE_SLUGS: Record<string, string> = {
  FRLSG: "ls1910",
  FRDBY: "darby",
  KJV: "kjv",
  ASV: "asv",
  WEB: "web",
  RV1909: "valera",
  ALMEIDA: "almeida",
};

const GETBIBLE_BASE = "https://api.getbible.net/v2";

// ── Static book lists ─────────────────────────────────────────────────────────
// The 66-book Protestant canon is static — no need to fetch it.
// Book names are provided per language; chapter counts are identical for all.

const CHAPTER_COUNTS = [
  50, 40, 27, 36, 34, 24, 21, 4, 31, 24, 22, 25, 29, 36, 10, 13, 10, 42, 150,
  31, 12, 8, 66, 52, 5, 48, 12, 14, 3, 9, 1, 4, 7, 3, 3, 3, 2, 14, 4, 28, 16,
  24, 21, 28, 16, 16, 13, 6, 6, 4, 4, 5, 3, 6, 4, 3, 1, 13, 5, 5, 3, 5, 1, 1,
  1, 22,
];

const FRENCH_BOOK_NAMES = [
  "Genèse", "Exode", "Lévitique", "Nombres", "Deutéronome", "Josué", "Juges",
  "Ruth", "1 Samuel", "2 Samuel", "1 Rois", "2 Rois", "1 Chroniques",
  "2 Chroniques", "Esdras", "Néhémie", "Esther", "Job", "Psaumes", "Proverbes",
  "Ecclésiaste", "Cantique des cantiques", "Ésaïe", "Jérémie", "Lamentations",
  "Ézéchiel", "Daniel", "Osée", "Joël", "Amos", "Abdias", "Jonas", "Michée",
  "Nahum", "Habacuc", "Sophonie", "Aggée", "Zacharie", "Malachie", "Matthieu",
  "Marc", "Luc", "Jean", "Actes", "Romains", "1 Corinthiens", "2 Corinthiens",
  "Galates", "Éphésiens", "Philippiens", "Colossiens", "1 Thessaloniciens",
  "2 Thessaloniciens", "1 Timothée", "2 Timothée", "Tite", "Philémon",
  "Hébreux", "Jacques", "1 Pierre", "2 Pierre", "1 Jean", "2 Jean", "3 Jean",
  "Jude", "Apocalypse",
];

const ENGLISH_BOOK_NAMES = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua",
  "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
  "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
  "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
  "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
  "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
  "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans",
  "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
  "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy",
  "Titus", "Philemon", "Hebrews", "James", "1 Peter", "2 Peter", "1 John",
  "2 John", "3 John", "Jude", "Revelation",
];

const SPANISH_BOOK_NAMES = [
  "Génesis", "Éxodo", "Levítico", "Números", "Deuteronomio", "Josué",
  "Jueces", "Rut", "1 Samuel", "2 Samuel", "1 Reyes", "2 Reyes",
  "1 Crónicas", "2 Crónicas", "Esdras", "Nehemías", "Ester", "Job",
  "Salmos", "Proverbios", "Eclesiastés", "Cantares", "Isaías", "Jeremías",
  "Lamentaciones", "Ezequiel", "Daniel", "Oseas", "Joel", "Amós", "Abdías",
  "Jonás", "Miqueas", "Nahúm", "Habacuc", "Sofonías", "Hageo", "Zacarías",
  "Malaquías", "Mateo", "Marcos", "Lucas", "Juan", "Hechos", "Romanos",
  "1 Corintios", "2 Corintios", "Gálatas", "Efesios", "Filipenses",
  "Colosenses", "1 Tesalonicenses", "2 Tesalonicenses", "1 Timoteo",
  "2 Timoteo", "Tito", "Filemón", "Hebreos", "Santiago", "1 Pedro", "2 Pedro",
  "1 Juan", "2 Juan", "3 Juan", "Judas", "Apocalipsis",
];

const PORTUGUESE_BOOK_NAMES = [
  "Gênesis", "Êxodo", "Levítico", "Números", "Deuteronômio", "Josué",
  "Juízes", "Rute", "1 Samuel", "2 Samuel", "1 Reis", "2 Reis",
  "1 Crônicas", "2 Crônicas", "Esdras", "Neemias", "Ester", "Jó",
  "Salmos", "Provérbios", "Eclesiastes", "Cânticos", "Isaías", "Jeremias",
  "Lamentações", "Ezequiel", "Daniel", "Oseias", "Joel", "Amós", "Obadias",
  "Jonas", "Miqueias", "Naum", "Habacuque", "Sofonias", "Ageu", "Zacarias",
  "Malaquias", "Mateus", "Marcos", "Lucas", "João", "Atos", "Romanos",
  "1 Coríntios", "2 Coríntios", "Gálatas", "Efésios", "Filipenses",
  "Colossenses", "1 Tessalonicenses", "2 Tessalonicenses", "1 Timóteo",
  "2 Timóteo", "Tito", "Filemom", "Hebreus", "Tiago", "1 Pedro", "2 Pedro",
  "1 João", "2 João", "3 João", "Judas", "Apocalipse",
];

function getBookNames(translation: string): string[] {
  const slug = translation.toUpperCase();
  if (slug === "FRLSG" || slug === "FRDBY") return FRENCH_BOOK_NAMES;
  if (slug === "RV1909") return SPANISH_BOOK_NAMES;
  if (slug === "ALMEIDA") return PORTUGUESE_BOOK_NAMES;
  return ENGLISH_BOOK_NAMES;
}

function buildBookList(translation: string): BibleBook[] {
  const names = getBookNames(translation);
  return names.map((name, i) => ({
    bookid: i + 1,
    name,
    chronorder: i + 1,
    chapters: CHAPTER_COUNTS[i] ?? 1,
  }));
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the list of Bible books for the given translation.
 * Data is static (canonical 66-book Protestant Bible) — resolved synchronously.
 */
export const getBooks = (translation = DEFAULT_TRANSLATION): Promise<BibleBook[]> =>
  Promise.resolve(buildBookList(translation));

/**
 * Fetches a single chapter from getBible.net.
 * The response shape is adapted to match the existing BibleVerseRow type so
 * no component changes are required.
 *
 * When BIBLE_API_KEY is set and you have activated your API.Bible account,
 * replace the fetch below with a call to /api/bible/chapter which proxies
 * API.Bible server-side and gives access to copyrighted translations
 * (NBS, BDS, NIV, ESV…).
 */
export const getChapter = (
  translation: string,
  book: number,
  chapter: number,
): Promise<BibleVerseRow[]> => {
  const slug = GETBIBLE_SLUGS[translation] ?? GETBIBLE_SLUGS[DEFAULT_TRANSLATION];
  return fetch(`${GETBIBLE_BASE}/${slug}/${book}/${chapter}.json`).then(async (r) => {
    if (!r.ok) throw new Error("Impossible de charger le chapitre");
    const data = (await r.json()) as {
      verses: { verse: number; text: string }[];
    };
    return data.verses.map((v, i) => ({
      pk: i + 1,
      verse: v.verse,
      text: v.text,
    }));
  });
};
