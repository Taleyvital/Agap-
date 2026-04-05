import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
      // Remove amen (deletes all matches if duplicates got created)
      const { error } = await supabase
        .from("community_amens")
        .delete()
        .match({ post_id: postId, user_id: user.id });

      if (error) throw error;
      return NextResponse.json({ action: "removed" });
    } else {
      // Add amen
      const { error } = await supabase
        .from("community_amens")
        .insert({ post_id: postId, user_id: user.id });

      if (error) throw error;
      return NextResponse.json({ action: "added" });
    }
  } catch (error: any) {
    console.error("Amen error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
