"use client";

import { useCallback } from "react";

const BANNER_KEY = "push_banner_dismissed";
const MODAL_KEY = "push_prompt_seen";
const THREE_DAYS = 1000 * 60 * 60 * 24 * 3;

export function useNotificationPromotion() {
  const shouldShowBanner = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission !== "default") return false;
    const dismissed = localStorage.getItem(BANNER_KEY);
    if (!dismissed) return true;
    return Date.now() - parseInt(dismissed) > THREE_DAYS;
  }, []);

  const shouldShowModal = useCallback((): boolean => {
    if (typeof window === "undefined") return false;
    if (!("Notification" in window)) return false;
    if (Notification.permission !== "default") return false;
    return !localStorage.getItem(MODAL_KEY);
  }, []);

  const dismiss = useCallback((type: "banner" | "modal") => {
    if (type === "banner") {
      localStorage.setItem(BANNER_KEY, Date.now().toString());
    } else {
      localStorage.setItem(MODAL_KEY, Date.now().toString());
    }
  }, []);

  return { shouldShowBanner, shouldShowModal, dismiss };
}
