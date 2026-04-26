import Groq from "groq-sdk";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CACHE_DAYS = 30;

export interface StrongRelatedWord {
  strong_number: string;
  word: string;
  meaning: string;
}

export interface StrongResult {
  strong_number: string | null;
  original_word: string | null;
  transliteration: string | null;
  pronunciation: string | null;
  part_of_speech: string | null;
  definition_short: string | null;
  definition_full: string | null;
  etymology: string | null;
  in_this_verse: string | null;
  spiritual_application: string | null;
  related_words: StrongRelatedWord[];
  occurrence_count: number | null;
  key_verses: string[];
}

export async function getStrongByWord(
  word: string,
  verseRef: string,
  verseText: string,
  language: "greek" | "hebrew",
): Promise<StrongResult | null> {
  const supabase = createSupabaseServiceClient();
  const wordKey = word.toLowerCase().trim();

  // 1. Check cache
  const { data: cached } = await supabase
    .from("strong_cache")
    .select("*")
    .eq("word", wordKey)
    .eq("verse_ref", verseRef)
    .maybeSingle();

  if (cached) {
    const ageMs = Date.now() - new Date(cached.cached_at).getTime();
    if (ageMs < CACHE_DAYS * 86_400_000) {
      return {
        strong_number: cached.strong_number,
        original_word: cached.original_word,
        transliteration: cached.transliteration,
        pronunciation: cached.pronunciation,
        part_of_speech: cached.part_of_speech,
        definition_short: cached.definition_short,
        definition_full: cached.definition_full,
        etymology: cached.etymology,
        in_this_verse: cached.in_this_verse,
        spiritual_application: cached.spiritual_application,
        related_words: (cached.related_words as StrongRelatedWord[]) ?? [],
        occurrence_count: cached.occurrence_count,
        key_verses: cached.key_verses ?? [],
      };
    }
  }

  // 2. Call Groq
  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `Tu es un expert en langues bibliques (grec koinè et hébreu biblique) et en théologie chrétienne. Réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après. Si tu n'es pas certain d'une information, indique null plutôt que d'inventer.`,
        },
        {
          role: "user",
          content: `Donne-moi les informations Strong pour le mot "${word}" dans le contexte du verset "${verseRef}" : "${verseText}". Langue : ${language}.

Réponds avec ce JSON exact :
{
  "strong_number": "G26",
  "original_word": "ἀγάπη",
  "transliteration": "agapé",
  "pronunciation": "ag-ah-pay",
  "part_of_speech": "nom féminin",
  "definition_short": "amour inconditionnel divin (max 20 mots)",
  "definition_full": "définition complète théologique en français (100-150 mots)",
  "etymology": "origine et racine du mot (50 mots max)",
  "in_this_verse": "explication spécifique du mot dans ce verset précis (80 mots)",
  "spiritual_application": "application pratique pour la vie spirituelle (60 mots)",
  "related_words": [
    { "strong_number": "G25", "word": "ἀγαπάω", "meaning": "aimer" }
  ],
  "occurrence_count": 116,
  "key_verses": ["Jean 3:16", "1 Corinthiens 13:4", "1 Jean 4:8"]
}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content ?? "";
    // Strip any markdown fences if model adds them
    const cleaned = raw.replace(/```(?:json)?\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as StrongResult;

    const result: StrongResult = {
      strong_number: parsed.strong_number ?? null,
      original_word: parsed.original_word ?? null,
      transliteration: parsed.transliteration ?? null,
      pronunciation: parsed.pronunciation ?? null,
      part_of_speech: parsed.part_of_speech ?? null,
      definition_short: parsed.definition_short ?? null,
      definition_full: parsed.definition_full ?? null,
      etymology: parsed.etymology ?? null,
      in_this_verse: parsed.in_this_verse ?? null,
      spiritual_application: parsed.spiritual_application ?? null,
      related_words: Array.isArray(parsed.related_words) ? parsed.related_words : [],
      occurrence_count: parsed.occurrence_count ?? null,
      key_verses: Array.isArray(parsed.key_verses) ? parsed.key_verses : [],
    };

    // 3. Upsert into cache
    await supabase.from("strong_cache").upsert({
      word: wordKey,
      verse_ref: verseRef,
      language,
      ...result,
      cached_at: new Date().toISOString(),
    });

    return result;
  } catch {
    // Return stale cache rather than nothing
    if (cached) {
      return {
        strong_number: cached.strong_number,
        original_word: cached.original_word,
        transliteration: cached.transliteration,
        pronunciation: cached.pronunciation,
        part_of_speech: cached.part_of_speech,
        definition_short: cached.definition_short,
        definition_full: cached.definition_full,
        etymology: cached.etymology,
        in_this_verse: cached.in_this_verse,
        spiritual_application: cached.spiritual_application,
        related_words: (cached.related_words as StrongRelatedWord[]) ?? [],
        occurrence_count: cached.occurrence_count,
        key_verses: cached.key_verses ?? [],
      };
    }
    return null;
  }
}
