"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { text, useAppLanguage } from "../../lib/i18n";

const RESET_TEXT = {
  de: { title: "Neues Passwort", intro: "Erstelle ein neues Passwort für dein Konto.", password: "Neues Passwort", repeat: "Passwort wiederholen", wait: "Bitte warten...", save: "Passwort speichern", back: "Zurück zum Login", supabase: "Supabase ist noch nicht konfiguriert.", short: "Das Passwort muss mindestens 6 Zeichen haben.", mismatch: "Die Passwörter stimmen nicht überein.", success: "Passwort wurde gespeichert. Du kannst dich jetzt einloggen." },
  en: { title: "New password", intro: "Create a new password for your account.", password: "New password", repeat: "Repeat password", wait: "Please wait...", save: "Save password", back: "Back to login", supabase: "Supabase is not configured yet.", short: "The password must contain at least 6 characters.", mismatch: "The passwords do not match.", success: "Password saved. You can now log in." },
  tr: { title: "Yeni şifre", intro: "Hesabın için yeni bir şifre oluştur.", password: "Yeni şifre", repeat: "Şifreyi tekrarla", wait: "Lütfen bekle...", save: "Şifreyi kaydet", back: "Girişe dön", supabase: "Supabase henüz yapılandırılmadı.", short: "Şifre en az 6 karakter olmalıdır.", mismatch: "Şifreler eşleşmiyor.", success: "Şifre kaydedildi. Şimdi giriş yapabilirsin." },
};

export default function ResetPasswordPage() {
  const { language } = useAppLanguage();
  const tx = text(RESET_TEXT, language);
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function initSession() {
      if (!supabase) {
        setMessage(tx.supabase);
        setReady(true);
        return;
      }

      const hash = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      const code = query.get("code");
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          setMessage("Fehler: " + error.message);
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage("Fehler: " + error.message);
        }
      }

      setReady(true);
    }

    initSession();
  }, [tx.supabase]);

  async function handleUpdatePassword() {
    setLoading(true);
    setMessage("");

    if (!supabase) {
      setMessage(`Fehler: ${tx.supabase}`);
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage(tx.short);
      setLoading(false);
      return;
    }

    if (password !== repeatPassword) {
      setMessage(tx.mismatch);
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage("Fehler: " + error.message);
    } else {
      setMessage(tx.success);
      await supabase.auth.signOut();
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
        backgroundColor: "#111",
        color: "white",
      }}
    >
      <h1>{tx.title}</h1>

      <p>{tx.intro}</p>

      <input
        type="password"
        placeholder={tx.password}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{
          width: "100%",
          padding: 14,
          fontSize: 18,
          borderRadius: 12,
          border: "1px solid #444",
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />

      <input
        type="password"
        placeholder={tx.repeat}
        value={repeatPassword}
        onChange={(e) => setRepeatPassword(e.target.value)}
        style={{
          width: "100%",
          padding: 14,
          fontSize: 18,
          borderRadius: 12,
          border: "1px solid #444",
          marginBottom: 12,
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={handleUpdatePassword}
        disabled={loading || !ready}
        style={{
          width: "100%",
          padding: 16,
          fontSize: 18,
          fontWeight: "bold",
          borderRadius: 14,
          border: "none",
          backgroundColor: "#1976d2",
          color: "white",
        }}
      >
        {loading ? tx.wait : tx.save}
      </button>

      <button
        onClick={() => {
          window.location.href = "/login";
        }}
        style={{
          width: "100%",
          padding: 12,
          fontSize: 16,
          fontWeight: "bold",
          borderRadius: 12,
          border: "1px solid #444",
          backgroundColor: "#222",
          color: "white",
          marginTop: 12,
        }}
      >
        {tx.back}
      </button>

      {message && <p style={{ marginTop: 20 }}>{message}</p>}
    </main>
  );
}
