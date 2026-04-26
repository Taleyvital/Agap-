import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const service = createSupabaseServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const { data: tracks, error } = await service
    .from("gospel_tracks")
    .select("*")
    .eq("status", status)
    .order("submitted_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Générer les URLs audio signées pour tous les tracks (1h)
  const tracksWithAudio = await Promise.all(
    (tracks ?? []).map(async (track) => {
      let audioUrl = track.audio_url as string | null;
      if (audioUrl && !audioUrl.startsWith("http")) {
        const { data: signed } = await service.storage
          .from("gospel-audio")
          .createSignedUrl(audioUrl, 3600);
        if (signed?.signedUrl) audioUrl = signed.signedUrl;
      }
      return { ...track, audio_url: audioUrl };
    })
  );

  return NextResponse.json({ tracks: tracksWithAudio });
}
