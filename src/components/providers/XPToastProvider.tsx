"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { XPResult } from "@/lib/xp-shared";

// ── Context ──────────────────────────────────────────────────
interface XPToastContextValue {
  showXPToast: (result: XPResult) => void;
}

const XPToastContext = createContext<XPToastContextValue>({
  showXPToast: () => undefined,
});

export function useXPToast() {
  return useContext(XPToastContext);
}

// ── Helper: award XP via API + show toast ────────────────────
export async function triggerXP(
  actionType: string,
  showXPToast: (r: XPResult) => void,
) {
  try {
    const res = await fetch("/api/xp/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType }),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { ok: boolean; xp?: XPResult };
    if (data.ok && data.xp) showXPToast(data.xp);
  } catch {
    // silent — XP is non-critical
  }
}

// ── Toast item type ──────────────────────────────────────────
interface ToastItem {
  id: number;
  result: XPResult;
}

// ── Provider ─────────────────────────────────────────────────
export function XPToastProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  const showXPToast = useCallback((result: XPResult) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, result }]);

    // Fire confetti on level-up
    if (result.levelUp) {
      void import("canvas-confetti").then((m) => {
        const confetti = m.default;
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.2 },
          colors: ["#7B6FD4", "#A99FE0", "#E8E8E8", "#5A4FBF"],
          gravity: 0.9,
          scalar: 0.85,
        });
      });
    }

    // Auto-dismiss after 2.5 s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  return (
    <XPToastContext.Provider value={{ showXPToast }}>
      {children}

      {/* ── Toast overlay — client-only to avoid hydration mismatch ── */}
      {mounted && (
        <div className="pointer-events-none fixed top-4 inset-x-0 z-[9999] flex flex-col items-center gap-2 px-4">
          <AnimatePresence mode="sync">
            {toasts.map((toast) => (
              <XPToastItem key={toast.id} toast={toast} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </XPToastContext.Provider>
  );
}

// ── Individual toast ─────────────────────────────────────────
function XPToastItem({ toast }: { toast: ToastItem }) {
  const { result } = toast;
  const isLevelUp = result.levelUp;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        background: "#1c1c1c",
        border: "0.5px solid rgba(123,111,212,0.4)",
        borderRadius: isLevelUp ? 16 : 12,
      }}
      className={`flex flex-col items-center ${isLevelUp ? "px-6 py-4 gap-1" : "px-5 py-3"}`}
    >
      {isLevelUp ? (
        <>
          <span
            style={{ fontFamily: "var(--font-serif)", color: "#ffffff" }}
            className="text-base font-normal"
          >
            Niveau atteint — {result.newLevelName}
          </span>
          <span
            style={{
              fontFamily: "var(--font-serif)",
              color: "#7B6FD4",
              fontStyle: "italic",
            }}
            className="text-sm"
          >
            + {result.xpEarned} XP
          </span>
        </>
      ) : (
        <span
          style={{
            fontFamily: "var(--font-serif)",
            color: "#7B6FD4",
            fontStyle: "italic",
          }}
          className="text-base"
        >
          + {result.xpEarned} XP
        </span>
      )}

      {result.streakBonus && (
        <span
          style={{ color: "#9CA3AF", fontFamily: "var(--font-sans)" }}
          className="text-[11px] mt-0.5"
        >
          Bonus streak +{result.streakBonus.xp} XP
        </span>
      )}
    </motion.div>
  );
}
