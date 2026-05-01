// Server-only helper — calls the internal push/send API
const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

interface PushPayload {
  user_id: string;
  type: string;
  title: string;
  body: string;
  url: string;
  actions?: { action: string; title: string }[];
}

export async function sendPushNotification(payload: PushPayload): Promise<void> {
  await fetch(`${APP_URL}/api/push/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
