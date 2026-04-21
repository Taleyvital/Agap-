"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Users, Flame, User } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const items = [
    { href: "/home", label: t("nav_home"), Icon: Home },
    { href: "/bible", label: t("nav_bible"), Icon: BookOpen },
    { href: "/community", label: t("nav_community"), Icon: Users },
    { href: "/prayer", label: t("nav_pray"), Icon: Flame },
    { href: "/profile", label: t("nav_profile"), Icon: User },
  ] as const;

  return (
    <nav
      className="fixed left-1/2 z-50 flex -translate-x-1/2 items-center justify-around gap-1 rounded-full px-3 py-2 shadow-xl backdrop-blur-md"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 16px) + 12px)", backgroundColor: "#1a1830" }}
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
  );
}
