"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useNotificationPromotion } from "@/hooks/useNotificationPromotion";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";

const FEATURES = [
  { icon: "🔥", label: "Rappels de flammes spirituelles" },
  { icon: "📖", label: "Plan de lecture du jour" },
  { icon: "🙏", label: "Amens reçus sur tes prières" },
  { icon: "✅", label: "Validation de tes titres gospel" },
  { icon: "⭐", label: "Nouveaux niveaux spirituels" },
];

const IOS_STEPS = [
  { num: 1, icon: "⬆️", text: "Appuie sur Partager en bas de Safari" },
  { num: 2, icon: "📲", text: "Sélectionne « Sur l'écran d'accueil »" },
  { num: 3, icon: "✨", text: "Ouvre AGAPE depuis l'icône ajoutée" },
];

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [showPWA, setShowPWA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"info" | "success" | "denied">("info");
  const { subscribe, isIOS, isPWA } = usePushNotifications();
  const { shouldShowModal, dismiss } = useNotificationPromotion();

  useEffect(() => {
    if (!shouldShowModal()) return;
    const timer = setTimeout(() => {
      dismiss("modal");
      setShowModal(true);
    }, 3000);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActivate = async () => {
    if (isIOS && !isPWA) {
      setShowPWA(true);
      setShowModal(false);
      return;
    }
    setLoading(true);
    const ok = await subscribe();
    setLoading(false);
    setStep(ok ? "success" : "denied");
    if (ok) setTimeout(() => setShowModal(false), 1800);
  };

  const handleClose = () => setShowModal(false);

  const showIOSTutorial = isIOS && !isPWA;

  return (
    <>
      {children}

      {/* Full-screen modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Overlay */}
            <motion.div
              className="absolute inset-0 bg-black/70"
              onClick={handleClose}
            />

            {/* Card */}
            <motion.div
              className="relative w-full max-w-[320px] rounded-[24px] p-6 flex flex-col items-center"
              style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
            >
              {step === "success" ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <span className="text-4xl">✅</span>
                  <p className="font-serif text-lg text-[#E8E8E8]">Notifications activées</p>
                  <p className="text-sm text-[#666666] text-center">Tu recevras les moments spirituels importants.</p>
                </div>
              ) : step === "denied" ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <span className="text-4xl">🔕</span>
                  <p className="font-serif text-lg text-[#E8E8E8]">Accès refusé</p>
                  <p className="text-sm text-[#666666] text-center">Active les notifications dans les réglages de ton navigateur.</p>
                  <button onClick={handleClose} className="mt-2 text-sm text-[#7B6FD4]">Fermer</button>
                </div>
              ) : (
                <>
                  {/* Pulsing bell */}
                  <motion.div
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                    className="mb-5 flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ background: "rgba(123,111,212,0.15)" }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"
                        stroke="#7B6FD4"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </motion.div>

                  {/* Title */}
                  <h2
                    className="text-[20px] font-bold text-[#E8E8E8] text-center mb-1"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Ne rate rien sur AGAPE
                  </h2>
                  <p
                    className="text-[13px] text-[#666666] text-center mb-5"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Active les notifications pour rester connecté à ta foi
                  </p>

                  {/* Feature list */}
                  {!showIOSTutorial && (
                    <div className="w-full flex flex-col gap-2.5 mb-6">
                      {FEATURES.map(({ icon, label }) => (
                        <div key={label} className="flex items-center gap-3">
                          <span className="text-[18px] w-6 shrink-0">{icon}</span>
                          <span
                            className="text-[13px] text-[#999999]"
                            style={{ fontFamily: "var(--font-sans)" }}
                          >
                            {label}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* iOS tutorial */}
                  {showIOSTutorial && (
                    <div className="w-full mb-6">
                      <p className="text-[11px] text-[#7B6FD4] font-semibold uppercase tracking-widest mb-3">
                        Installer AGAPE sur iPhone
                      </p>
                      <div className="flex flex-col gap-4">
                        {IOS_STEPS.map(({ num, icon, text }) => (
                          <div key={num} className="flex items-center gap-3">
                            <span
                              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                              style={{ background: "#7B6FD4" }}
                            >
                              {num}
                            </span>
                            <span className="text-xl">{icon}</span>
                            <span
                              className="text-[13px] text-[#999999]"
                              style={{ fontFamily: "var(--font-sans)" }}
                            >
                              {text}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!showIOSTutorial && (
                    <button
                      onClick={() => void handleActivate()}
                      disabled={loading}
                      className="w-full rounded-[14px] py-3.5 text-[15px] font-semibold text-white mb-3 disabled:opacity-60"
                      style={{ background: "#7B6FD4", fontFamily: "var(--font-sans)" }}
                    >
                      {loading ? "Activation…" : "Activer les notifications"}
                    </button>
                  )}

                  <button
                    onClick={handleClose}
                    className="w-full text-[13px] text-[#666666] py-2"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    Plus tard
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PWA install fallback for iOS */}
      <PWAInstallPrompt
        open={showPWA}
        onClose={() => setShowPWA(false)}
      />
    </>
  );
}
