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

  // Update streak
  const [userA, userB] = normalizeUserPair(user.id, body.receiverId);
  const isUserA = user.id === userA;
  const today = new Date().toISOString().split("T")[0];

  const { data: streak } = await supabase
    .from("verse_streaks")
    .select("*")
    .eq("user_a", userA)
    .eq("user_b", userB)
    .maybeSingle();

  let newStreakCount = 1;
  let bonusXP: string | null = null;

  if (!streak) {
    await supabase.from("verse_streaks").insert({
      user_a: userA,
      user_b: userB,
      streak_count: 1,
      last_exchange_date: today,
      user_a_sent_today: isUserA,
      user_b_sent_today: !isUserA,
    });
  } else {
    const lastDate = streak.last_exchange_date as string;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const bothSentYesterday = lastDate === yesterday && streak.user_a_sent_today && streak.user_b_sent_today;
    const isToday = lastDate === today;

    const aSentToday = isUserA ? true : streak.user_a_sent_today;
    const bSentToday = !isUserA ? true : streak.user_b_sent_today;

    if (isToday) {
      // Same day, just update who sent
      newStreakCount = streak.streak_count;
      const bothNowSentToday = aSentToday && bSentToday;
      // If both sent today and it wasn't already counted, increment
      const wasAlreadyBoth = streak.user_a_sent_today && streak.user_b_sent_today;
      if (bothNowSentToday && !wasAlreadyBoth) {
        newStreakCount = streak.streak_count + 1;
      }
      await supabase.from("verse_streaks").update({
        streak_count: newStreakCount,
        user_a_sent_today: aSentToday,
        user_b_sent_today: bSentToday,
        updated_at: new Date().toISOString(),
      }).eq("user_a", userA).eq("user_b", userB);
    } else if (bothSentYesterday) {
      // Continue streak from yesterday
      newStreakCount = streak.streak_count + (aSentToday && bSentToday ? 1 : 0);
      await supabase.from("verse_streaks").update({
        streak_count: streak.streak_count,
        last_exchange_date: today,
        user_a_sent_today: aSentToday,
        user_b_sent_today: bSentToday,
        updated_at: new Date().toISOString(),
      }).eq("user_a", userA).eq("user_b", userB);
      newStreakCount = streak.streak_count;
    } else {
      // Streak broken or starting fresh
      newStreakCount = 1;
      await supabase.from("verse_streaks").update({
        streak_count: 1,
        last_exchange_date: today,
        user_a_sent_today: isUserA,
        user_b_sent_today: !isUserA,
        updated_at: new Date().toISOString(),
      }).eq("user_a", userA).eq("user_b", userB);
    }

    // Streak milestone bonuses
    if (newStreakCount === 3)  bonusXP = "STREAK_3_DAYS_FLAME";
    if (newStreakCount === 7)  bonusXP = "STREAK_7_DAYS_FLAME";
    if (newStreakCount === 30) bonusXP = "STREAK_30_DAYS_FLAME";
  }

  // Award XP for sending
  const xpResult = await awardXP(user.id, "VERSE_SENT");
  let bonusResult = null;
  if (bonusXP) bonusResult = await awardXP(user.id, bonusXP);

  return NextResponse.json({
    ok: true,
    messageId: msg.id,
    streakCount: newStreakCount,
    xp: xpResult,
    bonusXP: bonusResult,
  });
}
