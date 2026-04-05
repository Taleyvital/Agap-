import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { moderateCommunityPost } from "@/lib/groq";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await request.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Texte vide" }, { status: 400 });
  }

  const result = await moderateCommunityPost(text);
  if (!result.allowed) {
    return NextResponse.json(
      { allowed: false, reason: result.reason ?? "Refusé" },
      { status: 422 },
    );
  }

  return NextResponse.json({ allowed: true });
}
