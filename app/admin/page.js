"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(Boolean(supabase));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(
    supabase ? "" : "Supabase ist nicht konfiguriert."
  );

  const getAccessToken = useCallback(async () => {
    if (!supabase) return "";

    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.access_token || "";
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const token = await getAccessToken();

    if (!token) {
      setMessage("Bitte zuerst als Admin einloggen.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/admin/requests", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data?.error || "Benutzer konnten nicht geladen werden.");
    } else {
      setUsers(data?.users || []);
    }

    setLoading(false);
  }, [getAccessToken]);

  useEffect(() => {
    if (!supabase) return undefined;

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      await loadUsers();
    }

    init();
  }, [loadUsers]);

  async function saveUser() {
    setSaving(true);
    setMessage("");

    const token = await getAccessToken();
    const res = await fetch("/api/admin/requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "create",
        username,
        password,
        role,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data?.error || "Benutzer konnte nicht gespeichert werden.");
    } else {
      setUsername("");
      setPassword("");
      setRole("user");
      setMessage("Benutzer gespeichert.");
      await loadUsers();
    }

    setSaving(false);
  }

  async function setActive(appUser, active) {
    setSaving(true);
    setMessage("");

    const token = await getAccessToken();
    const res = await fetch("/api/admin/requests", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: active ? "activate" : "remove",
        username: appUser.username,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage(data?.error || "Aktion fehlgeschlagen.");
    } else {
      await loadUsers();
    }

    setSaving(false);
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
      <button
        onClick={() => {
          window.location.href = "/gebaerdensprache";
        }}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: 8,
          border: "1px solid #334052",
          backgroundColor: "#141924",
          color: "white",
          fontWeight: "bold",
          marginBottom: 14,
        }}
      >
        Zur App
      </button>

      <h1 style={{ fontSize: 28, marginTop: 0 }}>Admin</h1>

      {user && (
        <p style={{ color: "#b9c1cf", fontSize: 14 }}>
          Eingeloggt als: {user.user_metadata?.sign_username || user.email}
        </p>
      )}

      {message && (
        <div
          style={{
            padding: 12,
            borderRadius: 8,
            backgroundColor: "#141924",
            border: "1px solid #28313d",
            marginBottom: 14,
          }}
        >
          <p style={{ marginTop: 0 }}>{message}</p>
          {message.includes("einloggen") && (
            <button
              onClick={() => {
                window.location.href = "/login";
              }}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                border: "none",
                backgroundColor: "#1fb895",
                color: "#07100d",
                fontWeight: "bold",
              }}
            >
              Einloggen
            </button>
          )}
        </div>
      )}

      {!loading && !message.includes("einloggen") && (
        <section
          style={{
            display: "grid",
            gap: 10,
            padding: 14,
            borderRadius: 8,
            backgroundColor: "#141924",
            border: "1px solid #28313d",
            marginBottom: 18,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 20 }}>Benutzer anlegen</h2>
          <input
            type="text"
            placeholder="Name"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Passwort"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={inputStyle}
          />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            style={inputStyle}
          >
            <option value="user">Benutzer</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={saveUser}
            disabled={saving || username.trim().length < 2 || password.length < 6}
            style={primaryButtonStyle}
          >
            Speichern
          </button>
        </section>
      )}

      {loading && <p>Wird geladen...</p>}

      {!loading && !message.includes("einloggen") && (
        <h2 style={{ fontSize: 22, marginTop: 0 }}>Benutzer</h2>
      )}

      {users.map((appUser) => (
        <article
          key={appUser.username_key}
          style={{
            padding: 14,
            borderRadius: 8,
            backgroundColor: "#141924",
            border: "1px solid #28313d",
            marginBottom: 12,
          }}
        >
          <p style={{ margin: "0 0 5px", fontWeight: "bold" }}>
            {appUser.username}
          </p>
          <p style={{ margin: "0 0 8px", color: "#b9c1cf", fontSize: 13 }}>
            {appUser.role === "admin" ? "Admin" : "Benutzer"} ·{" "}
            {appUser.active ? "aktiv" : "deaktiviert"}
          </p>
          <button
            onClick={() => setActive(appUser, !appUser.active)}
            disabled={saving || appUser.username_key === "memed"}
            style={{
              ...secondaryButtonStyle,
              backgroundColor: appUser.active ? "#3a1f25" : "#173226",
              color: appUser.active ? "#ffb4ac" : "#94f0cf",
            }}
          >
            {appUser.active ? "Deaktivieren" : "Aktivieren"}
          </button>
        </article>
      ))}
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: 13,
  borderRadius: 8,
  border: "1px solid #334052",
  background: "#0d1016",
  color: "white",
  font: "inherit",
  boxSizing: "border-box",
};

const primaryButtonStyle = {
  width: "100%",
  minHeight: 44,
  border: 0,
  borderRadius: 8,
  background: "#1fb895",
  color: "#07100d",
  fontWeight: 850,
};

const secondaryButtonStyle = {
  width: "100%",
  minHeight: 42,
  border: "1px solid #334052",
  borderRadius: 8,
  fontWeight: 800,
};
