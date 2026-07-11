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

function getAllowedEmails() {
  return String(process.env.SIGN_TRANSLATE_ALLOWED_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

async function getUser(req, adminClient) {
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

  const allowedEmails = getAllowedEmails();
  const email = String(user.email || "").trim().toLowerCase();

  if (allowedEmails.length > 0 && !allowedEmails.includes(email)) {
    return { error: "Diese Testversion ist nur fuer freigegebene Personen.", status: 403 };
  }

  return { user };
}

function normalizeFeatures(features) {
  if (!Array.isArray(features)) return [];

  return features
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .slice(0, 12000);
}

export async function GET(req) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return Response.json({ error: "Supabase fehlt." }, { status: 500 });
  }

  const auth = await getUser(req, adminClient);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const { data, error } = await adminClient
    .from("sign_training_examples")
    .select("id,text,features,duration_ms,created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    items: (data || []).map((item) => ({
      id: item.id,
      text: item.text,
      features: item.features || [],
      durationMs: item.duration_ms || 0,
      createdAt: item.created_at,
      remote: true,
    })),
  });
}

export async function POST(req) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return Response.json({ error: "Supabase fehlt." }, { status: 500 });
  }

  const auth = await getUser(req, adminClient);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json();
  const text = String(body.text || "").trim();
  const features = normalizeFeatures(body.features);
  const durationMs = Math.max(0, Math.round(Number(body.durationMs) || 0));

  if (!text || features.length === 0) {
    return Response.json(
      { error: "Text und Bewegungsdaten fehlen." },
      { status: 400 }
    );
  }

  const { data, error } = await adminClient
    .from("sign_training_examples")
    .insert({
      user_id: auth.user.id,
      email: auth.user.email,
      text,
      features,
      duration_ms: durationMs,
      source: "webcam-correction",
    })
    .select("id,text,features,duration_ms,created_at")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    item: {
      id: data.id,
      text: data.text,
      features: data.features || [],
      durationMs: data.duration_ms || 0,
      createdAt: data.created_at,
      remote: true,
    },
  });
}

export async function DELETE(req) {
  const adminClient = getAdminClient();

  if (!adminClient) {
    return Response.json({ error: "Supabase fehlt." }, { status: 500 });
  }

  const auth = await getUser(req, adminClient);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const body = await req.json().catch(() => ({}));
  const ids = Array.isArray(body.ids)
    ? body.ids
        .map((id) => String(id || "").trim())
        .filter(Boolean)
        .slice(0, 120)
    : [];

  if (!ids.length) {
    return Response.json(
      { error: "Keine Trainingsbeispiele ausgewählt." },
      { status: 400 }
    );
  }

  const { error } = await adminClient
    .from("sign_training_examples")
    .delete()
    .eq("user_id", auth.user.id)
    .in("id", ids);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ deletedIds: ids });
}
