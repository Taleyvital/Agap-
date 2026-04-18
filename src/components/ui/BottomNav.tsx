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
      className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-around border-t border-separator bg-bg-nav/95 px-6 pt-5 pb-[calc(env(safe-area-inset-bottom,16px)+12px)] backdrop-blur-sm"
      aria-label="Navigation principale"
    >
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className="flex min-w-[52px] flex-col items-center gap-0.5"
          >
            <Icon
              className={`h-6 w-6 ${active ? "text-text-primary transition-colors" : "text-text-tertiary transition-colors"}`}
              strokeWidth={active ? 2.2 : 1.5}
              aria-hidden
            />
            <span
              className={`text-[10px] font-sans uppercase tracking-widest ${active ? "text-text-primary transition-colors" : "text-text-tertiary transition-colors"}`}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
