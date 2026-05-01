import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { moderateCommunityPost } from "@/lib/groq";
import { awardXP } from "@/lib/xp";
import { sendPushNotification } from "@/lib/push";

// GET - Récupérer les posts de l'utilisateur connecté
export async function GET(request: Request) {
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userOnly = searchParams.get("user") === "me";

  const serviceClient = createSupabaseServiceClient();

  let query = serviceClient
    .from("community_posts")
    .select("id, content, category, created_at, image_url, anonymous_name, community_amens(user_id)")
    .order("created_at", { ascending: false });

  if (userOnly) {
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data });
}

// DELETE - Supprimer un post
export async function DELETE(request: Request) {
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get("id");

  if (!postId) {
    return NextResponse.json({ error: "ID du post requis" }, { status: 400 });
  }

  const serviceClient = createSupabaseServiceClient();

  // Vérifier que le post appartient à l'utilisateur
  const { data: post } = await serviceClient
    .from("community_posts")
    .select("user_id")
    .eq("id", postId)
    .maybeSingle();

  if (!post) {
    return NextResponse.json({ error: "Post non trouvé" }, { status: 404 });
  }

  if (post.user_id !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { error } = await serviceClient
    .from("community_posts")
    .delete()
    .eq("id", postId);

  if (error) {
    console.error("Error deleting post:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: Request) {
  // Use regular client for auth check
  const authClient = createSupabaseServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await request.json()) as {
    content?: string;
    category?: string;
    is_urgent?: boolean;
    imageUrl?: string;
    repostOf?: string;
  };

  const content = body.content?.trim() ?? "";
  if (!content && !body.imageUrl && !body.repostOf) {
    return NextResponse.json({ error: "Contenu vide" }, { status: 400 });
  }

  // Only moderate if there is text content
  if (content) {
    const mod = await moderateCommunityPost(content);
    if (!mod.allowed) {
      return NextResponse.json(
        { error: mod.reason ?? "Publication refusée" },
        { status: 422 },
      );
    }
  }

  // Use service role client to bypass RLS
  const serviceClient = createSupabaseServiceClient();

  const { data: profile } = await serviceClient
    .from("profiles")
    .select("first_name, anonymous_name")
    .eq("id", user.id)
    .maybeSingle();

  const authorName = profile?.anonymous_name || profile?.first_name || "Fidèle";

  const { data, error } = await serviceClient
    .from("community_posts")
    .insert({
      user_id: user.id,
      anonymous_name: authorName,
      category: body.category ?? "reflections",
      content,
      image_url: body.imageUrl || null,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      repost_of: body.repostOf ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const xp = await awardXP(user.id, "COMMUNITY_POST_PUBLISHED");

  // Notify original author when their post is reposted
  if (body.repostOf) {
    const { data: originalPost } = await serviceClient
      .from("community_posts")
      .select("user_id")
      .eq("id", body.repostOf)
      .maybeSingle();
    if (originalPost?.user_id && originalPost.user_id !== user.id) {
      sendPushNotification({
        user_id: originalPost.user_id,
        type: "amen",
        title: "🔁 Quelqu'un a republié ta publication",
        body: `${authorName} a partagé ton message avec la communauté`,
        url: "/community",
      }).catch(() => {});
    }
  }

  return NextResponse.json({ id: data.id, xp });
}
