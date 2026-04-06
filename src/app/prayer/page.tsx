"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PrayerTabs } from "@/components/ui/PrayerTabs";
import { PrayerTimer } from "@/components/ui/PrayerTimer";
import { PrayerList } from "@/components/ui/PrayerList";

export default function PrayerPage() {
  const [activeTab, setActiveTab] = useState<"timer" | "prayers">("timer");

  return (
    <AppShell>
      <div className="min-h-screen bg-bg-primary px-5 pb-28 pt-6 transition-colors duration-300">
        <div className="flex flex-col items-center">
          <PrayerTabs activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div className="mt-8 w-full">
            {activeTab === "timer" ? (
              <PrayerTimer />
            ) : (
              <PrayerList />
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
