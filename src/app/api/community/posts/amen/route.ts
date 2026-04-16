import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { awardXP } from "@/lib/xp";

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = (await request.json()) as { postId?: string; action?: "add" | "remove" };
    const postId = body.postId;
    const action = body.action || "add";

    if (!postId) {
      return NextResponse.json({ error: "Post ID manquant" }, { status: 400 });
    }

    if (action === "remove") {
      const { error } = await supabase
        .from("community_amens")
        .delete()
        .match({ post_id: postId, user_id: user.id });

      if (error) throw error;
      return NextResponse.json({ action: "removed" });
    } else {
      const { error } = await supabase
        .from("community_amens")
        .insert({ post_id: postId, user_id: user.id });

      if (error) throw error;

      // Award XP to the post owner (not the person giving the amen)
      const serviceClient = createSupabaseServiceClient();
      const { data: post } = await serviceClient
        .from("community_posts")
        .select("user_id")
        .eq("id", postId)
        .maybeSingle();

      if (post?.user_id && post.user_id !== user.id) {
        await awardXP(post.user_id, "COMMUNITY_AMEN_RECEIVED");
      }

      return NextResponse.json({ action: "added" });
    }
  } catch (error: unknown) {
    console.error("Amen error:", error);
    const errorMessage = error instanceof Error ? error.message : "Une erreur est survenue";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
