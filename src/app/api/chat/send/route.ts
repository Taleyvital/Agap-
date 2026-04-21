import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await request.json()) as { receiverId?: string; content?: string };

  if (!body.receiverId || !body.content?.trim()) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  const { data: msg, error } = await supabase
    .from("chat_messages")
    .insert({
      sender_id: user.id,
      receiver_id: body.receiverId,
      content: body.content.trim().slice(0, 500),
    })
    .select("id, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, messageId: msg.id, createdAt: msg.created_at });
}
