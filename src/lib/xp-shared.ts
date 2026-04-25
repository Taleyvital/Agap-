// ── Shared XP constants and pure functions ───────────────────
// This file has NO server-only imports — safe to use in client components.

export const XP_VALUES: Record<string, number> = {
  LECTURE_DAY_COMPLETED:    50,
  PRAYER_TIMER_COMPLETED:   30,
  VERSE_ANNOTATED:          20,
  COMMUNITY_POST_PUBLISHED: 25,
  COMMUNITY_AMEN_RECEIVED:  10,
  PRAYER_ANSWERED_LOGGED:   40,
  STREAK_7_DAYS:           100,
  STREAK_30_DAYS:          500,
  ONBOARDING_COMPLETED:    200,
  // Flammes spirituelles
  VERSE_SENT:               15,
  STREAK_3_DAYS_FLAME:      50,
  STREAK_7_DAYS_FLAME:     150,
  STREAK_30_DAYS_FLAME:    500,
  // Gospel
  GOSPEL_TRACK_PLAYED:       5,
  GOSPEL_TRACK_LIKED:        5,
  GOSPEL_TRACK_UPLOADED:   100,
};

export const LEVELS = [
  { level: 1, name: "Graine",  minXP: 0,    maxXP: 200  },
  { level: 2, name: "Racine",  minXP: 201,  maxXP: 500  },
  { level: 3, name: "Branche", minXP: 501,  maxXP: 1000 },
  { level: 4, name: "Arbre",   minXP: 1001, maxXP: 2000 },
  { level: 5, name: "Lumière", minXP: 2001, maxXP: 4000 },
  { level: 6, name: "Flamme",  minXP: 4001, maxXP: 7000 },
  { level: 7, name: "Témoin",  minXP: 7001, maxXP: Infinity },
];

export function getLevelForXP(totalXP: number): { level: number; name: string } {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].minXP) {
      return { level: LEVELS[i].level, name: LEVELS[i].name };
    }
  }
  return { level: 1, name: "Graine" };
}

export function getNextLevel(currentLevel: number) {
  return LEVELS.find((l) => l.level === currentLevel + 1) ?? null;
}

export interface XPResult {
  xpEarned:     number;
  newTotal:     number;
  levelUp:      boolean;
  newLevel:     number;
  newLevelName: string;
  streakBonus?: { type: string; xp: number };
}
