import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const EXTRA_ADMIN_EMAILS = ["genckurecikli@gmail.com"];

function normalizeInput(value) {
  return String(value || "").trim();
}

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

async function resolveEmail(adminClient, loginId) {
  if (loginId.includes("@")) {
    return normalizeEmail(loginId);
  }

  const { data: profiles, error } = await adminClient
    .from("user_profiles")
    .select("email")
    .ilike("display_name", loginId)
    .limit(2);

  if (error) {
    return { error: error.message };
  }

  if (profiles?.length === 1) {
    return normalizeEmail(profiles[0].email);
  }

  const { data: approved, error: approvedError } = await adminClient
    .from("approved_login_emails")
    .select("email")
    .ilike("display_name", loginId)
    .limit(2);

  if (approvedError) {
    return { error: approvedError.message };
  }

  if (approved?.length === 1) {
    return normalizeEmail(approved[0].email);
  }

  if ((profiles?.length || 0) + (approved?.length || 0) > 1) {
    return {
      error:
        "Dieser Name ist nicht eindeutig. Bitte gib deine E-Mail-Adresse ein.",
    };
  }

  return {
    error:
      "Kein Nutzer mit diesem Namen gefunden. Bitte gib deine E-Mail-Adresse ein.",
  };
}

export async function POST(req) {
  try {
    const { loginId } = await req.json();
    const normalizedLoginId = normalizeInput(loginId);

    if (normalizedLoginId.length < 2) {
      return Response.json(
        { error: "Bitte E-Mail-Adresse oder Name eingeben." },
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

    const resolvedEmail = await resolveEmail(adminClient, normalizedLoginId);

    if (typeof resolvedEmail !== "string") {
      return Response.json({ error: resolvedEmail.error }, { status: 400 });
    }

    const { data: approved, error: approvedError } = await adminClient
      .from("approved_login_emails")
      .select("email")
      .eq("email", resolvedEmail)
      .maybeSingle();

    if (approvedError) {
      return Response.json({ error: approvedError.message }, { status: 500 });
    }

    const isAdminEmail = isAdminEmailAddress(resolvedEmail);

    if (!approved && !isAdminEmail) {
      return Response.json(
        {
          error:
            "Diese E-Mail ist noch nicht freigegeben. Bitte zuerst Login-Anfrage senden.",
        },
        { status: 403 }
      );
    }

    const redirectTo = `${
      process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    }/reset-password`;

    const { error } = await publicClient.auth.resetPasswordForEmail(
      resolvedEmail,
      { redirectTo }
    );

    if (error) {
      const message = error.message?.toLowerCase().includes("rate limit")
        ? "Zu viele E-Mails in kurzer Zeit. Bitte warte ein paar Minuten und versuche es dann erneut."
        : error.message;

      return Response.json({ error: message }, { status: 500 });
    }

    return Response.json({
      message:
        "Wenn ein Konto existiert, wurde ein Link zum Zuruecksetzen des Passworts gesendet.",
    });
  } catch (error) {
    return Response.json(
      { error: String(error?.message || error) },
      { status: 500 }
    );
  }
}
