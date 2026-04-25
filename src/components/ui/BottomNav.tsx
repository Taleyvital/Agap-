"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Users, Flame, User, Music2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const items = [
    { href: "/home",      label: t("nav_home"),     Icon: Home },
    { href: "/bible",     label: t("nav_bible"),    Icon: BookOpen },
    { href: "/gospel",    label: "Gospel",           Icon: Music2 },
    { href: "/community", label: t("nav_community"), Icon: Users },
    { href: "/prayer",    label: t("nav_pray"),      Icon: Flame },
    { href: "/profile",   label: t("nav_profile"),   Icon: User },
  ] as const;

  return (
    <div
      className="fixed left-1/2 z-50 -translate-x-1/2 pointer-events-none"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 8px) + 4px)" }}
    >
      {/* Pixel stretch — blurs content that scrolls behind the nav */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: "100%",
          left: "-40px",
          right: "-40px",
          height: "72px",
          backdropFilter: "blur(28px) saturate(220%)",
          WebkitBackdropFilter: "blur(28px) saturate(220%)",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 100%)",
        }}
      />

      <nav
        className="pointer-events-auto relative flex items-center justify-around gap-1 rounded-full px-4 py-3 shadow-2xl"
        style={{
          backgroundColor: "rgba(26, 24, 48, 0.80)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          border: "1px solid rgba(123, 111, 212, 0.18)",
        }}
        aria-label="Navigation principale"
      >
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition-colors ${
                active ? "text-white" : "text-[#666680]"
              }`}
              style={active ? { backgroundColor: "#0d0b1e" } : undefined}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                strokeWidth={active ? 2.2 : 1.5}
                aria-hidden
              />
              {active && (
                <span className="font-sans text-[11px] font-semibold uppercase tracking-widest whitespace-nowrap">
                  {label}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
