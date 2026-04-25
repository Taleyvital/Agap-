import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json();
  const { title, artist_name, album, duration_seconds, audio_url, cover_url, lyrics, genre, language } = body;

  if (!title || !artist_name || !audio_url || !genre || !language) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const service = createSupabaseServiceClient();

  const { data: track, error } = await service
    .from("gospel_tracks")
    .insert({
      artist_id: user.id,
      title,
      artist_name,
      album: album || null,
      duration_seconds: duration_seconds || 0,
      audio_url,
      cover_url: cover_url || null,
      lyrics: lyrics || null,
      genre,
      language,
      status: "pending",
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify admin team via email (fire-and-forget)
  notifyAdminNewTrack(track.id, title, artist_name).catch(() => {});

  return NextResponse.json({ track }, { status: 201 });
}

async function notifyAdminNewTrack(trackId: string, title: string, artistName: string) {
  const adminEmail = process.env.ADMIN_EMAIL ?? "taleyvital00@gmail.com";
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      to: adminEmail,
      subject: `[AGAPE Gospel] Nouveau titre à valider : ${title}`,
      html: `<p>L'artiste <strong>${artistName}</strong> a soumis le titre <strong>${title}</strong> (ID: ${trackId}) pour validation.</p><p>Rendez-vous sur <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/gospel">/admin/gospel</a> pour approuver ou rejeter.</p>`,
    }),
  });
}
