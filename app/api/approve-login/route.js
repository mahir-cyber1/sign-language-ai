import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

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

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getDisplayNameKey(displayName) {
  return String(displayName || "").trim().toLowerCase();
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

function html(body) {
  return new Response(
    `<!doctype html>
    <html lang="de">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Login-Freigabe</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #111;
            color: white;
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          main {
            max-width: 430px;
            width: 100%;
            background: #1b1b1b;
            border: 1px solid #333;
            border-radius: 14px;
            padding: 20px;
          }
          a {
            color: white;
            display: inline-block;
            margin-top: 12px;
            background: #1976d2;
            padding: 12px 16px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <main>${body}</main>
      </body>
    </html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}

export async function GET(req) {
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return html("<h1>Fehler</h1><p>Freigabe-Token fehlt.</p>");
  }

  const adminClient = getAdminClient();

  if (!adminClient) {
    return html(
      "<h1>Fehler</h1><p>Supabase Service Role Key ist nicht konfiguriert.</p>"
    );
  }

  const { data: request, error: requestError } = await adminClient
    .from("login_access_requests")
    .select("email,status,display_name")
    .eq("token", token)
    .maybeSingle();

  if (requestError || !request) {
    return html("<h1>Fehler</h1><p>Dieser Freigabe-Link ist ungueltig.</p>");
  }

  const approvalPayload = {
    email: request.email,
    display_name: request.display_name,
    display_name_key: getDisplayNameKey(request.display_name),
  };

  const { error: approvalError } = await adminClient
    .from("approved_login_emails")
    .upsert(approvalPayload, { onConflict: "email" });

  if (isMissingDisplayNameKeyError(approvalError)) {
    delete approvalPayload.display_name_key;

    const { error: fallbackError } = await adminClient
      .from("approved_login_emails")
      .upsert(approvalPayload, { onConflict: "email" });

    if (fallbackError) {
      return html(`<h1>Fehler</h1><p>${fallbackError.message}</p>`);
    }
  } else if (approvalError) {
    return html(`<h1>Fehler</h1><p>${approvalError.message}</p>`);
  }

  const { error: updateError } = await adminClient
    .from("login_access_requests")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
    })
    .eq("token", token);

  if (updateError) {
    return html(`<h1>Fehler</h1><p>${updateError.message}</p>`);
  }

  const safeName = escapeHtml(request.display_name || request.email);
  const safeEmail = escapeHtml(request.email);

  return html(`
    <h1>Freigegeben</h1>
    <p><strong>${safeName}</strong> darf sich jetzt einloggen.</p>
    <p>${safeEmail}</p>
    <p>Die Person kann sich jetzt auf der Login-Seite mit E-Mail und Passwort einloggen.</p>
    <a href="/">Zur App</a>
  `);
}
