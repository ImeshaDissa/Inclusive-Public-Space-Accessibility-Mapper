// Supabase Edge Function: send-email
// Tier 3 emails: account exports, monthly digests, test.
//
// Flow: client inserts a row into public.email_requests (RLS: own rows only),
// then invokes this function. It reads PENDING rows for that user via the
// service role (bypasses RLS), renders an HTML template, and dispatches
// via Resend (swap the fetch call for SendGrid if preferred).
//
// Env vars (Dashboard -> Edge Functions -> Secrets):
//   RESEND_API_KEY - from resend.com (required)
//   EMAIL_FROM     - e.g. "InclusiveMapper <noreply@yourdomain.com>" (required)
//
// Deploy: supabase functions deploy send-email

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface EmailRequestRow {
  id: string;
  user_id: string | null;
  kind: string;
  to_email: string | null;
  payload: Record<string, unknown>;
}

interface RenderedEmail {
  subject: string;
  html: string;
}

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get("Authorization") ?? "";

    // Client identity: forward the caller's JWT so we know whose emails to send.
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: authData } = await supabaseAnon.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch this user's pending email requests.
    const { data: requests, error } = await supabase
      .from("email_requests")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      return json({ ok: false, error: error.message }, 500);
    }

    const rows = (requests ?? []) as EmailRequestRow[];
    if (rows.length === 0) {
      return json({ ok: true, sent: 0, reason: "No pending email requests" });
    }

    // Profile data used by templates (points, level, saved places count).
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email, points, audits_count, level")
      .eq("id", user.id)
      .single();

    let sent = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const to = row.to_email ?? profile?.email ?? user.email;
      if (!to) continue;

      const rendered = renderEmail(row, profile ?? {});
      const toEmail = to.includes("<") ? to.match(/<(.+)>/)?.[1] ?? to : to;

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM"),
          to: [toEmail],
          subject: rendered.subject,
          html: rendered.html,
        }),
      });

      if (res.ok) {
        sent++;
        await supabase
          .from("email_requests")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
      } else {
        const errText = await res.text();
        errors.push(errText);
        await supabase
          .from("email_requests")
          .update({ status: "failed", error: errText.slice(0, 500) })
          .eq("id", row.id);
      }
    }

    return json({ ok: true, sent, errors });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});

// ---------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------
function renderEmail(
  row: EmailRequestRow,
  profile: { name?: string; points?: number; audits_count?: number; level?: string },
): RenderedEmail {
  const name = profile.name ?? "there";
  const brand = "#FF5A36";

  switch (row.kind) {
    case "account_export": {
      const places = (row.payload?.savedPlaces ?? []) as Array<{ name: string; address: string; status: string }>;
      const listHtml = places.length
        ? places
            .map(
              (p) =>
                `<li><strong>${esc(p.name)}</strong> — ${esc(p.address)} <em>(${esc(p.status)})</em></li>`,
            )
            .join("")
        : "<li>No saved places yet</li>";

      return {
        subject: "Your InclusiveMapper data export",
        html: wrap(
          brand,
          `<h2>Hi ${esc(name)}, here is your data export</h2>
           <p><strong>Community points:</strong> ${profile.points ?? 0} · <strong>Level:</strong> ${esc(profile.level ?? "Bronze Mapper")}</p>
           <h3>Saved places</h3>
           <ul>${listHtml}</ul>`,
        ),
      };
    }

    case "monthly_digest": {
      return {
        subject: "Your monthly InclusiveMapper impact summary",
        html: wrap(
          brand,
          `<h2>Great work this month, ${esc(name)}!</h2>
           <p>Your accessibility reports helped the community:</p>
           <ul>
             <li><strong>${profile.audits_count ?? 0}</strong> total audits submitted</li>
             <li><strong>${profile.points ?? 0}</strong> community points earned</li>
             <li>Current level: <strong>${esc(profile.level ?? "Bronze Mapper")}</strong></li>
           </ul>
           <p>Keep mapping — every audit makes the city more navigable.</p>`,
        ),
      };
    }

    case "test":
    default:
      return {
        subject: "InclusiveMapper test email",
        html: wrap(brand, `<h2>Hi ${esc(name)} 👋</h2><p>Email delivery is working correctly.</p>`),
      };
  }
}

function wrap(brand: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F1F4F9;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0">
    <div style="background:${brand};padding:20px 24px">
      <span style="color:#fff;font-size:18px;font-weight:800">Inclusive<span style="color:#FFF1EC">Mapper</span></span>
    </div>
    <div style="padding:24px;color:#0F172A;font-size:14px;line-height:1.6">${inner}</div>
    <div style="padding:16px 24px;background:#F4F6FA;color:#64748B;font-size:11px">
      You are receiving this because of your InclusiveMapper account activity.
    </div>
  </div></body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
