// Supabase Edge Function: push-notify
// Sends Expo push notifications for high-priority accessibility reports.
//
// Invoked by the Postgres trigger `on_high_priority_report` (pg_net) with:
//   { type, place_id, place_name, note, submitter_id }
// Also callable from the client for a self emergency alert:
//   supabase.functions.invoke('push-notify', { body: { type: 'self_alert', submitter_id, message } })
//
// Env vars (Dashboard -> Edge Functions -> Secrets):
//   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushPayload {
  type: "high_priority_report" | "self_alert" | "disputed_status";
  place_id?: string;
  place_name?: string;
  note?: string;
  submitter_id?: string;
  message?: string;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound?: "default";
  data?: Record<string, unknown>;
  channelId?: string;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: PushPayload = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // bypasses RLS
    );

    const messages: ExpoPushMessage[] = [];

    // ---------------------------------------------------------------
    // Case 1: high-priority report -> users who saved the place
    // ---------------------------------------------------------------
    if (payload.type === "high_priority_report" && payload.place_id) {
      const { data: saves } = await supabase
        .from("user_saved_places")
        .select("user_id")
        .eq("place_id", payload.place_id);

      const userIds = (saves ?? []).map((s: { user_id: string }) => s.user_id);

      if (userIds.length > 0) {
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("expo_push_token")
          .in("user_id", userIds);

        for (const t of tokens ?? []) {
          messages.push({
            to: t.expo_push_token,
            title: "⚠️ Accessibility Alert",
            body: `High-priority issue reported at ${payload.place_name}: ${payload.note ?? "immediate barrier"}`,
            sound: "default",
            channelId: "alerts",
            data: { type: "high_priority_report", placeId: payload.place_id },
          });
        }
      }
    }

    // ---------------------------------------------------------------
    // Case 2: self emergency alert -> all devices on this account
    // ---------------------------------------------------------------
    if (payload.type === "self_alert" && payload.submitter_id) {
      const { data: tokens } = await supabase
        .from("push_tokens")
        .select("expo_push_token")
        .eq("user_id", payload.submitter_id);

      for (const t of tokens ?? []) {
        messages.push({
          to: t.expo_push_token,
          title: "🚨 Emergency Alert",
          body: payload.message ?? "Emergency alert from InclusiveMapper.",
          sound: "default",
          channelId: "alerts",
          data: { type: "self_alert" },
        });
      }
    }

    // ---------------------------------------------------------------
    // Case 3: verified place suddenly disputed -> savers + submitter
    // ---------------------------------------------------------------
    if (payload.type === "disputed_status" && payload.place_id) {
      const { data: saves } = await supabase
        .from("user_saved_places")
        .select("user_id")
        .eq("place_id", payload.place_id);

      const userIds = (saves ?? []).map((s: { user_id: string }) => s.user_id);
      if (payload.submitter_id) userIds.push(payload.submitter_id);

      if (userIds.length > 0) {
        const { data: tokens } = await supabase
          .from("push_tokens")
          .select("expo_push_token")
          .in("user_id", userIds);

        for (const t of tokens ?? []) {
          messages.push({
            to: t.expo_push_token,
            title: "❗ Verified Place Disputed",
            body: payload.message ?? `${payload.place_name} was flagged as inaccessible by multiple users.`,
            sound: "default",
            channelId: "alerts",
            data: { type: "disputed_status", placeId: payload.place_id },
          });
        }
      }
    }

    if (messages.length === 0) {
      return json({ ok: true, sent: 0, reason: "No matching push tokens" });
    }

    // Expo Push API accepts batches of up to 100 messages.
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept-encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    const result = await res.json();
    return json({ ok: true, sent: messages.length, expo: result });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
