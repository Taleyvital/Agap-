import { NextResponse } from "next/server";

// bolls.life book ID (1-66) → OSIS code used by STEP Bible
const OSIS: Record<number, string> = {
  1: "Gen", 2: "Exod", 3: "Lev", 4: "Num", 5: "Deut",
  6: "Josh", 7: "Judg", 8: "Ruth", 9: "1Sam", 10: "2Sam",
  11: "1Kgs", 12: "2Kgs", 13: "1Chr", 14: "2Chr", 15: "Ezra",
  16: "Neh", 17: "Esth", 18: "Job", 19: "Ps", 20: "Prov",
  21: "Eccl", 22: "Song", 23: "Isa", 24: "Jer", 25: "Lam",
  26: "Ezek", 27: "Dan", 28: "Hos", 29: "Joel", 30: "Amos",
  31: "Obad", 32: "Jonah", 33: "Mic", 34: "Nah", 35: "Hab",
  36: "Zeph", 37: "Hag", 38: "Zech", 39: "Mal",
  40: "Matt", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts",
  45: "Rom", 46: "1Cor", 47: "2Cor", 48: "Gal", 49: "Eph",
  50: "Phil", 51: "Col", 52: "1Thess", 53: "2Thess", 54: "1Tim",
  55: "2Tim", 56: "Titus", 57: "Phlm", 58: "Heb", 59: "Jas",
  60: "1Pet", 61: "2Pet", 62: "1John", 63: "2John", 64: "3John",
  65: "Jude", 66: "Rev",
};

const AT_MAX = 39;

export interface WordToken {
  word: string;
  strong: string | null;
  transliteration: string | null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const bookId  = parseInt(searchParams.get("book")    ?? "0");
  const chapter = parseInt(searchParams.get("chapter") ?? "0");
  const verse   = parseInt(searchParams.get("verse")   ?? "0");

  if (!bookId || !chapter || !verse || !OSIS[bookId]) {
    return NextResponse.json({ words: [] });
  }

  const isOT   = bookId <= AT_MAX;
  const version = isOT ? "WLC" : "SBLG";
  const passage = `${OSIS[bookId]}.${chapter}.${verse}`;

  try {
    const url =
      `https://www.stepbible.org/api/v2/passage/text` +
      `?passage=${passage}&options=ENGUES&version=${version}`;

    const res = await fetch(url, {
      headers: { "User-Agent": "AGAPE-Bible-App/1.0" },
      next: { revalidate: 86_400 * 7 }, // cache 7 days
    });

    if (!res.ok) throw new Error(`STEP ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    const words = parseWords(data);
    return NextResponse.json({ words });
  } catch {
    return NextResponse.json({ words: [] });
  }
}

function parseWords(data: Record<string, unknown>): WordToken[] {
  const result: WordToken[] = [];

  // Extract raw content string from various response shapes
  const content: string =
    (data.content as string) ??
    ((data.verseContent as Array<Record<string, unknown>>)?.[0]?.content as string) ??
    "";

  if (!content) return result;

  // Parse <w lemma="strong:G26" morph="..." xlit="...">word</w>
  const re = /<w\b([^>]*)>([\s\S]*?)<\/w>/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    const attrs  = match[1];
    const word   = match[2].replace(/<[^>]+>/g, "").trim();
    if (!word) continue;

    // lemma="strong:G26" or lemma="strong:G26 strong:G1234"
    const lemmaMatch = attrs.match(/lemma="([^"]*)"/);
    const strongRaw  = lemmaMatch?.[1].match(/strong:([GH]\d+)/i);
    const strong     = strongRaw ? strongRaw[1].toUpperCase() : null;

    // xlit="agapē" transliteration
    const xlitMatch  = attrs.match(/xlit="([^"]*)"/);
    const translit   = xlitMatch?.[1] ?? null;

    result.push({ word, strong, transliteration: translit });
  }

  return result;
}
