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

  const body = (await request.json()) as {
    content?: string;
    category?: string;
    is_urgent?: boolean;
    imageUrl?: string;
  };

  const content = body.content?.trim();
  if (!content && !body.imageUrl) {
    return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
  }

  // We only strictly moderate if there is text content
  if (content) {
    const mod = await moderateCommunityPost(content);
    if (!mod.allowed) {
      return NextResponse.json(
        { error: mod.reason ?? "Publication refusée" },
        { status: 422 },
      );
    }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, anonymous_name")
    .eq("id", user.id)
    .maybeSingle();

  const authorName = profile?.anonymous_name || profile?.first_name || "Fidèle";

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id,
      anonymous_name: authorName,
      category: body.category ?? "reflections",
      content,
      image_url: body.imageUrl,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
