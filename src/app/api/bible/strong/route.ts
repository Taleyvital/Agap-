import { NextResponse } from "next/server";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase-server";
import { getStrongByWord } from "@/lib/strong";
import { awardXP } from "@/lib/xp";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json() as {
    word: string;
    verse_ref: string;
    verse_text: string;
    language: "greek" | "hebrew";
  };

  const { word, verse_ref, verse_text, language } = body;

  if (!word?.trim() || !verse_ref?.trim()) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const result = await getStrongByWord(word.trim(), verse_ref.trim(), verse_text ?? "", language ?? "greek");

  if (!result) {
    return NextResponse.json({ error: "Définition indisponible" }, { status: 503 });
  }

  // XP: award only on first exploration of this word for this user
  const service = createSupabaseServiceClient();
  const { error: insertError } = await service
    .from("user_strong_explored")
    .insert({ user_id: user.id, word: word.toLowerCase().trim() });

  if (!insertError) {
    await awardXP(user.id, "STRONG_WORD_EXPLORED");
  }

  return NextResponse.json({ result });
}
