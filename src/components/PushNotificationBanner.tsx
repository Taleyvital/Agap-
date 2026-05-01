"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationPromotion } from "@/hooks/useNotificationPromotion";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

export function PushNotificationBanner() {
  const [visible, setVisible] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const { subscribe, isIOS, isPWA } = usePushNotifications();
  const { shouldShowBanner, shouldShowModal, dismiss } = useNotificationPromotion();

  useEffect(() => {
    // Banner never shows if modal is also eligible — modal has priority
    if (shouldShowModal()) return;
    setVisible(shouldShowBanner());
  }, [shouldShowBanner, shouldShowModal]);

  const handleActivate = async () => {
    if (isIOS && !isPWA) {
      setShowPrompt(true);
      return;
    }
    setLoading(true);
    const ok = await subscribe();
    setLoading(false);
    if (ok) setVisible(false);
  };

  const handleDismiss = () => {
    dismiss("banner");
    setVisible(false);
  };

  return (
    <>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="mx-6 mb-4 flex items-center gap-3 rounded-[12px] px-4 py-3"
            style={{
              background: "#1a1830",
              border: "0.5px solid rgba(123,111,212,0.4)",
            }}
          >
            {/* Bell icon */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                stroke="#7B6FD4"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            {/* Text */}
            <p
              className="flex-1 text-[13px] text-[#E8E8E8]"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Active les notifications pour ne rien rater 🔔
            </p>

            {/* Activate button */}
            <button
              onClick={() => void handleActivate()}
              disabled={loading}
              className="shrink-0 rounded-[8px] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
              style={{ background: "#7B6FD4", fontFamily: "var(--font-sans)" }}
            >
              {loading ? "…" : "Activer"}
            </button>

            {/* Dismiss */}
            <button
              onClick={handleDismiss}
              className="shrink-0 text-[#555] hover:text-[#888] transition-colors text-[16px] leading-none pl-1"
              aria-label="Fermer"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <PWAInstallPrompt
        open={showPrompt}
        onClose={() => setShowPrompt(false)}
      />
    </>
  );
}
