import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await request.json()) as {
    story_id?: string;
    narrative_text?: string;
  };

  const { story_id, narrative_text } = body;
  if (!story_id || !narrative_text) {
    return NextResponse.json({ error: "story_id et narrative_text requis" }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "TTS non configuré" }, { status: 503 });
  }

  // ── 1. OpenAI TTS ───────────────────────────────────────────
  const ttsRes = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      voice: "onyx",
      input: narrative_text.slice(0, 4096),
      speed: 0.9,
    }),
  });

  if (!ttsRes.ok) {
    const msg = await ttsRes.text().catch(() => "TTS error");
    console.error("OpenAI TTS error:", msg);
    return NextResponse.json({ error: "Génération audio échouée" }, { status: 502 });
  }

  const audioBuffer = await ttsRes.arrayBuffer();
  const filename = `${story_id}.mp3`;

  // ── 2. Upload to Supabase Storage ───────────────────────────
  const service = createSupabaseServiceClient();

  // Ensure bucket exists (ignore error if already created)
  await service.storage.createBucket("bible-stories-audio", {
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
  }).catch(() => {});

  const { error: uploadErr } = await service.storage
    .from("bible-stories-audio")
    .upload(filename, audioBuffer, { contentType: "audio/mpeg", upsert: true });

  if (uploadErr) {
    console.error("Storage upload error:", uploadErr);
    return NextResponse.json({ error: "Upload audio échoué" }, { status: 500 });
  }

  // ── 3. Estimate duration ─────────────────────────────────────
  // ~135 wpm at 0.9x speed
  const wordCount = narrative_text.split(/\s+/).length;
  const durationSeconds = Math.ceil((wordCount / 135) * 60);

  // ── 4. Update story record ───────────────────────────────────
  await service
    .from("bible_stories")
    .update({ audio_url: filename, duration_seconds: durationSeconds })
    .eq("id", story_id);

  // ── 5. Generate fresh signed URL (2 hours) ──────────────────
  const { data: signed } = await service.storage
    .from("bible-stories-audio")
    .createSignedUrl(filename, 7200);

  if (!signed?.signedUrl) {
    return NextResponse.json({ error: "Impossible de générer l'URL signée" }, { status: 500 });
  }

  return NextResponse.json({ audioUrl: signed.signedUrl, durationSeconds });
}
