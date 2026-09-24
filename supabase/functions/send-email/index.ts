// Supabase Edge Function: send-email
// Tier 3 emails: account exports, emergency alerts, monthly digests, test.
//
// Flow: client inserts a row into public.email_requests (RLS: own rows only),
// then invokes this function. It reads PENDING rows for that user via the
// service role (bypasses RLS), renders an HTML template, and dispatches
// via Brevo's transactional email API (https://developers.brevo.com).
//
// Env vars (Dashboard -> Edge Functions -> Secrets):
//   BREVO_API_KEY      - from app.brevo.com -> SMTP & API -> API Keys (required)
//                        Must be an "xkeysib-..." REST key, not "xsmtpsib-...".
//   EMAIL_FROM         - verified sender address, e.g. "noreply@yourdomain.com" (required)
//                        (a "Name <email>" value is also accepted and parsed)
//   EMAIL_SENDER_NAME  - display name, e.g. "InclusiveMapper" (optional, defaults to InclusiveMapper)
//
// Note: the sender address must be a verified sender in Brevo
// (app.brevo.com -> Senders & IP). For quick testing you can verify the
// email you signed up with.
//
// Deploy: supabase functions deploy send-email
// Secrets: supabase secrets set BREVO_API_KEY=... EMAIL_FROM=...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

/** Extract the bare address from "user@x.com" or 'Name <user@x.com>'. */
function parseEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const angled = raw.match(/<([^>]+)>/);
  const addr = (angled ? angled[1] : raw).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr) ? addr.toLowerCase() : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Fail fast with a CLEAR error when secrets are missing instead of a
    // cryptic Brevo 401 later.
    const brevoApiKey = Deno.env.get("BREVO_API_KEY")?.trim();
    const fromEmail = parseEmail(Deno.env.get("EMAIL_FROM")?.trim());
    const senderName = Deno.env.get("EMAIL_SENDER_NAME")?.trim() ?? "InclusiveMapper";

    const missing: string[] = [];
    if (!brevoApiKey) missing.push("BREVO_API_KEY");
    if (!fromEmail) missing.push("EMAIL_FROM");
    if (missing.length > 0) {
      return json(
        {
          ok: false,
          error:
            `Missing Edge Function secrets: ${missing.join(", ")}. ` +
            `Set them with: supabase secrets set BREVO_API_KEY=... EMAIL_FROM=... ` +
            `(Dashboard -> Edge Functions -> Secrets also works), then redeploy.`,
        },
        500,
      );
    }

    if (brevoApiKey.startsWith("xsmtpsib-")) {
      return json(
        {
          ok: false,
          error:
            `Invalid BREVO_API_KEY: You provided an SMTP key ('xsmtpsib-...'). ` +
            `The Brevo REST API requires an API key ('xkeysib-...'). ` +
            `Go to https://app.brevo.com -> SMTP & API -> API Keys -> 'Generate a new API key', ` +
            `and set BREVO_API_KEY with that key.`,
        },
        400,
      );
    }

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
      return json({ ok: false, error: "Unauthorized: no valid session. Sign in and try again." }, 401);
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
      return json({ ok: false, error: `DB error: ${error.message}` }, 500);
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

    // Anti-abuse: only allow delivering to the authenticated account's own
    // address (never an arbitrary to_email from the client).
    const ownAddresses = new Set(
      [user.email, profile?.email].filter(Boolean).map((e) => String(e).toLowerCase()),
    );

    let sent = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const requested = parseEmail(row.to_email);
      const fallback = parseEmail(user.email) ?? parseEmail(profile?.email);
      const to = requested && ownAddresses.has(requested) ? requested : fallback;
      if (!to) {
        const msg = `No valid recipient for request ${row.id} (to_email=${row.to_email ?? "null"})`;
        errors.push(msg);
        await supabase.from("email_requests").update({ status: "failed", error: msg }).eq("id", row.id);
        continue;
      }

      const rendered = renderEmail(row, profile ?? {});

      let res: Response;
      try {
        res = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({
            sender: { name: senderName, email: fromEmail },
            to: [{ email: to }],
            subject: rendered.subject,
            htmlContent: rendered.html,
          }),
        });
      } catch (fetchErr) {
        const msg = `Brevo network error: ${String(fetchErr)}`;
        errors.push(msg);
        await supabase.from("email_requests").update({ status: "failed", error: msg.slice(0, 500) }).eq("id", row.id);
        continue;
      }

      if (res.ok) {
        sent++;
        await supabase
          .from("email_requests")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", row.id);
      } else {
        const errText = await res.text();
        const friendly = brevoErrorHint(res.status, errText);
        errors.push(`Brevo ${res.status}: ${friendly}`);
        await supabase
          .from("email_requests")
          .update({ status: "failed", error: `Brevo ${res.status}: ${errText.slice(0, 400)}` })
          .eq("id", row.id);
      }
    }

    return json(
      {
        ok: errors.length === 0,
        sent,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
      },
      errors.length > 0 && sent === 0 ? 400 : 200,
    );
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});

/** Turn common Brevo API errors into actionable hints. */
function brevoErrorHint(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401) {
    return "invalid or missing BREVO_API_KEY. Generate a v3 key at app.brevo.com -> SMTP & API -> API Keys.";
  }
  if (status === 403 && lower.includes("sender")) {
    return "sender not verified. Verify EMAIL_FROM at app.brevo.com -> Senders & IP, or use a verified sender address.";
  }
  if (status === 400 && (lower.includes("sender") || lower.includes("invalid email"))) {
    return "rejected sender/recipient. Confirm EMAIL_FROM is a verified Brevo sender and the recipient address is valid.";
  }
  if (status === 429) {
    return "rate limit reached (300 emails/day on the free plan). Wait or upgrade in Brevo.";
  }
  return body.slice(0, 300);
}

// ---------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------
function emergencyTemplate(name: string, brand: string, message: string, triggeredAt: string): RenderedEmail {
  return {
    subject: "🚨 InclusiveMapper Emergency Alert",
    html: wrap(
      brand,
      `<h2>Hi ${esc(name)}, this is an emergency alert</h2>
       <p><strong>${esc(message)}</strong></p>
       <p>Open the InclusiveMapper app and review your saved places right away.</p>
       <p style="color:#64748B;font-size:12px">Triggered at ${esc(triggeredAt)}</p>`,
    ),
  };
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  verified: { bg: "#DCFCE7", color: "#16A34A", label: "Verified accessible" },
  pending: { bg: "#FEF3C7", color: "#D97706", label: "Pending review" },
  disputed: { bg: "#FEE2E2", color: "#DC2626", label: "Disputed" },
};

function statusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}

/** Welcome / app-idea email — introduces the four roles + SDG alignment. */
function welcomeTemplate(name: string, brand: string): RenderedEmail {
  const appLink = "https://expo.dev";
  return {
    subject: "Welcome to InclusiveMapper — map accessibility together",
    html: wrap(
      brand,
      `<div style="display:inline-block;background:#FFF1EC;color:#FF5A36;font-size:11px;font-weight:800;letter-spacing:1px;padding:6px 10px;border-radius:999px;text-transform:uppercase">Welcome aboard</div>
       <h2 style="margin:14px 0 8px;font-size:22px;line-height:1.3;color:#0F172A">Hi ${esc(name)}, glad you're here 👋</h2>
       <p style="margin:0;color:#475569;font-size:14px;line-height:1.65">
         Official accessibility info is often rare, outdated, or missing.
         InclusiveMapper turns every visit into shared, trustworthy knowledge
         so people with disabilities and their caregivers can decide with confidence.
       </p>

       <p style="margin:22px 0 10px;font-size:11px;font-weight:800;letter-spacing:1px;color:#94A3B8;text-transform:uppercase">Four ways to contribute</p>

       <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin-bottom:10px">
         <div style="font-weight:800;font-size:14px;color:#0F172A">🔍 Discover</div>
         <div style="font-size:13px;color:#64748B;margin-top:4px;line-height:1.5">Search places that are genuinely step-free, ramped, and accessible.</div>
       </div>
       <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin-bottom:10px">
         <div style="font-weight:800;font-size:14px;color:#0F172A">📝 Report</div>
         <div style="font-size:13px;color:#64748B;margin-top:4px;line-height:1.5">Submit what you observe — ramps, elevators, restrooms, entrances.</div>
       </div>
       <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px;margin-bottom:10px">
         <div style="font-weight:800;font-size:14px;color:#0F172A">✅ Verify</div>
         <div style="font-size:13px;color:#64748B;margin-top:4px;line-height:1.5">Confirm or dispute reports so status labels stay accurate.</div>
       </div>
       <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px">
         <div style="font-weight:800;font-size:14px;color:#0F172A">🔔 Stay alerted</div>
         <div style="font-size:13px;color:#64748B;margin-top:4px;line-height:1.5">Save places and get status alerts when accessibility changes.</div>
       </div>

       <div style="margin:18px 0;background:#FFF1EC;border-radius:12px;padding:16px;border:1px solid #FFE0D6">
         <div style="font-size:13px;font-weight:800;color:#0F172A;margin-bottom:6px">Aligned with global goals</div>
         <div style="font-size:13px;color:#475569;line-height:1.7">
           <strong style="color:#FF5A36">SDG 10</strong> — Reduced Inequalities<br/>
           <strong style="color:#FF5A36">SDG 11</strong> — Sustainable Cities and Communities
         </div>
       </div>

       <p style="text-align:center;margin:20px 0 4px">
         <a href="${appLink}" style="display:inline-block;background:${brand};color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 28px;border-radius:999px">Open InclusiveMapper</a>
       </p>
       <p style="text-align:center;font-size:12px;color:#94A3B8;margin:8px 0 0">
         Save a place · Submit your first report · Help someone navigate with confidence
       </p>`,
      "You are receiving this because you created an InclusiveMapper account. Together we map accessibility that official sources miss.",
    ),
  };
}

/** Saved-place accessibility status change email. */
function placeUpdateTemplate(
  name: string,
  brand: string,
  payload: Record<string, unknown>,
): RenderedEmail {
  const placeName = String(payload.place_name ?? "Your saved place");
  const placeAddress = String(payload.address ?? "Community reported location");
  const newStatus = String(payload.new_status ?? "pending");
  const oldStatus = String(payload.old_status ?? "unknown");
  const style = statusStyle(newStatus);
  const oldStyle = statusStyle(oldStatus);
  const confirmCount = Number(payload.confirm_count ?? 0);
  const disputeCount = Number(payload.dispute_count ?? 0);
  const message =
    String(payload.message ?? "") ||
    `${placeName} is now marked ${style.label}.`;

  return {
    subject: `Accessibility update: ${placeName} is now ${style.label}`,
    html: wrap(
      brand,
      `<h2 style="margin:0 0 8px;font-size:20px;line-height:1.3;color:#0F172A">Hi ${esc(name)}, a saved place changed</h2>
       <p style="margin:0;color:#475569;font-size:14px;line-height:1.65">
         The community re-checked accessibility at one of your saved places.
         Here is the latest verified status.
       </p>

       <div style="margin:16px 0;border:1px solid #E2E8F0;border-radius:14px;overflow:hidden">
         <div style="background:#F8FAFC;padding:16px 18px;border-bottom:1px solid #E2E8F0">
           <div style="font-size:16px;font-weight:800;color:#0F172A">${esc(placeName)}</div>
           <div style="font-size:13px;color:#64748B;margin-top:3px">${esc(placeAddress)}</div>
         </div>
         <div style="padding:16px 18px">
           <div>
             <span style="display:inline-block;font-size:11px;font-weight:800;letter-spacing:0.5px;padding:6px 12px;border-radius:999px;background:${style.bg};color:${style.color};text-transform:uppercase">${esc(style.label)}</span>
             <span style="font-size:12px;color:#94A3B8;margin-left:8px">was ${esc(oldStyle.label)}</span>
           </div>
           <p style="margin:14px 0 0;font-size:14px;color:#334155;line-height:1.6">${esc(message)}</p>
           <div style="margin-top:14px;font-size:12px;color:#64748B">
             👍 ${confirmCount} confirms &nbsp;·&nbsp; 👎 ${disputeCount} disputes
           </div>
         </div>
       </div>

       <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:14px 16px">
         <div style="font-size:11px;font-weight:800;letter-spacing:1px;color:#94A3B8;text-transform:uppercase;margin-bottom:8px">Why this matters</div>
         <p style="margin:0;font-size:13px;color:#475569;line-height:1.6">
           Reliable place status helps people with disabilities and caregivers plan
           trips without surprises — ramps, elevators, restrooms, and step-free
           entrances that match reality.
         </p>
       </div>

       <p style="text-align:center;margin:20px 0 4px">
         <a href="https://expo.dev" style="display:inline-block;background:${brand};color:#fff;text-decoration:none;font-weight:800;font-size:15px;padding:14px 28px;border-radius:999px">View place in app</a>
       </p>
       <p style="text-align:center;font-size:12px;color:#94A3B8;margin:8px 0 0">Open your Inbox for the full alert history</p>`,
      "Status labels are community-maintained: verified · pending · disputed. Supporting SDG 10 and SDG 11 through shared accessibility knowledge.",
    ),
  };
}

function renderEmail(
  row: EmailRequestRow,
  profile: { name?: string; points?: number; audits_count?: number; level?: string },
): RenderedEmail {
  const name = profile.name ?? "there";
  const brand = "#FF5A36";

  switch (row.kind) {
    case "welcome": {
      return welcomeTemplate(name, brand);
    }

    case "place_update": {
      return placeUpdateTemplate(name, brand, row.payload ?? {});
    }

    case "emergency_alert": {
      return emergencyTemplate(
        name,
        brand,
        String(row.payload?.message ?? "Check your saved places for newly reported barriers."),
        String(row.payload?.triggered_at ?? new Date().toISOString()),
      );
    }

    case "account_export": {
      // Legacy rows: emergency alerts used to reuse account_export with a
      // payload flag — keep rendering the SOS template for those.
      if (row.payload?.type === "emergency_alert") {
        return emergencyTemplate(
          name,
          brand,
          String(row.payload?.message ?? "Check your saved places for newly reported barriers."),
          String(row.payload?.triggered_at ?? ""),
        );
      }

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

function wrap(brand: string, inner: string, footer?: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F1F4F9;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
  <div style="max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0">
    <div style="background:${brand};padding:20px 24px">
      <span style="color:#fff;font-size:18px;font-weight:800">Inclusive<span style="color:#FFF1EC">Mapper</span></span>
    </div>
    <div style="padding:24px;color:#0F172A;font-size:14px;line-height:1.6">${inner}</div>
    <div style="padding:16px 24px;background:#F4F6FA;color:#64748B;font-size:11px">
      ${footer ?? "You are receiving this because of your InclusiveMapper account activity."}
    </div>
  </div></body></html>`;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
