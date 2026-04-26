"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { BookOpen, Home, Users, Flame, User, Music2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { useEffect, useState } from "react";

// Module-level cache to avoid re-fetching on every navigation
let _avatarUrl: string | null | undefined = undefined;
let _initial = "";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(_avatarUrl ?? null);
  const [initial, setInitial] = useState(_initial);

  useEffect(() => {
    if (_avatarUrl !== undefined) return;
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      void supabase
        .from("profiles")
        .select("avatar_url, first_name, anonymous_name")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            _avatarUrl = (data.avatar_url as string | null) ?? null;
            _initial = ((data.first_name as string | null) ?? (data.anonymous_name as string | null) ?? "A").charAt(0).toUpperCase();
            setAvatarUrl(_avatarUrl);
            setInitial(_initial);
          }
        });
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
            className="flex flex-1 flex-col items-center gap-1 py-3 transition-colors"
            style={{ color: active ? "rgb(var(--text-primary))" : "rgb(var(--text-tertiary))" }}
          >
            {href === "/profile" ? (
              <div
                className="relative h-6 w-6 shrink-0 rounded-full overflow-hidden bg-bg-secondary"
                style={{
                  border: active ? "2px solid rgb(var(--color-accent))" : "1.5px solid rgb(var(--separator))",
                  boxSizing: "border-box",
                }}
              >
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" fill className="object-cover" sizes="24px" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-serif text-[9px] italic text-text-primary">
                    {initial || <User className="h-3 w-3" />}
                  </span>
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
