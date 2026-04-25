import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { lyrics } = body;

  const service = createSupabaseServiceClient();

  // Verify ownership
  const { data: track } = await service
    .from("gospel_tracks")
    .select("artist_id, status")
    .eq("id", params.id)
    .maybeSingle();

  if (!track || track.artist_id !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const updates: Record<string, unknown> = { lyrics };
  // If track was approved, re-submit for review
  if (track.status === "approved") {
    updates.status = "pending";
    updates.rejection_reason = null;
  }

  const { error } = await service
    .from("gospel_tracks")
    .update(updates)
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, resubmitted: track.status === "approved" });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const service = createSupabaseServiceClient();

  const { data: track } = await service
    .from("gospel_tracks")
    .select("artist_id, audio_url, cover_url")
    .eq("id", params.id)
    .maybeSingle();

  if (!track || track.artist_id !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Delete storage files
  if (track.audio_url && !track.audio_url.startsWith("http")) {
    await service.storage.from("gospel-audio").remove([track.audio_url]);
  }
  if (track.cover_url && !track.cover_url.startsWith("http")) {
    await service.storage.from("gospel-covers").remove([track.cover_url]);
  }

  const { error } = await service.from("gospel_tracks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const service = createSupabaseServiceClient();

  const { data: track, error } = await service
    .from("gospel_tracks")
    .select("*")
    .eq("id", params.id)
    .or(`status.eq.approved,artist_id.eq.${user.id}`)
    .maybeSingle();

  if (error || !track) {
    return NextResponse.json({ error: "Track introuvable" }, { status: 404 });
  }

  // Generate signed URL for private audio (1h expiry)
  let signedAudioUrl = track.audio_url;
  if (track.audio_url && !track.audio_url.startsWith("http")) {
    const { data: signed } = await service.storage
      .from("gospel-audio")
      .createSignedUrl(track.audio_url, 3600);
    if (signed?.signedUrl) signedAudioUrl = signed.signedUrl;
  }

  // Check if current user liked this track
  const { data: like } = await service
    .from("gospel_likes")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("track_id", track.id)
    .maybeSingle();

  return NextResponse.json({
    track: { ...track, audio_url: signedAudioUrl, is_liked: !!like },
  });
}
