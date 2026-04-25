import { NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

const CACHE_DAYS = 30;

export interface StrongDefinitionRow {
  strong_number: string;
  language: "greek" | "hebrew";
  original_word: string;
  transliteration: string;
  pronunciation: string;
  definition: string;
  etymology: string;
  occurrence_count: number;
  cached_at: string;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const number = searchParams.get("number")?.toUpperCase().trim();

  if (!number || !/^[GH]\d+$/.test(number)) {
    return NextResponse.json({ error: "Numéro Strong invalide" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  // 1. Check Supabase cache
  const { data: cached } = await supabase
    .from("strong_cache")
    .select("*")
    .eq("strong_number", number)
    .maybeSingle();

  if (cached) {
    const ageMs = Date.now() - new Date(cached.cached_at).getTime();
    if (ageMs < CACHE_DAYS * 86_400_000) {
      return NextResponse.json({ definition: cached });
    }
  }

  // 2. Fetch from STEP Bible API
  const lang = number.startsWith("G") ? "greek" : "hebrew";
  try {
    const url = `https://www.stepbible.org/api/v2/lexicon/${lang}/${number}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AGAPE-Bible-App/1.0" },
      next: { revalidate: CACHE_DAYS * 86_400 },
    });

    if (!res.ok) throw new Error(`STEP ${res.status}`);

    const data = await res.json() as Record<string, unknown>;
    const row = parseStepLexicon(data, number, lang as "greek" | "hebrew");

    // 3. Upsert into cache
    await supabase.from("strong_cache").upsert({
      ...row,
      cached_at: new Date().toISOString(),
    });

    return NextResponse.json({ definition: row });
  } catch {
    // Return cached data even if stale rather than failing
    if (cached) return NextResponse.json({ definition: cached });
    return NextResponse.json({ error: "Définition indisponible" }, { status: 503 });
  }
}

function parseStepLexicon(
  data: Record<string, unknown>,
  number: string,
  language: "greek" | "hebrew",
): StrongDefinitionRow {
  // STEP Bible v2 lexicon response structure
  const def = (data.definition as Record<string, unknown>) ?? {};
  const form =
    (def.matchingForm as Record<string, unknown>) ??
    (data.matchingForm as Record<string, unknown>) ??
    {};

  const shortDef =
    (def.shortDefinition as string) ??
    (data.shortDefinition as string) ??
    (def.definition as string) ??
    "";

  // Strip HTML tags from definition text
  const cleanDef = shortDef.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").trim();

  const etymology =
    ((def.origin as string) ?? (data.origin as string) ?? "")
      .replace(/<[^>]+>/g, "")
      .trim();

  return {
    strong_number: number,
    language,
    original_word:
      (form.accentedUnicode as string) ??
      (form.unicode as string) ??
      (data.lexicalForm as string) ??
      "",
    transliteration:
      (form.transliteration as string) ??
      (data.transliteration as string) ??
      "",
    pronunciation:
      (form.pronunciation as string) ??
      (def.pronunciation as string) ??
      "",
    definition: cleanDef,
    etymology,
    occurrence_count: (data.occurrenceCount as number) ?? 0,
    cached_at: new Date().toISOString(),
  };
}
