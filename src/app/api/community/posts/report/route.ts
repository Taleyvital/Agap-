import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = (await request.json()) as { postId?: string };
    if (!body.postId) {
      return NextResponse.json({ error: "Post ID manquant" }, { status: 400 });
    }

    await supabase.from("post_reports").insert({
      post_id: body.postId,
      reporter_id: user.id,
    }).then(() => null);

    return NextResponse.json({ reported: true });
  } catch {
    return NextResponse.json({ reported: true });
  }
}
