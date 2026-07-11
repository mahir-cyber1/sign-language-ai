import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ADMIN_USERNAME = "Memed";
const ADMIN_PASSWORD = "Ferdi4434";
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

async function ensureAdminUser(adminClient) {
  const usernameKey = getUsernameKey(ADMIN_USERNAME);
  const email = getLoginEmail(ADMIN_USERNAME);

  const { data: existing } = await adminClient
    .from("sign_app_users")
    .select("username_key,auth_user_id")
    .eq("username_key", usernameKey)
    .maybeSingle();

  if (existing?.auth_user_id) {
    await adminClient.from("sign_app_users").upsert({
      username_key: usernameKey,
      username: ADMIN_USERNAME,
      auth_user_id: existing.auth_user_id,
      role: "admin",
      active: true,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  const { data: created, error: createError } =
    await adminClient.auth.admin.createUser({
      email,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        display_name: ADMIN_USERNAME,
        sign_username: ADMIN_USERNAME,
        role: "admin",
      },
    });

  if (createError && !String(createError.message || "").includes("already")) {
    throw createError;
  }

  await adminClient.from("sign_app_users").upsert({
    username_key: usernameKey,
    username: ADMIN_USERNAME,
    auth_user_id: created?.user?.id || existing?.auth_user_id || null,
    role: "admin",
    active: true,
    updated_at: new Date().toISOString(),
  });
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { displayName, username, password } = body;
    const finalUsername = normalizeUsername(username || displayName);
    const usernameKey = getUsernameKey(finalUsername);

    if (finalUsername.length < 2) {
      return Response.json(
        { error: "Bitte Name oder Benutzername eingeben." },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return Response.json(
        { error: "Das Passwort muss mindestens 6 Zeichen haben." },
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

    await ensureAdminUser(adminClient);

    const { data: appUser, error: appUserError } = await adminClient
      .from("sign_app_users")
      .select("username,username_key,auth_user_id,role,active")
      .eq("username_key", usernameKey)
      .maybeSingle();

    if (appUserError) {
      return Response.json({ error: appUserError.message }, { status: 500 });
    }

    if (!appUser || !appUser.active) {
      return Response.json(
        { error: "Dieser Benutzer ist nicht freigegeben." },
        { status: 403 }
      );
    }

    const email = getLoginEmail(appUser.username);
    const signInResult = await publicClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInResult.error || !signInResult.data.session) {
      return Response.json(
        { error: "Name oder Passwort ist falsch." },
        { status: 401 }
      );
    }

    const authUser = signInResult.data.user;
    const now = new Date().toISOString();

    if (!appUser.auth_user_id) {
      await adminClient
        .from("sign_app_users")
        .update({ auth_user_id: authUser.id, updated_at: now })
        .eq("username_key", usernameKey);
    }

    await adminClient.from("user_profiles").upsert({
      user_id: authUser.id,
      email,
      display_name: appUser.username,
      display_name_key: usernameKey,
      updated_at: now,
    });

    return Response.json({
      message: "Login erfolgreich.",
      session: signInResult.data.session,
    });
  } catch (error) {
    return Response.json(
      { error: String(error?.message || error) },
      { status: 500 }
    );
  }
}
