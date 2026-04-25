"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { GospelMiniPlayer } from "@/components/ui/GospelMiniPlayer";
import { useGospelPlayer } from "@/components/providers/GospelPlayerProvider";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  const { currentTrack } = useGospelPlayer();
  const hasMiniPlayer = !!currentTrack;

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#141414]">
      <div
        className={`relative mx-auto min-h-screen max-w-[430px] overflow-x-hidden bg-bg-primary ${hasMiniPlayer ? "pb-40" : "pb-24"}`}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {children}
        {showNav && <GospelMiniPlayer />}
        {showNav ? <BottomNav /> : null}
      </div>
    </div>
  );
}
