function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export type HapticStyle = "light" | "medium" | "heavy";

export async function hapticImpact(style: HapticStyle = "medium"): Promise<void> {
  if (isNativePlatform()) {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    const map: Record<HapticStyle, typeof ImpactStyle[keyof typeof ImpactStyle]> = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };
    await Haptics.impact({ style: map[style] });
    return;
  }

  // Web fallback
  if ("vibrate" in navigator) {
    const durationMap: Record<HapticStyle, number> = { light: 30, medium: 60, heavy: 100 };
    navigator.vibrate(durationMap[style]);
  }
}
