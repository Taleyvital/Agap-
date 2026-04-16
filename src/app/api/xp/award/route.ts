import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { awardXP } from "@/lib/xp";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await request.json()) as { actionType?: string };

  if (!body.actionType) {
    return NextResponse.json({ error: "actionType requis" }, { status: 400 });
  }

  const result = await awardXP(user.id, body.actionType);

  if (!result) {
    return NextResponse.json({ ok: false, skipped: true });
  }

  return NextResponse.json({ ok: true, xp: result });
}
