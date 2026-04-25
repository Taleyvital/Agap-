import type { WordToken } from "@/app/api/bible/strong/verse/route";
import type { StrongDefinitionRow } from "@/app/api/bible/strong/definition/route";
import type { VerseOccurrence } from "@/app/api/bible/strong/verses/route";

export type { WordToken, StrongDefinitionRow, VerseOccurrence };

export async function getVerseInterlinear(
  bookId: number,
  chapter: number,
  verse: number,
): Promise<WordToken[]> {
  const res = await fetch(
    `/api/bible/strong/verse?book=${bookId}&chapter=${chapter}&verse=${verse}`,
  );
  if (!res.ok) return [];
  const data = await res.json() as { words?: WordToken[] };
  return data.words ?? [];
}

export async function getStrongDefinition(
  number: string,
): Promise<StrongDefinitionRow | null> {
  const res = await fetch(`/api/bible/strong/definition?number=${encodeURIComponent(number)}`);
  if (!res.ok) return null;
  const data = await res.json() as { definition?: StrongDefinitionRow };
  return data.definition ?? null;
}

export async function getStrongVerses(
  number: string,
): Promise<{ verses: VerseOccurrence[]; total: number }> {
  const res = await fetch(`/api/bible/strong/verses?number=${encodeURIComponent(number)}`);
  if (!res.ok) return { verses: [], total: 0 };
  return res.json() as Promise<{ verses: VerseOccurrence[]; total: number }>;
}
