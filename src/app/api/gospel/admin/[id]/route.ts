import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { awardXP } from "@/lib/xp";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const service = createSupabaseServiceClient();

  // Verify admin
  const { data: profile } = await service
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { action, rejection_reason } = await request.json();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  }

  const updates =
    action === "approve"
      ? { status: "approved", published_at: new Date().toISOString() }
      : { status: "rejected", rejection_reason: rejection_reason ?? "" };

  const { data: track, error } = await service
    .from("gospel_tracks")
    .update(updates)
    .eq("id", params.id)
    .select("*, artist_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (action === "approve" && track.artist_id) {
    await awardXP(track.artist_id, "GOSPEL_TRACK_UPLOADED");
    notifyArtist(track.artist_id, track.title, "approved", null).catch(() => {});
  } else if (action === "reject" && track.artist_id) {
    notifyArtist(track.artist_id, track.title, "rejected", rejection_reason ?? null).catch(() => {});
  }

  return NextResponse.json({ track });
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  // Unused — kept for REST completeness
  return NextResponse.json({ id: params.id });
}

async function notifyArtist(
  artistId: string,
  title: string,
  status: "approved" | "rejected",
  reason: string | null,
) {
  const service = createSupabaseServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("first_name")
    .eq("id", artistId)
    .maybeSingle();

  const artistName = profile?.first_name ?? "Artiste";
  const subject =
    status === "approved"
      ? `[AGAPE Gospel] Votre titre "${title}" est approuvé !`
      : `[AGAPE Gospel] Votre titre "${title}" a été rejeté`;

  const html =
    status === "approved"
      ? `<p>Bonjour ${artistName}, votre titre <strong>${title}</strong> a été approuvé et est maintenant disponible sur AGAPE Gospel. Merci pour votre contribution !</p>`
      : `<p>Bonjour ${artistName}, votre titre <strong>${title}</strong> a été rejeté.${reason ? ` Raison : ${reason}` : ""} N'hésitez pas à soumettre une nouvelle version.</p>`;

  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ to: artistId, subject, html }),
  });
}
