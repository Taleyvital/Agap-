"use client";

import { useQuery } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import AvatarBuilder, { type AvatarConfig } from "./AvatarBuilder";

interface Props {
  userId: string;
  size?: number;
  className?: string;
  /** Pass config directly (skip fetch) — used when you already have it */
  config?: AvatarConfig;
}

async function fetchConfig(userId: string): Promise<AvatarConfig> {
  const sb = createSupabaseBrowserClient();
  const { data } = await sb
    .from("avatar_customization")
    .select("skin_tone,eye_shape,eye_color,eyebrow_style,nose_shape,mouth_style,hair_style,hair_color,beard_style,accessory,background_color")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as AvatarConfig | null) ?? {};
}

export function UserAvatar({ userId, size = 40, className, config: propConfig }: Props) {
  const { data: fetchedConfig } = useQuery({
    queryKey: ["avatar", userId],
    queryFn: () => fetchConfig(userId),
    staleTime: Infinity,
    enabled: !propConfig,
  });

  const config = propConfig ?? fetchedConfig ?? {};

  return (
    <div
      className={className}
      style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, display: "inline-block" }}
    >
      <AvatarBuilder config={config} size={size} />
    </div>
  );
}

/** Invalidate a user's avatar cache (call after saving) */
export function invalidateAvatarCache(queryClient: import("@tanstack/react-query").QueryClient, userId: string) {
  void queryClient.invalidateQueries({ queryKey: ["avatar", userId] });
}
