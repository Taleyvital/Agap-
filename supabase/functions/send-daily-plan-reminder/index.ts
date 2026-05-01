import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") ?? "https://agape-v2.vercel.app";

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get users with an active reading plan progress
  const { data: progressRows } = await supabase
    .from("user_plan_progress")
    .select("user_id, plan_id, current_day, reading_plans(title)")
    .is("completed_at", null);

  if (!progressRows?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
  }

  let sent = 0;
  for (const row of progressRows) {
    const plan = Array.isArray(row.reading_plans)
      ? row.reading_plans[0]
      : row.reading_plans;

    const res = await fetch(`${appUrl}/api/push/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-service-key": serviceKey,
      },
      body: JSON.stringify({
        user_id: row.user_id,
        type: "plan",
        title: "📖 Ton parcours t'attend",
        body: `Jour ${row.current_day} — ${(plan as { title: string } | null)?.title ?? "Plan de lecture"}`,
        url: `/reading-plan/${row.plan_id}/day`,
      }),
    });

    if (res.ok) sent++;
  }

  return new Response(JSON.stringify({ ok: true, sent }), { status: 200 });
});
