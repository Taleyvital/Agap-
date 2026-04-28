"use client";

import Image from "next/image";
import { useQuery, type QueryClient } from "@tanstack/react-query";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import AvatarBuilder, { type AvatarConfig } from "./AvatarBuilder";

export type AvatarDisplayMode = "avatar" | "photo" | "initial";

export interface AvatarData {
  mode: AvatarDisplayMode;
  avatarUrl: string | null;
  initial: string;
  config: AvatarConfig;
}

interface Props {
  userId: string;
  size?: number;
  className?: string;
}

async function fetchAvatarData(userId: string): Promise<AvatarData> {
  const sb = createSupabaseBrowserClient();
  const [profileRes, configRes] = await Promise.all([
    sb.from("profiles")
      .select("avatar_url, first_name, anonymous_name, avatar_display_mode")
      .eq("id", userId)
      .maybeSingle(),
    sb.from("avatar_customization")
      .select("skin_tone,eye_shape,eye_color,eyebrow_style,nose_shape,mouth_style,hair_style,hair_color,beard_style,accessory,background_color")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const p = profileRes.data;
  return {
    mode: ((p?.avatar_display_mode as string) ?? "initial") as AvatarDisplayMode,
    avatarUrl: (p?.avatar_url as string | null) ?? null,
    initial: ((p?.first_name as string | null) ?? (p?.anonymous_name as string | null) ?? "A")
      .charAt(0)
      .toUpperCase(),
    config: (configRes.data as AvatarConfig | null) ?? {},
  };
}

const wrapStyle = (size: number): React.CSSProperties => ({
  width: size,
  height: size,
  borderRadius: "50%",
  overflow: "hidden",
  flexShrink: 0,
  display: "inline-block",
});

export function UserAvatar({ userId, size = 40, className }: Props) {
  const { data } = useQuery<AvatarData>({
    queryKey: ["avatar", userId],
    queryFn: () => fetchAvatarData(userId),
    // Keep indefinitely cached — updates happen via setAvatarCacheMode()
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
  });

  const mode = data?.mode ?? "initial";
  const avatarUrl = data?.avatarUrl ?? null;
  const initial = data?.initial ?? "A";
  const config = data?.config ?? {};

  if (mode === "photo" && avatarUrl) {
    return (
      <div className={className} style={wrapStyle(size)}>
        <Image
          src={avatarUrl}
          alt=""
          width={size}
          height={size}
          style={{ objectFit: "cover", width: size, height: size }}
        />
      </div>
    );
  }

  if (mode === "initial") {
    return (
      <div
        className={className}
        style={{
          ...wrapStyle(size),
          background: "var(--bg-tertiary, #2a2a2a)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-serif, serif)",
            fontSize: size * 0.42,
            color: "var(--text-primary, #E8E8E8)",
            fontStyle: "italic",
            lineHeight: 1,
          }}
        >
          {initial}
        </span>
      </div>
    );
  }

  // default: SVG avatar
  return (
    <div className={className} style={wrapStyle(size)}>
      <AvatarBuilder config={config} size={size} />
    </div>
  );
}

/**
 * Immediately update the avatar cache for a user — no network request.
 * All mounted <UserAvatar userId={userId}> re-render instantly.
 */
export function setAvatarCacheMode(
  queryClient: QueryClient,
  userId: string,
  mode: AvatarDisplayMode,
  avatarUrl?: string | null,
) {
  const existing = queryClient.getQueryData<AvatarData>(["avatar", userId]);
  queryClient.setQueryData<AvatarData>(["avatar", userId], {
    avatarUrl: null,
    initial: "A",
    config: {},
    ...(existing ?? {}),
    mode,
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
  });
}

/** Force a full re-fetch from Supabase (e.g. after SVG avatar config save) */
export function invalidateAvatarCache(queryClient: QueryClient, userId: string) {
  void queryClient.invalidateQueries({ queryKey: ["avatar", userId] });
}
