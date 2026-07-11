import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const EXTRA_ADMIN_EMAILS = ["genckurecikli@gmail.com"];

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAdminEmailAddress(email) {
  const normalizedEmail = normalizeEmail(email);
  const envAdminEmail = normalizeEmail(process.env.ADMIN_EMAIL);

  return (
    normalizedEmail &&
    (normalizedEmail === envAdminEmail ||
      EXTRA_ADMIN_EMAILS.includes(normalizedEmail))
  );
}

function normalizeDisplayName(displayName) {
  return String(displayName || "").trim().slice(0, 60);
}

function getDisplayNameKey(displayName) {
  return normalizeDisplayName(displayName).toLowerCase();
}

function isMissingDisplayNameKeyError(error) {
  const message = String(error?.message || "");

  return (
    message.includes("display_name_key") &&
    (message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("Could not find"))
  );
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function getPublicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function sendApprovalEmail({ email, displayName, approvalUrl }) {
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  const from =
    process.env.RESEND_FROM_EMAIL || "Homework Helper <onboarding@resend.dev>";

  if (!resendKey || !adminEmail) {
    return {
      sent: false,
      reason: "RESEND_API_KEY oder ADMIN_EMAIL fehlt.",
    };
  }

  const safeEmail = escapeHtml(email);
  const safeDisplayName = escapeHtml(displayName);
  const safeApprovalUrl = escapeHtml(approvalUrl);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: adminEmail,
      subject: "Neue Login-Freigabe fuer Homework Helper",
      html: `
        <h2>Neue Login-Anfrage</h2>
        <p>Diese Person moechte sich einloggen:</p>
        <p>Name: <strong>${safeDisplayName}</strong></p>
        <p><strong>${safeEmail}</strong></p>
        <p>
          <a href="${safeApprovalUrl}" style="display:inline-block;padding:12px 18px;background:#1976d2;color:white;text-decoration:none;border-radius:8px;">
            E-Mail freigeben
          </a>
        </p>
        <p>Falls der Button nicht funktioniert, diesen Link oeffnen:</p>
        <p>${safeApprovalUrl}</p>
      `,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    return { sent: false, reason: text };
  }

  return { sent: true };
}

export async function POST(req) {
  try {
    const { email, displayName, redirectTo } = await req.json();
    const normalizedEmail = normalizeEmail(email);
    const normalizedDisplayName = normalizeDisplayName(displayName);

    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      return Response.json(
        { error: "Bitte eine gueltige E-Mail-Adresse eingeben." },
        { status: 400 }
      );
    }

    if (normalizedDisplayName.length < 2) {
      return Response.json(
        { error: "Bitte Name oder Nickname eingeben." },
        { status: 400 }
      );
    }

    const adminClient = getAdminClient();
    const publicClient = getPublicClient();

    if (!adminClient || !publicClient) {
      return Response.json(
        { error: "Supabase ist noch nicht vollstaendig konfiguriert." },
        { status: 500 }
      );
    }

    const { data: approved, error: approvedError } = await adminClient
      .from("approved_login_emails")
      .select("email,display_name")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (approvedError) {
      return Response.json({ error: approvedError.message }, { status: 500 });
    }

    const isAdminEmail = isAdminEmailAddress(normalizedEmail);
    const loginAllowed = approved || isAdminEmail;

    if (isAdminEmail && !approved) {
      const approvalPayload = {
        email: normalizedEmail,
        display_name: normalizedDisplayName,
        display_name_key: getDisplayNameKey(normalizedDisplayName),
      };

      const { error: adminApprovalError } = await adminClient
        .from("approved_login_emails")
        .upsert(approvalPayload, { onConflict: "email" });

      if (isMissingDisplayNameKeyError(adminApprovalError)) {
        delete approvalPayload.display_name_key;
        await adminClient
          .from("approved_login_emails")
          .upsert(approvalPayload, { onConflict: "email" });
      }
    }

    if (loginAllowed) {
      const { error } = await publicClient.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: redirectTo || process.env.NEXT_PUBLIC_SITE_URL,
          shouldCreateUser: true,
          data: {
            display_name: approved?.display_name || normalizedDisplayName,
          },
        },
      });

      if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      }

      return Response.json({
        message: "Login-Link wurde gesendet. Bitte E-Mail pruefen.",
      });
    }

    const token = randomBytes(32).toString("hex");
    const origin =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.headers.get("origin") ||
      new URL(req.url).origin;
    const approvalUrl = `${origin}/api/approve-login?token=${token}`;

    const requestPayload = {
      email: normalizedEmail,
      display_name: normalizedDisplayName,
      display_name_key: getDisplayNameKey(normalizedDisplayName),
      token,
      status: "pending",
      requested_at: new Date().toISOString(),
      approved_at: null,
    };

    const { error: requestError } = await adminClient
      .from("login_access_requests")
      .upsert(requestPayload, { onConflict: "email" });

    if (isMissingDisplayNameKeyError(requestError)) {
      delete requestPayload.display_name_key;

      const { error: fallbackError } = await adminClient
        .from("login_access_requests")
        .upsert(requestPayload, { onConflict: "email" });

      if (fallbackError) {
        return Response.json({ error: fallbackError.message }, { status: 500 });
      }
    } else if (requestError) {
      return Response.json({ error: requestError.message }, { status: 500 });
    }

    const mailResult = await sendApprovalEmail({
      email: normalizedEmail,
      displayName: normalizedDisplayName,
      approvalUrl,
    });

    if (!mailResult.sent) {
      console.error("Approval email failed:", mailResult.reason);

      return Response.json(
        {
          error:
            "Login-Anfrage wurde gespeichert, aber die Freigabe-Mail konnte nicht gesendet werden. Bitte Resend- und Vercel-Einstellungen pruefen.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      message:
        "Deine Login-Anfrage wurde gesendet. Nach Freigabe bekommst du beim naechsten Versuch den Login-Link.",
    });
  } catch (error) {
    return Response.json(
      { error: String(error?.message || error) },
      { status: 500 }
    );
  }
}
