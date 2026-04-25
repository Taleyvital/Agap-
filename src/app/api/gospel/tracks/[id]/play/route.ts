import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const service = createSupabaseServiceClient();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Insert unique play — PK (user_id, track_id, played_date) silently deduplicates
  const { error: playError } = await service
    .from("gospel_plays")
    .insert({ user_id: user.id, track_id: params.id, played_date: today })
    .select()
    .maybeSingle();

  // Only increment raw play_count (used for "En ce moment" ranking) on first play of the day
  if (!playError) {
    await service.rpc("increment_gospel_play_count", { track_id: params.id });
  }

  return NextResponse.json({ ok: true });
}
