"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Users, Flame, User, Music2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";

// Module-level cache — one fetch per session
let _userId: string | null | undefined = undefined;

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [userId, setUserId] = useState<string | null>(_userId ?? null);

  useEffect(() => {
    if (_userId !== undefined) return;
    const sb = createSupabaseBrowserClient();
    void sb.auth.getUser().then(({ data: { user } }) => {
      _userId = user?.id ?? null;
      setUserId(_userId);
    });
  }, []);

  const items = [
    { href: "/home",      label: t("nav_home"),      Icon: Home },
    { href: "/bible",     label: t("nav_bible"),     Icon: BookOpen },
    { href: "/gospel",    label: "Gospel",            Icon: Music2 },
    { href: "/community", label: t("nav_community"), Icon: Users },
    { href: "/prayer",    label: t("nav_pray"),      Icon: Flame },
    { href: "/profile",   label: t("nav_profile"),   Icon: User },
  ] as const;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-end justify-around border-t border-separator bg-bg-nav"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
      aria-label="Navigation principale"
    >
      {items.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            prefetch={true}
            className="flex flex-1 flex-col items-center gap-1 py-3 transition-colors"
            style={{ color: active ? "rgb(var(--text-primary))" : "rgb(var(--text-tertiary))" }}
          >
            {href === "/profile" ? (
              <div
                className="relative h-6 w-6 shrink-0 rounded-full overflow-hidden"
                style={{
                  border: active ? "2px solid rgb(var(--color-accent))" : "1.5px solid rgb(var(--separator))",
                  boxSizing: "border-box",
                }}
              >
                {userId ? (
                  <UserAvatar userId={userId} size={24} />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-bg-secondary">
                    <User className="h-3 w-3" />
                  </div>
                )}
              </div>
            ) : (
              <Icon
                className="h-6 w-6 shrink-0"
                strokeWidth={active ? 2.2 : 1.5}
                aria-hidden
              />
            )}
            <span className="font-sans text-[9px] font-semibold uppercase tracking-widest">
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
