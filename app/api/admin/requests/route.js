import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ADMIN_USERNAME = "Memed";
const LOGIN_DOMAIN = "sign.local";

function normalizeUsername(username) {
  return String(username || "").trim().slice(0, 50);
}

function getUsernameKey(username) {
  return normalizeUsername(username).toLowerCase();
}

function getLoginEmail(username) {
  const key = getUsernameKey(username).replace(/[^a-z0-9._-]/g, "-");
  return `${key || "user"}@${LOGIN_DOMAIN}`;
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

async function getAdminUser(req, adminClient) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";

  if (!token) {
    return { error: "Nicht eingeloggt.", status: 401 };
  }

  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    return { error: "Session ist ungueltig.", status: 401 };
  }

  const usernameKey = getUsernameKey(
    user.user_metadata?.sign_username || user.user_metadata?.display_name
  );
  const email = String(user.email || "").toLowerCase();

  const { data: appUser } = await adminClient
    .from("sign_app_users")
    .select("role,active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const isAdmin =
    appUser?.role === "admin" ||
    usernameKey === getUsernameKey(ADMIN_USERNAME) ||
    email === getLoginEmail(ADMIN_USERNAME);

  if (!isAdmin) {
    return { error: "Nur der Admin darf diese Seite nutzen.", status: 403 };
  }

  return { user };
}

async function createOrUpdateAuthUser(adminClient, username, password, role, authUserId) {
  const email = getLoginEmail(username);
  const metadata = {
    display_name: username,
    sign_username: username,
    role,
  };

  if (authUserId) {
    const { data, error } = await adminClient.auth.admin.updateUserById(
      authUserId,
      {
        password,
        user_metadata: metadata,
      }
    );

    if (error) throw error;
    return data.user;
  }

  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (!error) return data.user;

  if (!String(error.message || "").toLowerCase().includes("already")) {
    throw error;
  }

  return null;
}

export async function GET(req) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return Response.json(
      { error: "Admin-Client ist nicht konfiguriert." },
      { status: 500 }
    );
  }

  const admin = await getAdminUser(req, adminClient);

  if (admin.error) {
    return Response.json({ error: admin.error }, { status: admin.status });
  }

  const { data: users, error } = await adminClient
    .from("sign_app_users")
    .select("username_key,username,role,active,created_at,updated_at")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    requests: [],
    pendingRequests: [],
    users: users || [],
  });
}

export async function POST(req) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return Response.json(
      { error: "Admin-Client ist nicht konfiguriert." },
      { status: 500 }
    );
  }

  const admin = await getAdminUser(req, adminClient);

  if (admin.error) {
    return Response.json({ error: admin.error }, { status: admin.status });
  }

  const { action, username, password, role = "user" } = await req.json();
  const finalUsername = normalizeUsername(username);
  const usernameKey = getUsernameKey(finalUsername);

  if (!["create", "remove", "activate"].includes(action)) {
    return Response.json({ error: "Ungueltige Admin-Aktion." }, { status: 400 });
  }

  if (finalUsername.length < 2) {
    return Response.json({ error: "Benutzername fehlt." }, { status: 400 });
  }

  if (action === "create") {
    if (!password || password.length < 6) {
      return Response.json(
        { error: "Passwort muss mindestens 6 Zeichen haben." },
        { status: 400 }
      );
    }

    const existing = await adminClient
      .from("sign_app_users")
      .select("auth_user_id")
      .eq("username_key", usernameKey)
      .maybeSingle();

    const finalRole = role === "admin" ? "admin" : "user";
    const createdUser = await createOrUpdateAuthUser(
      adminClient,
      finalUsername,
      password,
      finalRole,
      existing.data?.auth_user_id || null
    );

    const authUserId = createdUser?.id || existing.data?.auth_user_id || null;

    const { error } = await adminClient.from("sign_app_users").upsert({
      username_key: usernameKey,
      username: finalUsername,
      auth_user_id: authUserId,
      role: finalRole,
      active: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    if (authUserId) {
      await adminClient.from("user_profiles").upsert({
        user_id: authUserId,
        email: getLoginEmail(finalUsername),
        display_name: finalUsername,
        display_name_key: usernameKey,
        updated_at: new Date().toISOString(),
      });
    }

    return Response.json({ ok: true });
  }

  const active = action === "activate";
  const { error } = await adminClient
    .from("sign_app_users")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("username_key", usernameKey);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
