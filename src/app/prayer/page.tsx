"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PrayerTabs } from "@/components/ui/PrayerTabs";
import { PrayerTimer } from "@/components/ui/PrayerTimer";
import { PrayerList } from "@/components/ui/PrayerList";

function PrayerPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<"timer" | "prayers">(
    tabParam === "prayers" ? "prayers" : "timer"
  );

  // Clean URL parameter after reading it
  useEffect(() => {
    if (tabParam) {
      router.replace("/prayer", { scroll: false });
    }
  }, [tabParam, router]);

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

export default function PrayerPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PrayerPageContent />
    </Suspense>
  );
}
