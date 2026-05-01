import { NextResponse } from "next/server";
import webpush from "web-push";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

const SUBJECT = process.env.VAPID_SUBJECT!.startsWith("mailto:")
  ? process.env.VAPID_SUBJECT!
  : `mailto:${process.env.VAPID_SUBJECT!}`;

webpush.setVapidDetails(
  SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const MAX_DAILY_NOTIFICATIONS = 3;

interface SendPayload {
  user_id: string;
  title: string;
  body: string;
  url: string;
  type?: string;
  actions?: { action: string; title: string }[];
}

export async function POST(request: Request) {
  const service = createSupabaseServiceClient();
  const body = await request.json() as SendPayload;
  const { user_id, title, body: notifBody, url, type = "general", actions } = body;

  if (!user_id || !title || !notifBody) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  // Check notification preferences
  const { data: profile } = await service
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user_id)
    .maybeSingle();

  const prefs = (profile?.notification_preferences as Record<string, boolean> | null) ?? {};
  const prefKey = getPrefKey(type);
  if (prefKey && prefs[prefKey] === false) {
    return NextResponse.json({ ok: false, reason: "preference_disabled" });
  }

  // Check daily notification limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { count } = await service
    .from("notification_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user_id)
    .gte("sent_at", today.toISOString());

  if ((count ?? 0) >= MAX_DAILY_NOTIFICATIONS) {
    return NextResponse.json({ ok: false, reason: "daily_limit_reached" });
  }

  // Get all subscriptions
  const { data: subscriptions } = await service
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user_id);

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: false, reason: "no_subscriptions" });
  }

  const payload = JSON.stringify({ title, body: notifBody, url, actions });
  const expiredIds: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
        await service
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 410 || statusCode === 404) {
          expiredIds.push(sub.id);
        }
      }
    })
  );

  // Remove expired subscriptions
  if (expiredIds.length) {
    await service.from("push_subscriptions").delete().in("id", expiredIds);
  }

  // Log notification
  if (sent > 0) {
    await service.from("notification_logs").insert({
      user_id,
      type,
      title,
      body: notifBody,
    });
  }

  return NextResponse.json({ ok: true, sent, expired_removed: expiredIds.length });
}

function getPrefKey(type: string): string | null {
  const map: Record<string, string> = {
    streak: "flames",
    plan: "plan_reminder",
    gospel: "gospel_approved",
    amen: "amen_received",
    verse: "verse_received",
    xp: "xp_level",
    prayer: "prayer_reminder",
  };
  return map[type] ?? null;
}
