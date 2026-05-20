"use client";

import React, { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Users, BookOpen, Heart, X, BellOff } from "lucide-react";

interface NotificationItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  badge?: number;
  time?: string;
}

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  communityUnread: number;
}

export function NotificationPanel({ isOpen, onClose, communityUnread }: NotificationPanelProps) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const notifications: NotificationItem[] = [
    ...(communityUnread > 0
      ? [
          {
            id: "community",
            icon: <Users className="h-4 w-4 text-[#7B6FD4]" />,
            title: "Communauté",
            description: `${communityUnread} nouveau${communityUnread > 1 ? "x" : ""} message${communityUnread > 1 ? "s" : ""} dans la communauté`,
            href: "/community",
            badge: communityUnread,
            time: "Maintenant",
          },
        ]
      : []),
    {
      id: "prayer",
      icon: <Heart className="h-4 w-4 text-rose-400" />,
      title: "Prière du jour",
      description: "Prenez un moment pour prier aujourd'hui",
      href: "/prayer",
      time: "Aujourd'hui",
    },
    {
      id: "reading",
      icon: <BookOpen className="h-4 w-4 text-emerald-400" />,
      title: "Parcours de lecture",
      description: "Continuez votre parcours biblique",
      href: "/reading-plan",
      time: "Aujourd'hui",
    },
  ];

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 z-50 w-80 origin-top-right animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.6))" }}
    >
      {/* Arrow */}
      <div className="absolute -top-1.5 right-3 h-3 w-3 rotate-45 rounded-sm bg-[#1c1c1c] border-l border-t border-[#2a2a2a]" />

      <div className="rounded-2xl border border-[#2a2a2a] bg-[#1c1c1c] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2a2a] px-4 py-3">
          <span className="font-sans text-[11px] uppercase tracking-widest text-[#666666]">
            Notifications
          </span>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-[#666666] hover:text-[#E8E8E8] transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Items */}
        <div className="divide-y divide-[#2a2a2a]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <BellOff className="h-8 w-8 text-[#333]" />
              <p className="font-sans text-sm text-[#666666]">Aucune notification</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <button
                key={notif.id}
                onClick={() => {
                  onClose();
                  router.push(notif.href);
                }}
                className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#232323] active:bg-[#282828]"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#252525] border border-[#2a2a2a]">
                  {notif.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-sans text-[13px] font-semibold text-[#E8E8E8]">
                      {notif.title}
                    </span>
                    {notif.badge !== undefined && (
                      <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 font-sans text-[9px] font-bold text-white">
                        {notif.badge > 9 ? "9+" : notif.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-sans text-[12px] text-[#666666] leading-relaxed">
                    {notif.description}
                  </p>
                  {notif.time && (
                    <p className="mt-1 font-sans text-[10px] text-[#444]">{notif.time}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
