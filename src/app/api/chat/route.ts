import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { chatWithAgape } from "@/lib/groq";
import type { ChatHistoryMessage } from "@/lib/groq";
import type { UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profileRow) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 400 });
  }

  const body = (await request.json()) as {
    message?: string;
    history?: ChatHistoryMessage[];
  };

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "Message vide" }, { status: 400 });
  }

  const userProfile: UserProfile = {
    first_name: profileRow.first_name as string,
    denomination: profileRow.denomination as string,
    spiritual_level: profileRow.spiritual_level as string,
    current_challenge: profileRow.current_challenge as string,
    anonymous_name: profileRow.anonymous_name as string | undefined,
  };

  const history = Array.isArray(body.history) ? body.history : [];

  try {
    const reply = await chatWithAgape(userProfile, history, message);

    await supabase.from("messages").insert({
      user_id: user.id,
      role: "user",
      content: message,
    });
    await supabase.from("messages").insert({
      user_id: user.id,
      role: "assistant",
      content: reply,
    });

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Impossible de contacter AGAPE pour le moment." },
      { status: 500 },
    );
  }
}
