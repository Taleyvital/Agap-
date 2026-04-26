import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { generateBibleStory, generateStoryQuote } from "@/lib/stories";
import { getChapter } from "@/lib/bible";
import { awardXP } from "@/lib/xp";

function stripHtml(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
}

async function getSignedAudioUrl(path: string): Promise<string | null> {
  const service = createSupabaseServiceClient();
  const { data } = await service.storage
    .from("bible-stories-audio")
    .createSignedUrl(path, 7200);
  return data?.signedUrl ?? null;
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await request.json()) as {
    passage_ref?: string;
    character?: string;
    language?: string;
    book_id?: number;
    chapter_num?: number;
  };

  const { passage_ref, character, language = "fr", book_id, chapter_num } = body;

  if (!passage_ref?.trim() || !character?.trim()) {
    return NextResponse.json(
      { error: "passage_ref et character sont requis" },
      { status: 400 },
    );
  }

  const service = createSupabaseServiceClient();

  // ── 1. Check cache ───────────────────────────────────────────
  const { data: cached } = await service
    .from("bible_stories")
    .select("*")
    .eq("passage_ref", passage_ref)
    .eq("language", language)
    .maybeSingle();

  if (cached) {
    await service
      .from("bible_stories")
      .update({ play_count: cached.play_count + 1 })
      .eq("id", cached.id);

    let audioUrl: string | null = null;
    if (cached.audio_url) {
      audioUrl = await getSignedAudioUrl(cached.audio_url);
    }

    // Record history (upsert — preserve completion flag)
    await service
      .from("user_stories_history")
      .upsert({ user_id: user.id, story_id: cached.id, listened_at: new Date().toISOString() });

    return NextResponse.json({ story: { ...cached, audio_url: audioUrl }, cached: true });
  }

  // ── 2. Fetch verse text ──────────────────────────────────────
  let verseText = passage_ref;
  if (book_id && chapter_num) {
    try {
      const verses = await getChapter("FRLSG", book_id, chapter_num);
      verseText = verses
        .map((v) => stripHtml(v.text))
        .join(" ")
        .slice(0, 2000);
    } catch {
      // fall through — use passage_ref as context
    }
  }

  // ── 3. Generate narrative ────────────────────────────────────
  let narrativeText: string;
  try {
    narrativeText = await generateBibleStory(passage_ref, character, verseText, language);
  } catch {
    return NextResponse.json(
      { error: "Impossible de générer l'histoire pour le moment." },
      { status: 500 },
    );
  }

  // ── 4. Extract quote (best-effort) ──────────────────────────
  const quote = await generateStoryQuote(narrativeText).catch(() => "");

  // ── 5. Persist ──────────────────────────────────────────────
  const title = `${character} — ${passage_ref}`;
  const { data: story, error: insertErr } = await service
    .from("bible_stories")
    .insert({
      passage_ref,
      character_name: character,
      title,
      narrative_text: narrativeText,
      quote: quote || null,
      language,
      play_count: 1,
    })
    .select()
    .single();

  if (insertErr || !story) {
    return NextResponse.json(
      { error: "Erreur lors de la sauvegarde de l'histoire." },
      { status: 500 },
    );
  }

  // ── 6. History + XP ─────────────────────────────────────────
  await service
    .from("user_stories_history")
    .insert({ user_id: user.id, story_id: story.id });

  await awardXP(user.id, "STORY_GENERATED");

  return NextResponse.json({ story: { ...story, audio_url: null }, cached: false });
}
