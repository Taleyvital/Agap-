// Flammes Spirituelles — helpers partagés (client-safe)

export type FlameColor = "default" | "violet" | "gold" | "white";

export function getFlameColor(streakCount: number): FlameColor {
  if (streakCount >= 30) return "white";
  if (streakCount >= 7) return "gold";
  if (streakCount >= 3) return "violet";
  return "default";
}

export function getFlameColorHex(streakCount: number): string {
  const color = getFlameColor(streakCount);
  if (color === "white") return "#FFFFFF";
  if (color === "gold") return "#E8C84A";
  if (color === "violet") return "#7B6FD4";
  return "#666666";
}

// Normalize pair so user_a < user_b (consistent ordering for streak lookup)
export function normalizeUserPair(
  userA: string,
  userB: string,
): [string, string] {
  return userA < userB ? [userA, userB] : [userB, userA];
}
