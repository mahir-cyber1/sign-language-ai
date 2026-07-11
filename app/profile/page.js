"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getLeague } from "../../lib/gamification";
import {
  getProfileAvatar,
  getProfileFrame,
  getProfileTheme,
  profileAvatars,
  profileFrames,
  profileThemes,
} from "../../lib/profileAvatars";
import { text, useAppLanguage } from "../../lib/i18n";

const PROFILE_TEXT = {
  de: { back: "Zurück zur App", title: "Profil", loading: "Wird geladen...", loginInfo: "Bitte logge dich zuerst ein.", login: "Einloggen", points: "Punkte", correctChecks: "richtige Prüfungen", remaining: "Noch {count} Punkte bis {league}.", highest: "Höchste Liga erreicht.", adminLocked: "Admin-Name und Admin-Profilbild können nicht geändert werden.", name: "Name oder Nickname", avatar: "Profilbild", frame: "Profilrahmen", color: "App-Farbe", myGrade: "Meine Klasse", grade: "Klasse", saving: "Wird gespeichert...", saveProfile: "Profil speichern", music: "Musik & Klavier", musicInfo: "Noten üben und einfache Lieder spielen", openMusic: "Musik öffnen", changePassword: "Passwort ändern", newPassword: "Neues Passwort", repeatPassword: "Passwort wiederholen", savePassword: "Passwort speichern", tasks: "Meine Aufgaben", logout: "Abmelden", supabase: "Supabase ist nicht konfiguriert." },
  en: { back: "Back to app", title: "Profile", loading: "Loading...", loginInfo: "Please log in first.", login: "Log in", points: "points", correctChecks: "correct checks", remaining: "{count} points left to {league}.", highest: "Highest league reached.", adminLocked: "The admin name and picture cannot be changed.", name: "Name or nickname", avatar: "Profile picture", frame: "Profile frame", color: "App color", myGrade: "My grade", grade: "Grade", saving: "Saving...", saveProfile: "Save profile", music: "Music & piano", musicInfo: "Practice notes and play easy songs", openMusic: "Open music", changePassword: "Change password", newPassword: "New password", repeatPassword: "Repeat password", savePassword: "Save password", tasks: "My tasks", logout: "Log out", supabase: "Supabase is not configured." },
  tr: { back: "Uygulamaya dön", title: "Profil", loading: "Yükleniyor...", loginInfo: "Önce giriş yap.", login: "Giriş yap", points: "puan", correctChecks: "doğru kontrol", remaining: "{league} için {count} puan kaldı.", highest: "En yüksek lige ulaşıldı.", adminLocked: "Yönetici adı ve profil resmi değiştirilemez.", name: "İsim veya kullanıcı adı", avatar: "Profil resmi", frame: "Profil çerçevesi", color: "Uygulama rengi", myGrade: "Sınıfım", grade: "Sınıf", saving: "Kaydediliyor...", saveProfile: "Profili kaydet", music: "Müzik & piyano", musicInfo: "Nota çalış ve kolay şarkılar çal", openMusic: "Müziği aç", changePassword: "Şifreyi değiştir", newPassword: "Yeni şifre", repeatPassword: "Şifreyi tekrarla", savePassword: "Şifreyi kaydet", tasks: "Ödevlerim", logout: "Çıkış yap", supabase: "Supabase yapılandırılmadı." },
};
const PROFILE_LEAGUES = {
  de: { bronze: "Bronze Liga", silver: "Silber Liga", gold: "Gold Liga", platinum: "Platin Liga", diamond: "Diamant Liga", cosmic: "Kosmische Liga" },
  en: { bronze: "Bronze League", silver: "Silver League", gold: "Gold League", platinum: "Platinum League", diamond: "Diamond League", cosmic: "Cosmic League" },
  tr: { bronze: "Bronz Lig", silver: "Gümüş Lig", gold: "Altın Lig", platinum: "Platin Lig", diamond: "Elmas Lig", cosmic: "Kozmik Lig" },
};

const ADMIN_EMAILS = ["genckurecikli@gmail.com"];

export default function ProfilePage() {
  const { language } = useAppLanguage();
  const tx = text(PROFILE_TEXT, language);
  const leagueNames = text(PROFILE_LEAGUES, language);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [avatarId, setAvatarId] = useState("star");
  const [gradeLevel, setGradeLevel] = useState("4");
  const [frameId, setFrameId] = useState("none");
  const [themeId, setThemeId] = useState("blue");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [gameStats, setGameStats] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(Boolean(supabase));

  const isAdmin = user
    ? ADMIN_EMAILS.includes(String(user.email || "").trim().toLowerCase())
    : false;
  const currentAvatar = getProfileAvatar(isAdmin ? "spark" : avatarId);
  const currentFrame = getProfileFrame(frameId);
  const currentTheme = getProfileTheme(themeId);
  const currentLeague = gameStats?.league || getLeague(0);
  const points = gameStats?.points || 0;

  useEffect(() => {
    if (!supabase) {
      return undefined;
    }

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const fallbackName =
        user.user_metadata?.display_name || user.email?.split("@")[0] || "";

      let { data, error } = await supabase
        .from("user_profiles")
        .select("display_name,avatar_id,grade_level")
        .eq("user_id", user.id)
        .maybeSingle();

      if (
        error &&
        (String(error.message || "").includes("avatar_id") ||
          String(error.message || "").includes("grade_level"))
      ) {
        let fallbackResult = await supabase
          .from("user_profiles")
          .select("display_name,avatar_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (
          fallbackResult.error &&
          String(fallbackResult.error.message || "").includes("avatar_id")
        ) {
          fallbackResult = await supabase
            .from("user_profiles")
            .select("display_name")
            .eq("user_id", user.id)
            .maybeSingle();
        }

        data = fallbackResult.data;
        error = fallbackResult.error;
      }

      const profileName = isAdmin ? "Admin" : data?.display_name || fallbackName;
      const profileAvatarId =
        data?.avatar_id || user.user_metadata?.avatar_id || "star";
      const profileGradeLevel = String(
        data?.grade_level || user.user_metadata?.grade_level || "4"
      );

      setDisplayName(profileName);
      setNameDraft(profileName);
      setAvatarId(profileAvatarId);
      setGradeLevel(
        ["4", "5", "6"].includes(profileGradeLevel)
          ? profileGradeLevel
          : "4"
      );
      setFrameId(user.user_metadata?.frame_id || "none");
      setThemeId(user.user_metadata?.theme_id || "blue");

      if (error) {
        setMessage("Profil konnte nicht vollständig geladen werden.");
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        const res = await fetch("/api/gamification", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setGameStats(data.stats);
        }
      }

      setLoading(false);
    }

    loadProfile();
  }, [isAdmin]);

  async function saveProfile() {
    if (!supabase || !user || isAdmin || savingProfile) return;

    const trimmedName = nameDraft.trim().slice(0, 60);

    if (trimmedName.length < 2) {
      setMessage("Bitte mindestens 2 Zeichen fuer den Namen eingeben.");
      return;
    }

    setSavingProfile(true);
    setMessage("Profil wird gespeichert...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: trimmedName,
          avatarId,
          gradeLevel,
          frameId,
          themeId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage("Fehler: " + (data?.error || "Unbekannt"));
        return;
      }

      setDisplayName(data.displayName);
      setNameDraft(data.displayName);
      setAvatarId(data.avatarId);
      setGradeLevel(data.gradeLevel);
      setFrameId(data.frameId);
      setThemeId(data.themeId);
      await supabase.auth.refreshSession();
      window.location.replace("/");
    } catch {
      setMessage("Fehler: Das Profil konnte nicht gespeichert werden.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (!supabase || !user) return;

    if (newPassword.length < 6) {
      setMessage("Das Passwort muss mindestens 6 Zeichen haben.");
      return;
    }

    if (newPassword !== repeatPassword) {
      setMessage("Die Passwoerter stimmen nicht ueberein.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage("Fehler: " + error.message);
    } else {
      setNewPassword("");
      setRepeatPassword("");
      setMessage("Passwort wurde gespeichert.");
    }
  }

  async function signOut() {
    if (!supabase) return;

    await supabase.auth.signOut();
    window.location.href = "/";
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
        borderRadius: 24,
      }}
    >
      <button
        onClick={() => {
          window.location.href = "/";
        }}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "10px",
          border: "none",
          backgroundColor: "#333",
          color: "white",
          fontWeight: "bold",
          marginBottom: 14,
        }}
      >
        {tx.back}
      </button>

      <h1 style={{ fontSize: 28, marginTop: 0 }}>{tx.title}</h1>

      {loading && <p>{tx.loading}</p>}

      {!loading && !user && (
        <div
          style={{
            padding: 14,
            borderRadius: 12,
            backgroundColor: "#1b1b1b",
            border: "1px solid #333",
          }}
        >
          <p style={{ marginTop: 0 }}>{tx.loginInfo}</p>
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "#1976d2",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {tx.login}
          </button>
        </div>
      )}

      {!loading && user && (
        <>
          <section
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#1b1b1b",
              border: "1px solid #333",
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  backgroundColor: currentAvatar.background,
                  border:
                    currentFrame.id === "none"
                      ? "none"
                      : `4px solid ${currentFrame.color}`,
                  boxShadow:
                    currentFrame.id === "cosmic"
                      ? `0 0 16px ${currentFrame.color}`
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 31,
                  flex: "0 0 auto",
                }}
              >
                {currentAvatar.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>
                  {isAdmin ? "Admin" : displayName}
                </p>
                <p style={{ margin: 0, color: "#bbb", fontSize: 13 }}>
                  {user.email}
                </p>
              </div>
            </div>
          </section>

          {!isAdmin && (
            <section
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: "#1b1b1b",
                border: "1px solid #333",
                marginBottom: 14,
              }}
            >
              <p style={{ margin: "0 0 8px", fontWeight: "bold" }}>
                {currentLeague.icon} {leagueNames[currentLeague.id]}
              </p>
              <p style={{ margin: "0 0 8px", color: "#ccc" }}>
                {gameStats?.points || 0} {tx.points} ·{" "}
                {gameStats?.correctChecks || 0} {tx.correctChecks}
              </p>
              {gameStats?.nextLeague ? (
                <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>
                  {tx.remaining
                    .replace("{count}", gameStats.pointsToNextLeague)
                    .replace("{league}", leagueNames[gameStats.nextLeague.id])}
                </p>
              ) : (
                <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>
                  {tx.highest}
                </p>
              )}
            </section>
          )}

          {isAdmin ? (
            <section
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: "#1b1b1b",
                border: "1px solid #333",
                marginBottom: 14,
              }}
            >
              <p style={{ margin: 0 }}>
                {tx.adminLocked}
              </p>
            </section>
          ) : (
            <section
              style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: "#1b1b1b",
                border: "1px solid #333",
                marginBottom: 14,
              }}
            >
              <label style={{ display: "block", marginBottom: 6 }}>
                {tx.name}
              </label>
              <input
                type="text"
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value);
                  setMessage("");
                }}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #444",
                  backgroundColor: "#111",
                  color: "white",
                  boxSizing: "border-box",
                  marginBottom: 14,
                }}
              />

              <p style={{ margin: "0 0 10px" }}>{tx.avatar}</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {profileAvatars.map((avatar) => (
                  <button
                    key={avatar.id}
                    disabled={points < avatar.unlockPoints}
                    onClick={() => {
                      setAvatarId(avatar.id);
                      setMessage("");
                    }}
                    aria-label={avatar.label}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "50%",
                      border:
                        avatarId === avatar.id
                          ? "3px solid white"
                          : "1px solid #444",
                      backgroundColor: avatar.background,
                      color: "white",
                      fontSize: 26,
                      opacity: points < avatar.unlockPoints ? 0.32 : 1,
                      position: "relative",
                    }}
                  >
                    {avatar.icon}
                    {points < avatar.unlockPoints && (
                      <span
                        style={{
                          position: "absolute",
                          right: 2,
                          bottom: 2,
                          fontSize: 10,
                          padding: "2px 3px",
                          borderRadius: 4,
                          background: "#111",
                        }}
                      >
                        {avatar.unlockPoints}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <p style={{ margin: "0 0 10px" }}>{tx.frame}</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {profileFrames.map((frame) => {
                  const locked = points < frame.unlockPoints;
                  return (
                    <button
                      key={frame.id}
                      disabled={locked}
                      onClick={() => setFrameId(frame.id)}
                      style={{
                        minHeight: 58,
                        padding: 6,
                        borderRadius: 8,
                        border:
                          frameId === frame.id
                            ? `3px solid ${currentTheme.color}`
                            : "1px solid #444",
                        background: "#151515",
                        color: locked ? "#777" : "white",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          width: 28,
                          height: 28,
                          margin: "0 auto 4px",
                          borderRadius: "50%",
                          border:
                            frame.id === "none"
                              ? "1px dashed #666"
                              : `4px solid ${frame.color}`,
                        }}
                      />
                      <span style={{ fontSize: 11 }}>
                        {locked ? `${frame.unlockPoints} ${tx.points}` : frame.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p style={{ margin: "0 0 10px" }}>{tx.color}</p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 8,
                  marginBottom: 14,
                }}
              >
                {profileThemes.map((theme) => {
                  const locked = points < theme.unlockPoints;
                  return (
                    <button
                      key={theme.id}
                      disabled={locked}
                      aria-label={`${theme.label}, ${theme.unlockPoints} Punkte`}
                      onClick={() => setThemeId(theme.id)}
                      style={{
                        aspectRatio: "1",
                        borderRadius: "50%",
                        border:
                          themeId === theme.id
                            ? "3px solid white"
                            : "1px solid #555",
                        background: theme.color,
                        opacity: locked ? 0.25 : 1,
                      }}
                    />
                  );
                })}
              </div>

              <label style={{ display: "block", marginBottom: 6 }}>
                {tx.myGrade}
              </label>
              <select
                value={gradeLevel}
                onChange={(event) => {
                  setGradeLevel(event.target.value);
                  setMessage("");
                }}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #444",
                  backgroundColor: "#111",
                  color: "white",
                  boxSizing: "border-box",
                  marginBottom: 14,
                  fontSize: 16,
                }}
              >
                <option value="4">{tx.grade} 4</option>
                <option value="5">{tx.grade} 5</option>
                <option value="6">{tx.grade} 6</option>
              </select>

              <button
                onClick={saveProfile}
                disabled={savingProfile}
                style={{
                  width: "100%",
                  padding: 12,
                  borderRadius: 10,
                  border: "none",
                  backgroundColor: "#43a047",
                  color: "white",
                  fontWeight: "bold",
                  opacity: savingProfile ? 0.65 : 1,
                }}
              >
                {savingProfile ? tx.saving : tx.saveProfile}
              </button>
            </section>
          )}

          <section
            style={{
              padding: 14,
              borderRadius: 8,
              backgroundColor: "#1b1b1b",
              border: "1px solid #333",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  display: "grid",
                  width: 44,
                  height: 44,
                  placeItems: "center",
                  borderRadius: "50%",
                  backgroundColor: "#1976d2",
                  fontSize: 24,
                }}
              >
                ♫
              </span>
              <div>
                <p style={{ margin: 0, fontWeight: "bold" }}>
                  {tx.music}
                </p>
                <p style={{ margin: "3px 0 0", color: "#aaa", fontSize: 13 }}>
                  {tx.musicInfo}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                window.location.href = "/music";
              }}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 8,
                border: "none",
                backgroundColor: "#1976d2",
                color: "white",
                fontWeight: "bold",
              }}
            >
              {tx.openMusic}
            </button>
          </section>

          <section
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: "#1b1b1b",
              border: "1px solid #333",
              marginBottom: 14,
            }}
          >
            <p style={{ marginTop: 0, fontWeight: "bold" }}>
              {tx.changePassword}
            </p>
            <input
              type="password"
              placeholder={tx.newPassword}
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setMessage("");
              }}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #444",
                backgroundColor: "#111",
                color: "white",
                boxSizing: "border-box",
                marginBottom: 8,
              }}
            />
            <input
              type="password"
              placeholder={tx.repeatPassword}
              value={repeatPassword}
              onChange={(e) => {
                setRepeatPassword(e.target.value);
                setMessage("");
              }}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #444",
                backgroundColor: "#111",
                color: "white",
                boxSizing: "border-box",
                marginBottom: 10,
              }}
            />
            <button
              onClick={savePassword}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "none",
                backgroundColor: "#fb8c00",
                color: "white",
                fontWeight: "bold",
              }}
            >
              {tx.savePassword}
            </button>
          </section>

          <button
            onClick={() => {
              window.location.href = "/history";
            }}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "none",
              backgroundColor: "#1976d2",
              color: "white",
              fontWeight: "bold",
              marginBottom: 10,
            }}
          >
            {tx.tasks}
          </button>

          <button
            onClick={signOut}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 10,
              border: "none",
              backgroundColor: "#444",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {tx.logout}
          </button>
        </>
      )}

      {(message || !supabase) && (
        <p style={{ marginTop: 20 }}>{message || tx.supabase}</p>
      )}
    </main>
  );
}
