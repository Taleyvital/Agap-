import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const appUrl = Deno.env.get("APP_URL") ?? "https://agape-v2.vercel.app";

Deno.serve(async () => {
  const supabase = createClient(supabaseUrl, serviceKey);

  // Get streaks of 3+ days that haven't sent a message today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: streaks } = await supabase
    .from("flames")
    .select("user1_id, user2_id, streak_count, last_exchange_at, user1:profiles!flames_user1_id_fkey(first_name), user2:profiles!flames_user2_id_fkey(first_name)")
    .gte("streak_count", 3)
    .lt("last_exchange_at", today.toISOString());

  if (!streaks?.length) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), { status: 200 });
  }

  let sent = 0;

  for (const flame of streaks) {
    const user1Name = (flame.user1 as { first_name?: string } | null)?.first_name ?? "ton partenaire";
    const user2Name = (flame.user2 as { first_name?: string } | null)?.first_name ?? "ton partenaire";

    // Notify both users
    for (const [userId, partnerName] of [
      [flame.user1_id, user2Name],
      [flame.user2_id, user1Name],
    ] as [string, string][]) {
      const res = await fetch(`${appUrl}/api/push/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-service-key": serviceKey,
        },
        body: JSON.stringify({
          user_id: userId,
          type: "streak",
          title: "🔥 Ta flamme s'éteint bientôt",
          body: `Ta flamme avec ${partnerName} s'éteint dans 4 heures`,
          url: "/messages",
        }),
      });
      if (res.ok) sent++;
    }
  }

  return new Response(JSON.stringify({ ok: true, sent }), { status: 200 });
});
