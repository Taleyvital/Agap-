"use client";

import { motion } from "framer-motion";

interface PrayerTabsProps {
  activeTab: "timer" | "prayers";
  onTabChange: (tab: "timer" | "prayers") => void;
}

export function PrayerTabs({ activeTab, onTabChange }: PrayerTabsProps) {
  return (
    <div className="flex w-full max-w-[280px] rounded-full bg-bg-secondary p-1">
      <button
        type="button"
        onClick={() => onTabChange("timer")}
        className={`relative flex-1 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
          activeTab === "timer" ? "text-black" : "text-text-secondary"
        }`}
      >
        {activeTab === "timer" && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 rounded-full bg-white"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10">Timer</span>
      </button>
      <button
        type="button"
        onClick={() => onTabChange("prayers")}
        className={`relative flex-1 py-2 text-xs font-medium uppercase tracking-wider transition-colors ${
          activeTab === "prayers" ? "text-black" : "text-text-secondary"
        }`}
      >
        {activeTab === "prayers" && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 rounded-full bg-white"
            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
          />
        )}
        <span className="relative z-10">Mes Prières</span>
      </button>
    </div>
  );
}
