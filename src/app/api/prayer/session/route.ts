import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await request.json()) as {
    duration_minutes?: number;
    ambiance?: string;
    completed?: boolean;
  };

  const { error } = await supabase.from("prayer_sessions").insert({
    user_id: user.id,
    duration_minutes: body.duration_minutes ?? 0,
    ambiance: body.ambiance ?? null,
    completed: body.completed ?? false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
