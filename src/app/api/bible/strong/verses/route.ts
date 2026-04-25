import { NextResponse } from "next/server";

export interface VerseOccurrence {
  reference: string;
  text: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const number = searchParams.get("number")?.toUpperCase().trim();

  if (!number || !/^[GH]\d+$/.test(number)) {
    return NextResponse.json({ verses: [], total: 0 });
  }

  const version = number.startsWith("G") ? "SBLG" : "WLC";

  try {
    const url =
      `https://www.stepbible.org/api/v2/search` +
      `?query=strong:${number}&version=${version}&pageNumber=0&pageSize=10`;

    const res = await fetch(url, {
      headers: { "User-Agent": "AGAPE-Bible-App/1.0" },
      next: { revalidate: 86_400 * 7 },
    });

    if (!res.ok) throw new Error(`STEP ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    return NextResponse.json(parseSearchResults(data));
  } catch {
    return NextResponse.json({ verses: [], total: 0 });
  }
}

function parseSearchResults(data: Record<string, unknown>): {
  verses: VerseOccurrence[];
  total: number;
} {
  const total = (data.total as number) ?? (data.totalResults as number) ?? 0;
  const results = (data.results as Array<Record<string, unknown>>) ?? [];

  const verses: VerseOccurrence[] = results.map((r) => ({
    reference: (r.verseRef as string) ?? (r.reference as string) ?? "",
    text: ((r.preview as string) ?? (r.text as string) ?? "")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .trim(),
  }));

  return { verses, total };
}
