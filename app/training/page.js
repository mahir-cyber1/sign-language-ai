"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { text, useAppLanguage } from "../../lib/i18n";

const TRAINING_TEXT = {
  de: { title: "Fehlertraining", intro: "Übe gezielt mit neuen, ähnlichen Aufgaben.", loading: "Wird geladen...", login: "Bitte logge dich ein.", loadError: "Fehlertraining konnte nicht geladen werden.", empty: "Noch keine Fehler gespeichert. Das ist entweder sehr gut oder du hast noch keine Lösung geprüft.", grade: "Klasse", creating: "Übung wird erstellt...", create: "Ähnliche Übung erstellen", resolved: "Als geübt markieren", exercise: "Deine neue Übung", error: "Fehler" },
  en: { title: "Mistake practice", intro: "Practice with new, similar exercises.", loading: "Loading...", login: "Please log in.", loadError: "Mistake practice could not be loaded.", empty: "No mistakes saved yet. Either that is excellent or you have not checked a solution yet.", grade: "Grade", creating: "Creating exercise...", create: "Create similar exercise", resolved: "Mark as practiced", exercise: "Your new exercise", error: "Error" },
  tr: { title: "Hata çalışması", intro: "Yeni ve benzer sorularla hedefli çalış.", loading: "Yükleniyor...", login: "Lütfen giriş yap.", loadError: "Hata çalışması yüklenemedi.", empty: "Henüz hata kaydedilmedi. Ya çok iyi gidiyorsun ya da henüz çözüm kontrol etmedin.", grade: "Sınıf", creating: "Alıştırma hazırlanıyor...", create: "Benzer alıştırma oluştur", resolved: "Çalışıldı olarak işaretle", exercise: "Yeni alıştırman", error: "Hata" },
};

export default function TrainingPage() {
  const { language } = useAppLanguage();
  const tx = text(TRAINING_TEXT, language);
  const [items, setItems] = useState([]);
  const [exercise, setExercise] = useState("");
  const [activeId, setActiveId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || "";
  }

  useEffect(() => {
    if (!supabase) return;

    async function loadItems() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      if (!token) {
        setMessage(tx.login);
        setLoading(false);
        return;
      }

      const res = await fetch("/api/training", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setItems(data.items || []);
      else {
        setMessage(data.error || tx.loadError);
      }
      setLoading(false);
    }

    loadItems();
  }, [tx.loadError, tx.login]);

  async function createExercise(id) {
    setActiveId(id);
    setExercise("");
    const token = await getToken();
    const res = await fetch("/api/training", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    setExercise(res.ok ? data.exercise : `${tx.error}: ${data.error}`);
    setActiveId("");
  }

  async function markResolved(id) {
    const token = await getToken();
    await fetch("/api/training", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    setItems((current) => current.filter((item) => item.id !== id));
    setExercise("");
  }

  return (
    <main style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", padding: 20, background: "#111", color: "white", borderRadius: 24 }}>
      <h1 style={{ fontSize: 28, margin: "4px 0 8px" }}>{tx.title}</h1>
      <p style={{ color: "#bbb", marginBottom: 18 }}>{tx.intro}</p>

      {loading && <p>{tx.loading}</p>}
      {message && <p>{message}</p>}
      {!loading && !message && items.length === 0 && (
        <section style={{ padding: 16, border: "1px solid #333", borderRadius: 8, background: "#1b1b1b" }}>
          {tx.empty}
        </section>
      )}

      {items.map((item) => (
        <article key={item.id} style={{ padding: 14, marginBottom: 12, border: "1px solid #333", borderRadius: 8, background: "#1b1b1b" }}>
          <strong>{tx.grade} {item.grade}</strong>
          <p style={{ color: "#ccc", whiteSpace: "pre-wrap", maxHeight: 120, overflow: "hidden" }}>
            {item.correction}
          </p>
          <button onClick={() => createExercise(item.id)} disabled={activeId === item.id} style={{ width: "100%", padding: 12, border: 0, borderRadius: 8, background: "#fb8c00", color: "white", fontWeight: "bold", marginBottom: 8 }}>
            {activeId === item.id ? tx.creating : tx.create}
          </button>
          <button onClick={() => markResolved(item.id)} style={{ width: "100%", padding: 10, border: "1px solid #444", borderRadius: 8, background: "#222", color: "white" }}>
            {tx.resolved}
          </button>
        </article>
      ))}

      {exercise && (
        <section style={{ padding: 16, borderRadius: 8, background: "white", color: "#172033", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
          <h2 style={{ marginTop: 0, fontSize: 20 }}>{tx.exercise}</h2>
          {exercise}
        </section>
      )}
    </main>
  );
}
