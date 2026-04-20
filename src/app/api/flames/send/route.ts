import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { awardXP } from "@/lib/xp";
import { normalizeUserPair } from "@/lib/flames";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = (await request.json()) as {
    receiverId?: string;
    verseRef?: string;
    verseText?: string;
    message?: string;
  };

  if (!body.receiverId || !body.verseRef || !body.verseText) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });
  }

  // Insert message
  const { data: msg, error: msgErr } = await supabase
    .from("verse_messages")
    .insert({
      sender_id: user.id,
      receiver_id: body.receiverId,
      verse_ref: body.verseRef,
      verse_text: body.verseText,
      message: body.message ?? null,
    })
    .select("id")
    .single();

  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 });

  // ── Streak logic ──────────────────────────────────────────────────────────
  // Rules:
  //   - streak_count = number of days where BOTH users sent at least 1 verse
  //   - The streak increments only when the 2nd person of a pair completes a day
  //   - If a full day passes without both sending → streak resets to 0
  // ─────────────────────────────────────────────────────────────────────────

  const [userA, userB] = normalizeUserPair(user.id, body.receiverId);
  const isUserA = user.id === userA;
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  const { data: streak } = await supabase
    .from("verse_streaks")
    .select("*")
    .eq("user_a", userA)
    .eq("user_b", userB)
    .maybeSingle();

  let newStreakCount = 0;
  let bonusXP: string | null = null;

  if (!streak) {
    // First message ever between these two
    newStreakCount = 0;
    await supabase.from("verse_streaks").insert({
      user_a: userA,
      user_b: userB,
      streak_count: 0,
      last_exchange_date: today,
      user_a_sent_today: isUserA,
      user_b_sent_today: !isUserA,
    });
  } else {
    const lastDate = streak.last_exchange_date as string;
    const aSent = streak.user_a_sent_today as boolean;
    const bSent = streak.user_b_sent_today as boolean;
    const prevStreak = streak.streak_count as number;

    if (lastDate === today) {
      // Same day — mark sender, check if this completes the pair
      const newA = isUserA ? true : aSent;
      const newB = !isUserA ? true : bSent;
      const wasComplete = aSent && bSent;
      const nowComplete = newA && newB;

      if (nowComplete && !wasComplete) {
        // 2nd person just sent → complete day → increment streak
        newStreakCount = prevStreak + 1;
      } else {
        newStreakCount = prevStreak;
      }

      await supabase.from("verse_streaks").update({
        streak_count: newStreakCount,
        user_a_sent_today: newA,
        user_b_sent_today: newB,
        updated_at: new Date().toISOString(),
      }).eq("user_a", userA).eq("user_b", userB);

    } else if (lastDate === yesterday) {
      // New day, continuing from yesterday
      // Only keep the streak if yesterday was a complete day (both sent)
      const baseStreak = (aSent && bSent) ? prevStreak : 0;

      // Reset today's flags, mark current sender
      const newA = isUserA;
      const newB = !isUserA;
      newStreakCount = baseStreak; // will increment when 2nd person sends today

      await supabase.from("verse_streaks").update({
        streak_count: baseStreak,
        last_exchange_date: today,
        user_a_sent_today: newA,
        user_b_sent_today: newB,
        updated_at: new Date().toISOString(),
      }).eq("user_a", userA).eq("user_b", userB);

    } else {
      // Gap of 2+ days → streak fully broken, restart
      newStreakCount = 0;
      await supabase.from("verse_streaks").update({
        streak_count: 0,
        last_exchange_date: today,
        user_a_sent_today: isUserA,
        user_b_sent_today: !isUserA,
        updated_at: new Date().toISOString(),
      }).eq("user_a", userA).eq("user_b", userB);
    }
  }

  // Milestone bonuses (trigger exactly when the threshold is crossed)
  if (newStreakCount === 3)  bonusXP = "STREAK_3_DAYS_FLAME";
  if (newStreakCount === 7)  bonusXP = "STREAK_7_DAYS_FLAME";
  if (newStreakCount === 30) bonusXP = "STREAK_30_DAYS_FLAME";

  // Award XP
  const xpResult = await awardXP(user.id, "VERSE_SENT");
  const bonusResult = bonusXP ? await awardXP(user.id, bonusXP) : null;

  return NextResponse.json({
    ok: true,
    messageId: msg.id,
    streakCount: newStreakCount,
    xp: xpResult,
    bonusXP: bonusResult,
  });
}
