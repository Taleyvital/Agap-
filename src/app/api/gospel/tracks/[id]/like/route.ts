import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { awardXP } from "@/lib/xp";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const service = createSupabaseServiceClient();

  // Toggle: try insert, if conflict — delete
  const { error: insertError } = await service
    .from("gospel_likes")
    .insert({ user_id: user.id, track_id: params.id });

  if (insertError?.code === "23505") {
    // Already liked — unlike
    await service
      .from("gospel_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("track_id", params.id);
    return NextResponse.json({ liked: false });
  }

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await awardXP(user.id, "GOSPEL_TRACK_LIKED");
  return NextResponse.json({ liked: true });
}
