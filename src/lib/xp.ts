// Server-only — uses supabase-server (next/headers). Do NOT import in client components.
import { createSupabaseServiceClient } from "./supabase-server";
import { XP_VALUES, getLevelForXP } from "./xp-shared";

const COIN_REWARDS: Record<string, number> = {
  LECTURE_DAY_COMPLETED:   10,
  PRAYER_TIMER_COMPLETED:   5,
  VERSE_ANNOTATED:          3,
  COMMUNITY_POST_PUBLISHED: 5,
  STREAK_7_DAYS:           50,
  STREAK_30_DAYS:         200,
  ONBOARDING_COMPLETED:   100,
  GOSPEL_TRACK_PLAYED:      2,
  STORY_LISTENED_COMPLETE: 15,
  STRONG_WORD_EXPLORED:     3,
};

export async function awardCoins(userId: string, actionType: string) {
  const coins = COIN_REWARDS[actionType];
  if (!coins) return;
  const supabase = createSupabaseServiceClient();
  await supabase.rpc("increment_coins", { p_user_id: userId, p_amount: coins });
}

export type { XPResult } from "./xp-shared";
export { XP_VALUES, LEVELS, getLevelForXP, getNextLevel } from "./xp-shared";

export async function awardXP(userId: string, actionType: string) {
  const xpEarned = XP_VALUES[actionType];
  if (xpEarned === undefined) return null;

  const supabase = createSupabaseServiceClient();

  if (actionType === "ONBOARDING_COMPLETED") {
    const { data: existing } = await supabase
      .from("user_xp")
      .select("id")
      .eq("user_id", userId)
      .eq("action_type", "ONBOARDING_COMPLETED")
      .maybeSingle();
    if (existing) return null;
  }

  const { data: levelRow } = await supabase
    .from("user_levels")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().split("T")[0];
  const lastDate: string | null = levelRow?.last_activity_date ?? null;

  let currentStreak = levelRow?.current_streak ?? 0;
  let longestStreak = levelRow?.longest_streak ?? 0;
  let streakUpdated = false;
  let streakBonusType: string | null = null;
  let streakBonusXP = 0;

  if (lastDate !== today) {
    currentStreak = lastDate === yesterday ? currentStreak + 1 : 1;
    streakUpdated = true;
    if (currentStreak > longestStreak) longestStreak = currentStreak;
    if (currentStreak === 7)  { streakBonusType = "STREAK_7_DAYS";  streakBonusXP = XP_VALUES["STREAK_7_DAYS"];  }
    if (currentStreak === 30) { streakBonusType = "STREAK_30_DAYS"; streakBonusXP = XP_VALUES["STREAK_30_DAYS"]; }
  }

  const previousTotal = levelRow?.total_xp ?? 0;
  const previousLevel = levelRow?.current_level ?? 1;
  const newTotal = previousTotal + xpEarned + streakBonusXP;
  const { level: newLevel, name: newLevelName } = getLevelForXP(newTotal);
  const levelUp = newLevel > previousLevel;

  await supabase.from("user_xp").insert({ user_id: userId, action_type: actionType, xp_earned: xpEarned });

  if (streakBonusType) {
    await supabase.from("user_xp").insert({ user_id: userId, action_type: streakBonusType, xp_earned: streakBonusXP });
  }

  await supabase.from("user_levels").upsert({
    user_id:            userId,
    total_xp:           newTotal,
    current_level:      newLevel,
    current_streak:     currentStreak,
    longest_streak:     longestStreak,
    last_activity_date: streakUpdated ? today : (lastDate ?? today),
    updated_at:         new Date().toISOString(),
  });

  // Award coins in parallel (fire-and-forget; never blocks XP result)
  const coinActions = [actionType, ...(streakBonusType ? [streakBonusType] : [])];
  await Promise.all(coinActions.map((a) => awardCoins(userId, a)));

  return {
    xpEarned,
    newTotal,
    levelUp,
    newLevel,
    newLevelName,
    ...(streakBonusType ? { streakBonus: { type: streakBonusType, xp: streakBonusXP } } : {}),
  };
}
