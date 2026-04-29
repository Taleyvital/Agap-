import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const authClient = createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("postId");
  if (!postId) return NextResponse.json({ error: "postId requis" }, { status: 400 });

  const serviceClient = createSupabaseServiceClient();
  const { data, error } = await serviceClient
    .from("community_comments")
    .select("id, content, created_at, anonymous_name, user_id")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(request: Request) {
  const authClient = createSupabaseServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await request.json()) as { postId?: string; content?: string };
  const content = body.content?.trim();
  if (!body.postId || !content) {
    return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
  }
  if (content.length > 500) {
    return NextResponse.json({ error: "Commentaire trop long (max 500 caractères)" }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceClient();

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("first_name, anonymous_name")
    .eq("id", user.id)
    .maybeSingle();

  const authorName = profile?.anonymous_name ?? profile?.first_name ?? "Fidèle";

  const { data, error } = await serviceClient
    .from("community_comments")
    .insert({ post_id: body.postId, user_id: user.id, content, anonymous_name: authorName })
    .select("id, content, created_at, anonymous_name, user_id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}
