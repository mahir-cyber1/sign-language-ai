import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getUser(req, adminClient) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : "";
  if (!token) return null;

  const {
    data: { user },
  } = await adminClient.auth.getUser(token);
  return user || null;
}

export async function GET(req) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return Response.json({ error: "Supabase fehlt." }, { status: 500 });
  }

  const user = await getUser(req, adminClient);
  if (!user) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { data, error } = await adminClient
    .from("error_training")
    .select("id,grade,language,original_task,correction,resolved,created_at")
    .eq("user_id", user.id)
    .eq("resolved", false)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ items: data || [] });
}

export async function POST(req) {
  const adminClient = getAdminClient();
  if (!adminClient || !process.env.OPENAI_API_KEY) {
    return Response.json({ error: "Dienst ist nicht konfiguriert." }, { status: 500 });
  }

  const user = await getUser(req, adminClient);
  if (!user) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { id } = await req.json();
  const { data: item, error } = await adminClient
    .from("error_training")
    .select("id,grade,language,original_task,correction")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !item) {
    return Response.json({ error: "Fehleraufgabe nicht gefunden." }, { status: 404 });
  }

  const languageNames = { de: "Deutsch", tr: "Türkisch", en: "Englisch" };
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: `Erstelle auf ${languageNames[item.language] || "Deutsch"} eine neue, ähnliche Übungsaufgabe für die ${item.grade || "4"}. Klasse.

Die neue Aufgabe soll dieselbe Fähigkeit trainieren, aber andere Zahlen, Wörter oder Beispiele verwenden.
Gib zuerst nur die Übungsaufgabe. Danach eine kurze Zeile "Tipp:".
Gib die Lösung noch nicht preis.

Ursprüngliche Aufgabe:
${item.original_task || "(aus einem Bild erkannt)"}

Korrektur und erkannter Lernbedarf:
${item.correction}`,
  });

  return Response.json({
    exercise: response.output_text || "Keine Übung erstellt.",
    sourceId: item.id,
  });
}

export async function PATCH(req) {
  const adminClient = getAdminClient();
  if (!adminClient) {
    return Response.json({ error: "Supabase fehlt." }, { status: 500 });
  }

  const user = await getUser(req, adminClient);
  if (!user) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { id } = await req.json();
  const { error } = await adminClient
    .from("error_training")
    .update({ resolved: true })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ success: true });
}
