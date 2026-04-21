"use client";

import type { ReactNode } from "react";
import { BottomNav } from "@/components/ui/BottomNav";

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="relative mx-auto min-h-screen max-w-[430px] bg-bg-primary pb-24 shadow-2xl transition-colors duration-300">
        {children}
        {showNav ? <BottomNav /> : null}
      </div>
    </div>
  );
}
