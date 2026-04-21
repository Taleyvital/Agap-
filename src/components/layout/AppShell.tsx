"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/ui/BottomNav";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#141414]">
      <div className="relative mx-auto min-h-screen max-w-[430px] overflow-x-hidden bg-bg-primary pb-24" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {children}
        {showNav ? <BottomNav /> : null}
      </div>
    </div>
  );
}
