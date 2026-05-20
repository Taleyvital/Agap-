"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase";

type PermissionState = "default" | "granted" | "denied";

function isNativePlatform(): boolean {
  if (typeof window === "undefined") return false;
  try {
    // Capacitor sets this flag when running inside a native app
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ios =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(ios);
    const pwa = window.matchMedia("(display-mode: standalone)").matches;
    setIsPWA(pwa);

    if (isNativePlatform()) {
      // Native Capacitor: check permission state via the plugin
      import("@capacitor/push-notifications").then(({ PushNotifications }) => {
        PushNotifications.checkPermissions().then((status) => {
          setPermission(
            status.receive === "granted"
              ? "granted"
              : status.receive === "denied"
              ? "denied"
              : "default"
          );
          setIsSubscribed(status.receive === "granted");
        });
      });
      return;
    }

    // Web fallback
    if ("Notification" in window) {
      setPermission(Notification.permission as PermissionState);
    }
    if ("serviceWorker" in navigator && "PushManager" in window) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = async (): Promise<boolean> => {
    if (isNativePlatform()) {
      return subscribeNative();
    }
    return subscribeWeb(isIOS);
  };

  return { permission, isSubscribed, isPWA, isIOS, subscribe };
}

async function subscribeNative(): Promise<boolean> {
  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const status = await PushNotifications.requestPermissions();
    if (status.receive !== "granted") return false;

    await PushNotifications.register();

    return new Promise((resolve) => {
      // Token received — store it server-side
      PushNotifications.addListener("registration", async (token) => {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) { resolve(false); return; }

        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: { type: "fcm", token: token.value },
            device_type: /iPad|iPhone|iPod/.test(navigator.userAgent)
              ? "ios"
              : "android",
          }),
        });
        resolve(true);
      });

      PushNotifications.addListener("registrationError", () => resolve(false));

      // Resolve after timeout if no callback fires
      setTimeout(() => resolve(false), 10_000);
    });
  } catch {
    return false;
  }
}

async function subscribeWeb(isIOS: boolean): Promise<boolean> {
  if (!("Notification" in window) || !("serviceWorker" in navigator))
    return false;

  const result = await Notification.requestPermission();
  if (result !== "granted") return false;

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
      ).buffer as ArrayBuffer,
    });

    const supabase = createSupabaseBrowserClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const device_type = isIOS
      ? "ios"
      : /Android/.test(navigator.userAgent)
      ? "android"
      : "desktop";

    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), device_type }),
    });

    return true;
  } catch {
    return false;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(Array.from(rawData).map((c) => c.charCodeAt(0)));
}
