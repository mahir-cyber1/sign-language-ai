"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getLeague, leagues } from "../../lib/gamification";
import { text, useAppLanguage } from "../../lib/i18n";

const LEAGUE_TEXT = {
  de: { title: "Meine Liga", loading: "Wird geladen...", loginInfo: "Bitte logge dich ein, um deine Liga zu sehen.", login: "Einloggen", points: "Punkte", remaining: "Noch {count} Punkte bis {league}", highest: "Du hast die höchste Liga erreicht.", correct: "richtig gelöst", checks: "Prüfungen", all: "Alle Ligen", from: "ab {count} Punkten", active: "Aktiv", reached: "Erreicht", locked: "Gesperrt", loadError: "Liga konnte nicht geladen werden." },
  en: { title: "My league", loading: "Loading...", loginInfo: "Please log in to view your league.", login: "Log in", points: "points", remaining: "{count} points left to {league}", highest: "You reached the highest league.", correct: "correct answers", checks: "checks", all: "All leagues", from: "from {count} points", active: "Active", reached: "Reached", locked: "Locked", loadError: "League could not be loaded." },
  tr: { title: "Ligim", loading: "Yükleniyor...", loginInfo: "Ligini görmek için giriş yap.", login: "Giriş yap", points: "puan", remaining: "{league} için {count} puan kaldı", highest: "En yüksek lige ulaştın.", correct: "doğru çözüm", checks: "kontrol", all: "Tüm ligler", from: "{count} puandan itibaren", active: "Aktif", reached: "Ulaşıldı", locked: "Kilitli", loadError: "Lig yüklenemedi." },
};

function fill(template, values) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, value),
    template
  );
}

const LEAGUE_NAMES = {
  de: { bronze: "Bronze Liga", silver: "Silber Liga", gold: "Gold Liga", platinum: "Platin Liga", diamond: "Diamant Liga", cosmic: "Kosmische Liga" },
  en: { bronze: "Bronze League", silver: "Silver League", gold: "Gold League", platinum: "Platinum League", diamond: "Diamond League", cosmic: "Cosmic League" },
  tr: { bronze: "Bronz Lig", silver: "Gümüş Lig", gold: "Altın Lig", platinum: "Platin Lig", diamond: "Elmas Lig", cosmic: "Kozmik Lig" },
};

export default function LeaguePage() {
  const { language } = useAppLanguage();
  const tx = text(LEAGUE_TEXT, language);
  const leagueNames = text(LEAGUE_NAMES, language);
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [message, setMessage] = useState(
    supabase ? "" : "Supabase ist nicht konfiguriert."
  );

  useEffect(() => {
    if (!supabase) return undefined;

    async function loadLeague() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);

      if (!user) {
        setLoading(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const res = await fetch("/api/gamification", {
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });
      const data = await res.json();

      if (res.ok) {
        setStats(data.stats);
      } else {
        setMessage(data?.error || tx.loadError);
      }

      setLoading(false);
    }

    loadLeague();
  }, [tx.loadError]);

  const points = stats?.points || 0;
  const currentLeague = stats?.league || getLeague(points);
  const nextLeague = stats?.nextLeague || null;
  const currentStart = currentLeague.minPoints;
  const nextStart = nextLeague?.minPoints || currentStart;
  const progress = nextLeague
    ? Math.min(
        100,
        Math.max(
          0,
          ((points - currentStart) / (nextStart - currentStart)) * 100
        )
      )
    : 100;

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
      <h1 style={{ fontSize: 28, margin: "4px 0 18px" }}>{tx.title}</h1>

      {loading && <p>{tx.loading}</p>}

      {!loading && !user && (
        <section
          style={{
            padding: 16,
            border: "1px solid #333",
            borderRadius: 8,
            backgroundColor: "#1b1b1b",
          }}
        >
          <p style={{ margin: "0 0 12px" }}>
            {tx.loginInfo}
          </p>
          <button
            onClick={() => {
              window.location.href = "/login";
            }}
            style={{
              width: "100%",
              padding: 12,
              border: 0,
              borderRadius: 8,
              backgroundColor: "#1976d2",
              color: "white",
              fontWeight: "bold",
            }}
          >
            {tx.login}
          </button>
        </section>
      )}

      {!loading && user && (
        <>
          <section
            style={{
              padding: 20,
              border: "1px solid #3a3f49",
              borderRadius: 8,
              backgroundColor: "#181b21",
              textAlign: "center",
              marginBottom: 14,
            }}
          >
            <div
              style={{
                position: "relative",
                width: 190,
                height: 190,
                margin: "0 auto",
              }}
            >
              <Image
                src={currentLeague.image}
                alt={leagueNames[currentLeague.id]}
                fill
                priority
                sizes="190px"
                style={{ objectFit: "contain" }}
              />
            </div>
            <h2 style={{ margin: "10px 0 4px", fontSize: 24 }}>
              {leagueNames[currentLeague.id]}
            </h2>
            <p style={{ margin: 0, color: "#aeb4bf" }}>{points} {tx.points}</p>

            <div
              style={{
                height: 12,
                marginTop: 18,
                overflow: "hidden",
                borderRadius: 6,
                backgroundColor: "#30343c",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  borderRadius: 6,
                  backgroundColor: "#43a047",
                }}
              />
            </div>

            <p style={{ margin: "9px 0 0", color: "#c7cbd2", fontSize: 13 }}>
              {nextLeague
                ? fill(tx.remaining, { count: stats.pointsToNextLeague, league: leagueNames[nextLeague.id] })
                : tx.highest}
            </p>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: 14,
                border: "1px solid #333",
                borderRadius: 8,
                backgroundColor: "#1b1b1b",
              }}
            >
              <strong style={{ display: "block", fontSize: 22 }}>
                {stats?.correctChecks || 0}
              </strong>
              <span style={{ color: "#aaa", fontSize: 13 }}>
                {tx.correct}
              </span>
            </div>
            <div
              style={{
                padding: 14,
                border: "1px solid #333",
                borderRadius: 8,
                backgroundColor: "#1b1b1b",
              }}
            >
              <strong style={{ display: "block", fontSize: 22 }}>
                {stats?.totalChecks || 0}
              </strong>
              <span style={{ color: "#aaa", fontSize: 13 }}>
                {tx.checks}
              </span>
            </div>
          </section>

          <h2 style={{ fontSize: 18, margin: "0 0 10px" }}>{tx.all}</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {leagues.map((league) => {
              const reached = points >= league.minPoints;
              const active = league.id === currentLeague.id;

              return (
                <div
                  key={league.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: 12,
                    border: active
                      ? "2px solid #43a047"
                      : "1px solid #333",
                    borderRadius: 8,
                    backgroundColor: reached ? "#1b1b1b" : "#141414",
                    opacity: reached ? 1 : 0.58,
                  }}
                >
                  <span
                    style={{
                      position: "relative",
                      width: 58,
                      height: 58,
                      flex: "0 0 auto",
                      overflow: "hidden",
                      borderRadius: 6,
                    }}
                  >
                    <Image
                      src={league.image}
                      alt={leagueNames[league.id]}
                      fill
                      sizes="58px"
                      style={{ objectFit: "contain" }}
                    />
                  </span>
                  <span style={{ flex: 1 }}>
                    <strong style={{ display: "block" }}>{leagueNames[league.id]}</strong>
                    <span style={{ color: "#aaa", fontSize: 12 }}>
                      {fill(tx.from, { count: league.minPoints })}
                    </span>
                  </span>
                  <span style={{ color: reached ? "#66bb6a" : "#888" }}>
                    {active ? tx.active : reached ? tx.reached : tx.locked}
                  </span>
                </div>
              );
            })}
          </div>

          {message && <p style={{ color: "#ef9a9a" }}>{message}</p>}
        </>
      )}
    </main>
  );
}
