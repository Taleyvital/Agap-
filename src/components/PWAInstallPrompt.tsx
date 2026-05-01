"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePushNotifications } from "@/hooks/usePushNotifications";

interface Props {
  open: boolean;
  onClose: () => void;
}

const SNOOZE_KEY = "pwa_prompt_snoozed_until";
const SNOOZE_DAYS = 3;

export function PWAInstallPrompt({ open, onClose }: Props) {
  const { isPWA, isIOS, subscribe, permission } = usePushNotifications();
  const [step, setStep] = useState<"info" | "success" | "denied">("info");
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    const until = Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000;
    localStorage.setItem(SNOOZE_KEY, String(until));
    onClose();
  };

  const handleSubscribe = async () => {
    setLoading(true);
    const ok = await subscribe();
    setLoading(false);
    if (ok) {
      setStep("success");
      setTimeout(onClose, 2000);
    } else {
      setStep("denied");
    }
  };

  useEffect(() => {
    if (open) setStep("info");
  }, [open]);

  const showIOSTutorial = isIOS && !isPWA;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60"
            onClick={handleClose}
          />
          <motion.div
            className="relative w-full max-w-[430px] rounded-[24px] p-6"
            style={{ background: "#141414", border: "0.5px solid #2a2a2a" }}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 260 }}
          >
            {step === "success" ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="text-4xl">✅</div>
                <p className="font-serif text-lg text-[#E8E8E8]">Notifications activées</p>
                <p className="text-sm text-[#666666] text-center">Tu recevras les moments spirituels importants.</p>
              </div>
            ) : step === "denied" ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <div className="text-4xl">🔕</div>
                <p className="font-serif text-lg text-[#E8E8E8]">Notifications bloquées</p>
                <p className="text-sm text-[#666666] text-center">
                  Autorise les notifications dans les réglages de ton navigateur pour les activer.
                </p>
                <button
                  onClick={handleClose}
                  className="mt-2 text-sm text-[#7B6FD4]"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-5">
                  <h2
                    className="text-[20px] text-[#E8E8E8] mb-1"
                    style={{ fontFamily: "var(--font-serif)", fontWeight: 700 }}
                  >
                    Active les notifications
                  </h2>
                  <p className="text-[14px] text-[#666666]" style={{ fontFamily: "var(--font-sans)" }}>
                    Ne rate aucun moment spirituel important
                  </p>
                </div>

                {/* Feature list */}
                <div className="flex flex-col gap-3 mb-6">
                  {FEATURES.map(({ icon, label }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xl w-7 shrink-0">{icon}</span>
                      <span className="text-[14px] text-[#E8E8E8]" style={{ fontFamily: "var(--font-sans)" }}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* iOS tutorial if not in PWA */}
                {showIOSTutorial && (
                  <div className="mb-6">
                    <div
                      className="rounded-[16px] p-4 mb-3"
                      style={{ background: "#1c1c1c", border: "0.5px solid #2a2a2a" }}
                    >
                      <p className="text-[12px] text-[#7B6FD4] font-semibold mb-3 uppercase tracking-widest">
                        Installer AGAPE sur iPhone
                      </p>
                      <div className="flex flex-col gap-4">
                        {IOS_STEPS.map(({ num, icon, text }) => (
                          <div key={num} className="flex items-start gap-3">
                            <span
                              className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold text-white"
                              style={{ background: "#7B6FD4" }}
                            >
                              {num}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{icon}</span>
                              <span
                                className="text-[13px] text-[#999999]"
                                style={{ fontFamily: "var(--font-sans)" }}
                              >
                                {text}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-[12px] text-[#666666] text-center">
                      Puis reviens dans AGAPE et active les notifications
                    </p>
                  </div>
                )}

                {/* Actions */}
                {(!showIOSTutorial || permission !== "default") && (
                  <button
                    onClick={() => void handleSubscribe()}
                    disabled={loading}
                    className="w-full rounded-[14px] py-3.5 text-[15px] font-semibold text-white mb-3 disabled:opacity-60"
                    style={{ background: "#7B6FD4", fontFamily: "var(--font-sans)" }}
                  >
                    {loading ? "Activation…" : "Activer les notifications"}
                  </button>
                )}

                <button
                  onClick={handleClose}
                  className="w-full text-[14px] text-[#666666] py-2"
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
  );
}

export function usePWAPromptShouldShow(): boolean {
  const [should, setShould] = useState(false);
  useEffect(() => {
    const snoozedUntil = localStorage.getItem("pwa_prompt_snoozed_until");
    if (snoozedUntil && Date.now() < Number(snoozedUntil)) {
      setShould(false);
      return;
    }
    if (!("Notification" in window)) {
      setShould(false);
      return;
    }
    setShould(Notification.permission === "default");
  }, []);
  return should;
}

const FEATURES = [
  { icon: "🔥", label: "Rappels de flammes spirituelles" },
  { icon: "📖", label: "Plan de lecture du jour" },
  { icon: "🙏", label: "Amens reçus sur tes prières" },
  { icon: "✅", label: "Validation de tes titres gospel" },
];

const IOS_STEPS = [
  { num: 1, icon: "⬆️", text: "Appuie sur Partager en bas de Safari" },
  { num: 2, icon: "📲", text: "Sélectionne « Sur l'écran d'accueil »" },
  { num: 3, icon: "✨", text: "Ouvre AGAPE depuis l'icône ajoutée" },
];
