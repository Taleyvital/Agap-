"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Users, Flame, User } from "lucide-react";

const items = [
  { href: "/home", label: "Accueil", Icon: Home },
  { href: "/bible", label: "Bible", Icon: BookOpen },
  { href: "/community", label: "Communauté", Icon: Users },
  { href: "/prayer", label: "Prier", Icon: Flame },
  { href: "/profile", label: "Profil", Icon: User },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-full border border-separator bg-bg-nav/95 px-6 py-3 backdrop-blur-sm"
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
              className={`h-5 w-5 ${active ? "text-text-primary transition-colors" : "text-text-tertiary transition-colors"}`}
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
