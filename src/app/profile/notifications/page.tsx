"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, Bell } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

interface NotifPrefs {
  flames: boolean;
  plan_reminder: boolean;
  amen_received: boolean;
  gospel_approved: boolean;
  prayer_reminder: boolean;
  xp_level: boolean;
  verse_received: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  flames: true,
  plan_reminder: true,
  amen_received: true,
  gospel_approved: true,
  prayer_reminder: false,
  xp_level: true,
  verse_received: true,
};

const PREF_LABELS: { key: keyof NotifPrefs; label: string; icon: string }[] = [
  { key: "flames", label: "Flammes spirituelles", icon: "🔥" },
  { key: "plan_reminder", label: "Plan de lecture du jour", icon: "📖" },
  { key: "amen_received", label: "Amens reçus", icon: "🙏" },
  { key: "gospel_approved", label: "Gospel approuvé", icon: "✅" },
  { key: "verse_received", label: "Verset reçu", icon: "📜" },
  { key: "xp_level", label: "Niveau XP atteint", icon: "⭐" },
  { key: "prayer_reminder", label: "Rappel de prière", icon: "🕊️" },
];

export default function NotificationsPage() {
  const router = useRouter();
  const { permission, isSubscribed, isPWA, isIOS, subscribe } = usePushNotifications();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("profiles")
        .select("notification_preferences")
        .eq("id", user.id)
        .maybeSingle();
      if (data?.notification_preferences) {
        setPrefs({ ...DEFAULT_PREFS, ...(data.notification_preferences as Partial<NotifPrefs>) });
      }
    })();
  }, []);

  const togglePref = async (key: keyof NotifPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    await supabase
      .from("profiles")
      .update({ notification_preferences: next })
      .eq("id", userId!);
    setSaving(false);
  };

  const handleActivate = async () => {
    if (isIOS && !isPWA) {
      setShowPrompt(true);
      return;
    }
    if (permission !== "granted") {
      setShowPrompt(true);
    }
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "#141414", color: "#E8E8E8", fontFamily: "var(--font-sans)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
        >
          <ChevronLeft size={18} color="#E8E8E8" />
        </button>
        <h1
          className="text-[22px] font-bold"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Notifications
        </h1>
        {saving && (
          <span className="ml-auto text-[12px] text-[#666666]">Sauvegarde…</span>
        )}
      </div>

      <div className="px-5 pb-24 flex flex-col gap-4">
        {/* Status card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[16px] p-4 flex items-center gap-4"
          style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
        >
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
            style={{ background: isSubscribed ? "rgba(123,111,212,0.15)" : "#2a2a2a" }}
          >
            <Bell size={20} color={isSubscribed ? "#7B6FD4" : "#666666"} />
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-medium text-[#E8E8E8]">
              {isSubscribed ? "Notifications actives" : "Notifications inactives"}
            </p>
            <p className="text-[13px] text-[#666666] mt-0.5">
              {isSubscribed
                ? "Tu recevras les alertes choisies ci-dessous."
                : "Active pour ne rater aucun moment."}
            </p>
          </div>
          {!isSubscribed && (
            <button
              onClick={() => void handleActivate()}
              className="text-[13px] font-semibold px-4 py-2 rounded-[10px] shrink-0"
              style={{ background: "#7B6FD4", color: "white" }}
            >
              Activer
            </button>
          )}
        </motion.div>

        {/* Preferences */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#666666] mb-3 px-1">
            Types de notifications
          </p>
          <div
            className="rounded-[16px] overflow-hidden"
            style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
          >
            {PREF_LABELS.map(({ key, label, icon }, i) => (
              <motion.div
                key={key}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center px-4 py-4"
                style={{
                  borderBottom: i < PREF_LABELS.length - 1 ? "0.5px solid #2a2a2a" : "none",
                }}
              >
                <span className="text-xl mr-3">{icon}</span>
                <span className="flex-1 text-[15px] text-[#E8E8E8]">{label}</span>
                <Toggle
                  checked={prefs[key]}
                  onChange={() => void togglePref(key)}
                  disabled={!isSubscribed || !userId}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Info note */}
        <p className="text-[12px] text-[#666666] px-1 text-center">
          Maximum 3 notifications par jour. Aucun spam.
        </p>
      </div>

      <PWAInstallPrompt open={showPrompt} onClose={() => setShowPrompt(false)} />
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className="relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 disabled:opacity-40"
      style={{
        background: checked ? "#7B6FD4" : "#333333",
      }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? "translateX(26px)" : "translateX(2px)" }}
      />
    </button>
  );
}
