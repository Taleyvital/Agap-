/**
 * Server-side API.Bible proxy.
 *
 * Activated automatically when BIBLE_API_KEY is set in .env.local and the key
 * is valid (account verified on scripture.api.bible).
 *
 * Endpoints:
 *   GET /api/bible?action=bibles              — list available French Bibles
 *   GET /api/bible?action=books&bibleId=XXX   — list books for a Bible
 *   GET /api/bible?action=chapter&bibleId=XXX&bookId=XXX&chapter=N
 *
 * To switch the Bible reader to use this proxy instead of getBible.net, update
 * getChapter() in src/lib/bible.ts to call /api/bible?action=chapter&... and
 * pass the correct API.Bible bibleId for each translation slug.
 *
 * Known French API.Bible IDs (verify once your key is activated):
 *   Run: GET /api/bible?action=bibles  to retrieve the current list.
 */

import { NextRequest, NextResponse } from "next/server";

const APIBIBLE_BASE = "https://api.scripture.api.bible/v1";
const API_KEY = process.env.BIBLE_API_KEY;

function apiBibleHeaders() {
  return { "api-key": API_KEY ?? "" };
}

export async function GET(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: "BIBLE_API_KEY is not configured. Using getBible.net instead." },
      { status: 503 },
    );
  }

  const { searchParams } = req.nextUrl;
  const action = searchParams.get("action");

  try {
    if (action === "bibles") {
      const res = await fetch(`${APIBIBLE_BASE}/bibles?language=fra`, {
        headers: apiBibleHeaders(),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: "API.Bible returned an error", status: res.status },
          { status: res.status },
        );
      }
      const data = await res.json() as { data: { id: string; name: string; abbreviation: string }[] };
      return NextResponse.json(
        data.data.map((b) => ({ id: b.id, name: b.name, abbreviation: b.abbreviation })),
      );
    }

    if (action === "books") {
      const bibleId = searchParams.get("bibleId");
      if (!bibleId) return NextResponse.json({ error: "Missing bibleId" }, { status: 400 });
      const res = await fetch(`${APIBIBLE_BASE}/bibles/${bibleId}/books`, {
        headers: apiBibleHeaders(),
      });
      if (!res.ok) return NextResponse.json({ error: "API.Bible error" }, { status: res.status });
      const data = await res.json() as { data: { id: string; name: string; nameLong: string }[] };
      return NextResponse.json(data.data);
    }

    if (action === "chapter") {
      const bibleId = searchParams.get("bibleId");
      const bookId = searchParams.get("bookId");
      const chapter = searchParams.get("chapter");
      if (!bibleId || !bookId || !chapter) {
        return NextResponse.json({ error: "Missing bibleId, bookId, or chapter" }, { status: 400 });
      }
      const chapterId = `${bookId}.${chapter}`;
      const res = await fetch(
        `${APIBIBLE_BASE}/bibles/${bibleId}/chapters/${chapterId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`,
        { headers: apiBibleHeaders() },
      );
      if (!res.ok) return NextResponse.json({ error: "API.Bible error" }, { status: res.status });
      const data = await res.json() as { data: { content: string; verseCount: number } };
      return NextResponse.json(data.data);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
