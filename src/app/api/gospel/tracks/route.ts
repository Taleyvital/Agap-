import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genre  = searchParams.get("genre");
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0", 10);

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  let query = createSupabaseServiceClient()
    .from("gospel_tracks")
    .select("*")
    .eq("status", "approved")
    .order("published_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (genre) query = query.eq("genre", genre);

  const { data: tracks, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch likes for current user
  const trackIds = (tracks ?? []).map((t) => t.id);
  const { data: likes } = await createSupabaseServiceClient()
    .from("gospel_likes")
    .select("track_id")
    .eq("user_id", user.id)
    .in("track_id", trackIds);

  const likedSet = new Set((likes ?? []).map((l: { track_id: string }) => l.track_id));

  const tracksWithLikes = (tracks ?? []).map((t) => ({
    ...t,
    is_liked: likedSet.has(t.id),
  }));

  return NextResponse.json({ tracks: tracksWithLikes });
}
