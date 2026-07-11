"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getDeviceLanguage, setAppLanguage, useAppLanguage } from "../../lib/i18n";

const REMEMBERED_NAME_KEY = "sign-translate-last-username";
const LOGIN_TEXT = {
  de: {
    title: "Login",
    intro: "Melde dich mit deinem Namen und Passwort an. Neue Benutzer legt der Admin an.",
    name: "Name",
    password: "Passwort",
    wait: "Bitte warten...",
    submit: "Einloggen",
    checking: "Handy wird erkannt...",
    supabase: "Fehler: Supabase ist noch nicht konfiguriert.",
    failed: "Login fehlgeschlagen.",
    processed: "Login verarbeitet.",
    unknown: "Unbekannt",
  },
  en: {
    title: "Login",
    intro: "Sign in with your name and password. New users are created by the admin.",
    name: "Name",
    password: "Password",
    wait: "Please wait...",
    submit: "Log in",
    checking: "Checking this device...",
    supabase: "Error: Supabase is not configured yet.",
    failed: "Login failed.",
    processed: "Login processed.",
    unknown: "Unknown",
  },
  tr: {
    title: "Giriş",
    intro: "Adın ve şifrenle giriş yap. Yeni kullanıcıları admin oluşturur.",
    name: "Ad",
    password: "Şifre",
    wait: "Lütfen bekle...",
    submit: "Giriş yap",
    checking: "Telefon tanınıyor...",
    supabase: "Hata: Supabase henüz ayarlanmadı.",
    failed: "Giriş başarısız.",
    processed: "Giriş işlendi.",
    unknown: "Bilinmiyor",
  },
};

function isAdminUser(user) {
  const username = String(user?.user_metadata?.sign_username || "")
    .trim()
    .toLowerCase();
  const email = String(user?.email || "").trim().toLowerCase();

  return username === "memed" || email === "memed@sign.local";
}

export default function LoginPage() {
  const { language } = useAppLanguage();
  const tx = LOGIN_TEXT[language] || LOGIN_TEXT.de;
  const [displayName, setDisplayName] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(REMEMBERED_NAME_KEY) || "";
  });
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAppLanguage(getDeviceLanguage());

    if (!supabase) return;

    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;

        const user = data.session?.user;
        if (user) {
          window.location.replace(isAdminUser(user) ? "/admin" : "/gebaerdensprache");
          return;
        }

        setMessage("");
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin() {
    setLoading(true);
    setMessage("");

    try {
      if (!supabase) {
        setMessage(tx.supabase);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/password-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage("Fehler: " + (data?.error || tx.failed));
      } else if (data?.session) {
        const { error } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (error) {
          setMessage("Fehler: " + error.message);
        } else {
          window.localStorage.setItem(
            REMEMBERED_NAME_KEY,
            displayName.trim()
          );
          window.location.href =
            displayName.trim().toLowerCase() === "memed"
              ? "/admin"
              : "/gebaerdensprache";
        }
      } else {
        setMessage(data?.message || tx.processed);
      }
    } catch (error) {
      setMessage("Fehler: " + (error?.message || tx.unknown));
    }

    setLoading(false);
  }

  return (
    <main
      style={{
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        padding: 20,
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#0d1016",
        color: "white",
      }}
    >
      <h1 style={{ marginTop: 0 }}>{tx.title}</h1>

      <p style={{ color: "#b9c1cf", lineHeight: 1.5 }}>
        {tx.intro}
      </p>

      <input
        type="text"
        placeholder={tx.name}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        autoComplete="username"
        style={{
          width: "100%",
          padding: 14,
          fontSize: 18,
          borderRadius: 8,
          border: "1px solid #334052",
          marginBottom: 12,
          boxSizing: "border-box",
          background: "#111722",
          color: "white",
        }}
      />

      <input
        type="password"
        placeholder={tx.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        onKeyDown={(event) => {
          if (event.key === "Enter" && displayName && password.length >= 6) {
            handleLogin();
          }
        }}
        style={{
          width: "100%",
          padding: 14,
          fontSize: 18,
          borderRadius: 8,
          border: "1px solid #334052",
          marginBottom: 12,
          boxSizing: "border-box",
          background: "#111722",
          color: "white",
        }}
      />

      <button
        onClick={handleLogin}
        disabled={loading || !displayName.trim() || password.length < 6}
        style={{
          width: "100%",
          padding: 16,
          fontSize: 18,
          fontWeight: "bold",
          borderRadius: 8,
          border: "none",
          backgroundColor: "#1fb895",
          color: "#07100d",
        }}
      >
        {loading ? tx.wait : tx.submit}
      </button>

      {message && (
        <p
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#141924",
            border: "1px solid #28313d",
            color: "#dbe3ed",
          }}
        >
          {message}
        </p>
      )}
    </main>
  );
}
