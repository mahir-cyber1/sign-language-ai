"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { getDeviceLanguage, setAppLanguage, useAppLanguage } from "../../lib/i18n";
import styles from "./sign-translate.module.css";

const TRAINING_KEY = "sign-translate-training-v1";
const MAX_SAMPLES = 48;
const CAPTURE_SIZE = 16;
const MEDIAPIPE_WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const HOLISTIC_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/holistic_landmarker/holistic_landmarker/float16/latest/holistic_landmarker.task";
const POSE_POINTS = [0, 11, 12, 13, 14, 15, 16, 23, 24];
const FACE_POINTS = [0, 13, 14, 33, 61, 133, 263, 291, 362];
const AVATAR_COLORS = ["#78d4bd", "#94f0cf", "#7dd3fc", "#f3c969", "#fda4af"];

const starterPhrases = [
  "Hallo",
  "Danke",
  "Ich brauche Hilfe",
  "Ja",
  "Nein",
];

const SIGN_TEXT = {
  de: {
    prototype: "DGS Prototyp",
    liveTitle: "Live uebersetzen mit deinen Trainingsdaten.",
    trainTitle: "Avatar aufnehmen, Text korrigieren, App trainieren.",
    liveIntro: "Der Live-Modus nutzt deine gespeicherten Korrekturen.",
    trainIntro: "Der Trainingsmodus speichert Bewegungsdaten, aber kein echtes Video.",
    live: "Live",
    train: "Training",
    readyTitle: "Kamera bereit machen",
    readyHint: "Haende, Oberkoerper und Gesicht gut sichtbar positionieren.",
    startCamera: "Kamera starten",
    liveStart: "Live starten",
    liveStop: "Live stoppen",
    recordStart: "Aufnahme starten",
    recordStop: "Aufnahme stoppen",
    recordAgain: "Neu aufnehmen",
    liveText: "Live Text",
    noLive: "Noch keine Live-Uebersetzung",
    liveHelp: "Wenn der Live-Text falsch ist, wechsle in Training, nimm die Gebaerde auf und speichere die richtige Bedeutung.",
    translation: "Uebersetzung",
    correctedText: "Korrigierter Text",
    correctionPlaceholder: "Hier steht der erkannte oder korrigierte Text...",
    saveCorrect: "Als richtig speichern",
    training: "Training",
    noTraining: "Noch keine Trainingsdaten. Speichere ein paar korrigierte Aufnahmen.",
    export: "Export",
    deleteSelected: "Auswahl loeschen",
    initialStatus: "Kamera starten, dann eine kurze Gebaerde aufnehmen.",
    localTraining: "Lokales Training aktiv.",
    trackingReady: "KI-Tracking bereit: startet nach dem Kamerastart.",
    privacyAvatar: "Datenschutz: Es wird kein echtes Video gespeichert, nur dieser Avatar und Bewegungsdaten.",
  },
  en: {
    prototype: "Sign prototype",
    liveTitle: "Translate live with your training data.",
    trainTitle: "Record an avatar, correct the text, train the app.",
    liveIntro: "Live mode uses your saved corrections.",
    trainIntro: "Training saves motion data, but no real video.",
    live: "Live",
    train: "Training",
    readyTitle: "Prepare camera",
    readyHint: "Keep hands, upper body and face clearly visible.",
    startCamera: "Start camera",
    liveStart: "Start live",
    liveStop: "Stop live",
    recordStart: "Start recording",
    recordStop: "Stop recording",
    recordAgain: "Record again",
    liveText: "Live text",
    noLive: "No live translation yet",
    liveHelp: "If the live text is wrong, switch to Training, record the sign and save the correct meaning.",
    translation: "Translation",
    correctedText: "Corrected text",
    correctionPlaceholder: "Detected or corrected text appears here...",
    saveCorrect: "Save as correct",
    training: "Training",
    noTraining: "No training data yet. Save a few corrected recordings.",
    export: "Export",
    deleteSelected: "Delete selected",
    initialStatus: "Start the camera, then record a short sign.",
    localTraining: "Local training active.",
    trackingReady: "AI tracking ready: starts after camera start.",
    privacyAvatar: "Privacy: no real video is saved, only this avatar and motion data.",
  },
  tr: {
    prototype: "İşaret dili prototipi",
    liveTitle: "Kendi eğitim verilerinle canlı çevir.",
    trainTitle: "Avatar kaydet, metni düzelt, uygulamayı eğit.",
    liveIntro: "Canlı mod kaydettiğin düzeltmeleri kullanır.",
    trainIntro: "Eğitim modu hareket verilerini kaydeder, gerçek video kaydetmez.",
    live: "Canlı",
    train: "Eğitim",
    readyTitle: "Kamerayı hazırla",
    readyHint: "Eller, üst beden ve yüz net görünsün.",
    startCamera: "Kamerayı başlat",
    liveStart: "Canlı başlat",
    liveStop: "Canlı durdur",
    recordStart: "Kaydı başlat",
    recordStop: "Kaydı durdur",
    recordAgain: "Yeniden kaydet",
    liveText: "Canlı metin",
    noLive: "Henüz canlı çeviri yok",
    liveHelp: "Canlı metin yanlışsa Eğitime geç, işareti kaydet ve doğru anlamı kaydet.",
    translation: "Çeviri",
    correctedText: "Düzeltilmiş metin",
    correctionPlaceholder: "Algılanan veya düzeltilen metin burada...",
    saveCorrect: "Doğru olarak kaydet",
    training: "Eğitim",
    noTraining: "Henüz eğitim verisi yok. Birkaç düzeltilmiş kayıt kaydet.",
    export: "Dışa aktar",
    deleteSelected: "Seçileni sil",
    initialStatus: "Kamerayı başlat, sonra kısa bir işaret kaydet.",
    localTraining: "Yerel eğitim aktif.",
    trackingReady: "KI takibi hazır: kamera başlayınca çalışır.",
    privacyAvatar: "Gizlilik: gerçek video kaydedilmez, sadece bu avatar ve hareket verileri kaydedilir.",
  },
};

function createId() {
  return window.crypto?.randomUUID?.() || String(Date.now());
}

function normalizeVector(vector) {
  if (!vector.length) return [];

  const average = vector.reduce((sum, value) => sum + value, 0) / vector.length;
  const variance =
    vector.reduce((sum, value) => sum + (value - average) ** 2, 0) /
    vector.length;
  const deviation = Math.sqrt(variance) || 1;

  return vector.map((value) => Number(((value - average) / deviation).toFixed(4)));
}

function flattenSamples(samples) {
  if (!samples.length) return [];

  const limited = samples.slice(-MAX_SAMPLES);
  if (Array.isArray(limited[0])) {
    const frameLength = limited[0].length;
    const padded = [...limited];

    while (padded.length < MAX_SAMPLES) {
      padded.unshift(Array(frameLength).fill(0));
    }

    return padded.flat();
  }

  const padded = [...limited];
  while (padded.length < MAX_SAMPLES) {
    padded.unshift(0);
  }

  return padded;
}

function distance(left, right) {
  const length = Math.min(left.length, right.length);
  if (!length) return Number.POSITIVE_INFINITY;

  let total = 0;
  for (let index = 0; index < length; index += 1) {
    total += (left[index] - right[index]) ** 2;
  }

  return Math.sqrt(total / length);
}

function normalizeLabel(text) {
  return String(text || "").trim().replace(/\s+/g, " ");
}

function confidenceFromScore(score, runnerUpScore, examples, votes = 1) {
  const base = Math.max(0, 1 - score / 1.15);
  const margin =
    Number.isFinite(runnerUpScore) && runnerUpScore > 0
      ? Math.max(0, Math.min(0.28, (runnerUpScore - score) / runnerUpScore))
      : 0.12;
  const exampleBonus = Math.min(0.14, Math.max(0, examples - 1) * 0.035);
  const voteBonus = Math.min(0.1, Math.max(0, votes - 1) * 0.035);

  return Math.max(
    8,
    Math.min(98, Math.round((base + margin + exampleBonus + voteBonus) * 100))
  );
}

function rankTrainingMatches(trainingEntries, featureVector) {
  const now = Date.now();
  const scoredEntries = trainingEntries
    .map((entry, index) => {
      const label = normalizeLabel(entry.text);
      if (
        !label ||
        !Array.isArray(entry.features) ||
        entry.features.length !== featureVector.length
      ) {
        return null;
      }

      const createdAt = Date.parse(entry.createdAt || "") || now;
      const ageDays = Math.max(0, (now - createdAt) / 86400000);
      const recencyBoost = Math.max(0.9, 1 - Math.min(ageDays, 30) * 0.01);

      return {
        text: label,
        distance: distance(featureVector, entry.features),
        recencyBoost,
        orderBoost: Math.max(0.9, 1 - index * 0.001),
      };
    })
    .filter(Boolean)
    .filter((entry) => Number.isFinite(entry.distance))
    .sort((a, b) => a.distance - b.distance);

  const nearest = scoredEntries.slice(0, Math.min(7, scoredEntries.length));
  const grouped = new Map();

  nearest.forEach((entry, index) => {
    const current = grouped.get(entry.text) || {
      text: entry.text,
      votes: 0,
      best: Number.POSITIVE_INFINITY,
      weightedScore: 0,
    };
    const closeness = 1 / Math.max(0.001, entry.distance);
    const rankBoost = 1 / (index + 1);
    const voteWeight = closeness * entry.recencyBoost * entry.orderBoost * rankBoost;

    current.votes += 1;
    current.best = Math.min(current.best, entry.distance);
    current.weightedScore += voteWeight;
    grouped.set(entry.text, current);
  });

  return [...grouped.values()]
    .map((group) => {
      return {
        text: group.text,
        examples: scoredEntries.filter((entry) => entry.text === group.text).length,
        votes: group.votes,
        score: group.best,
        weightedScore: group.weightedScore,
      };
    })
    .sort((a, b) => b.weightedScore - a.weightedScore);
}

function buildSuggestion(trainingEntries, featureVector, durationMs) {
  if (!featureVector.length) {
    return {
      text: "Keine Bewegung erkannt",
      confidence: 0,
      source: "empty",
    };
  }

  if (trainingEntries.length > 0) {
    const scored = rankTrainingMatches(trainingEntries, featureVector);
    const best = scored[0];
    if (best) {
      const runnerUp = scored[1];
      const confidence = confidenceFromScore(
        best.score,
        runnerUp?.score ?? Number.POSITIVE_INFINITY,
        best.examples,
        best.votes
      );

      if (best.score > 1.35 && confidence < 42) {
        return {
          text: "Noch nicht sicher erkannt",
          confidence,
          source: "uncertain",
        };
      }

      return {
        text: best.text,
        confidence,
        source: "training",
      };
    }
  }

  const phraseIndex = Math.min(
    starterPhrases.length - 1,
    Math.floor((durationMs || 0) / 1200)
  );

  return {
    text: starterPhrases[phraseIndex],
    confidence: 18,
    source: "starter",
  };
}

function pushLandmark(target, landmarks, indexes = null) {
  const selected = indexes || landmarks.map((_landmark, index) => index);
  target.push(landmarks.length ? 1 : 0);

  selected.forEach((index) => {
    const landmark = landmarks[index];
    target.push(
      Number((landmark?.x || 0).toFixed(4)),
      Number((landmark?.y || 0).toFixed(4)),
      Number((landmark?.z || 0).toFixed(4))
    );
  });
}

function extractHolisticFeatures(result) {
  const leftHand = result.leftHandLandmarks?.[0] || [];
  const rightHand = result.rightHandLandmarks?.[0] || [];
  const pose = result.poseLandmarks?.[0] || [];
  const face = result.faceLandmarks?.[0] || [];
  const vector = [];

  pushLandmark(vector, leftHand);
  pushLandmark(vector, rightHand);
  pushLandmark(vector, pose, POSE_POINTS);
  pushLandmark(vector, face, FACE_POINTS);

  const detections = {
    hands: Number(Boolean(leftHand.length)) + Number(Boolean(rightHand.length)),
    pose: Number(Boolean(pose.length)),
    face: Number(Boolean(face.length)),
  };

  return { vector, detections };
}

function loadTrainingEntries() {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(window.localStorage.getItem(TRAINING_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveTrainingEntries(entries) {
  window.localStorage.setItem(TRAINING_KEY, JSON.stringify(entries));
}

function buildAvatar(features) {
  const values = Array.isArray(features) && features.length ? features : [0.2, 0.5, 0.8];
  const pick = (index, fallback = 0) => Math.abs(values[index] ?? fallback);
  const color = AVATAR_COLORS[Math.floor(pick(7, 0.4) * 1000) % AVATAR_COLORS.length];

  return {
    color,
    headX: 44 + Math.round((pick(3, 0.3) % 1) * 18),
    leftHandY: 34 + Math.round((pick(19, 0.4) % 1) * 24),
    rightHandY: 28 + Math.round((pick(47, 0.7) % 1) * 28),
    tilt: Math.round(((pick(81, 0.5) % 1) - 0.5) * 22),
  };
}

function AvatarPreview({
  features,
  label = "Gespeicherter Bewegungs-Avatar",
  compact = false,
  caption = SIGN_TEXT.de.privacyAvatar,
}) {
  const avatar = buildAvatar(features);

  return (
    <div
      className={`${styles.avatarPreview}${compact ? ` ${styles.avatarPreviewCompact}` : ""}`}
      aria-label={label}
      role="img"
    >
      <div
        className={styles.avatarFigure}
        style={{
          "--avatar-color": avatar.color,
          "--head-x": `${avatar.headX}%`,
          "--left-hand-y": `${avatar.leftHandY}%`,
          "--right-hand-y": `${avatar.rightHandY}%`,
          "--avatar-tilt": `${avatar.tilt}deg`,
        }}
      >
        <span className={styles.avatarHead} />
        <span className={styles.avatarBody} />
        <span className={styles.avatarArmLeft} />
        <span className={styles.avatarArmRight} />
        <span className={styles.avatarHandLeft} />
        <span className={styles.avatarHandRight} />
      </div>
      {!compact && (
        <span className={styles.avatarCaption}>
          {caption}
        </span>
      )}
    </div>
  );
}

export default function SignTranslatePage() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const holisticRef = useRef(null);
  const holisticLoadingRef = useRef(false);
  const captureTimerRef = useRef(null);
  const liveResultTimerRef = useRef(null);
  const previousFrameRef = useRef(null);
  const samplesRef = useRef([]);
  const startedAtRef = useRef(0);
  const router = useRouter();
  const { language } = useAppLanguage();
  const tx = SIGN_TEXT[language] || SIGN_TEXT.de;

  const [cameraState, setCameraState] = useState("idle");
  const [mode, setMode] = useState(() => {
    if (typeof window === "undefined") return "live";
    const nextMode = new URLSearchParams(window.location.search).get("mode");
    return nextMode === "train" ? "train" : "live";
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [trainingEntries, setTrainingEntries] = useState(() => loadTrainingEntries());
  const [currentResult, setCurrentResult] = useState(null);
  const [liveResult, setLiveResult] = useState({
    text: tx.noLive,
    confidence: 0,
  });
  const [correctedText, setCorrectedText] = useState("");
  const [status, setStatus] = useState(tx.initialStatus);
  const [cloudStatus, setCloudStatus] = useState(tx.localTraining);
  const [landmarkStatus, setLandmarkStatus] = useState(tx.trackingReady);
  const [selectedTrainingIds, setSelectedTrainingIds] = useState([]);

  const learnedPhrases = useMemo(() => {
    const counts = new Map();
    trainingEntries.forEach((entry) => {
      counts.set(entry.text, (counts.get(entry.text) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [trainingEntries]);

  useEffect(() => {
    setAppLanguage(getDeviceLanguage());
  }, []);

  useEffect(() => {
    const initialStatuses = Object.values(SIGN_TEXT).map((item) => item.initialStatus);
    const localStatuses = Object.values(SIGN_TEXT).map((item) => item.localTraining);
    const trackingStatuses = Object.values(SIGN_TEXT).map((item) => item.trackingReady);
    const noLiveTexts = Object.values(SIGN_TEXT).map((item) => item.noLive);

    setStatus((current) =>
      initialStatuses.includes(current) ? tx.initialStatus : current
    );
    setCloudStatus((current) =>
      localStatuses.includes(current) ? tx.localTraining : current
    );
    setLandmarkStatus((current) =>
      trackingStatuses.includes(current) ? tx.trackingReady : current
    );
    setLiveResult((current) =>
      noLiveTexts.includes(current.text)
        ? { ...current, text: tx.noLive }
        : current
    );
  }, [tx.initialStatus, tx.localTraining, tx.noLive, tx.trackingReady]);

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteTraining() {
      if (!supabase) {
        setCloudStatus("Supabase ist noch nicht konfiguriert.");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setCloudStatus("Nicht eingeloggt: Korrekturen bleiben lokal.");
        return;
      }

      const response = await fetch("/api/sign-training", {
        headers: {
          authorization: `Bearer ${session.access_token}`,
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (cancelled) return;

      if (!response.ok) {
        setCloudStatus(payload.error || "Cloud-Training nicht erreichbar.");
        return;
      }

      const remoteItems = Array.isArray(payload.items) ? payload.items : [];
      setTrainingEntries((current) => {
        const known = new Set(current.map((entry) => entry.id));
        const merged = [
          ...remoteItems.filter((entry) => !known.has(entry.id)),
          ...current,
        ].slice(0, 120);
        saveTrainingEntries(merged);
        return merged;
      });
      setCloudStatus(`Supabase verbunden: ${remoteItems.length} Beispiele geladen.`);
    }

    loadRemoteTraining();

    return () => {
      cancelled = true;
      window.clearInterval(captureTimerRef.current);
      window.clearInterval(liveResultTimerRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      holisticRef.current?.close?.();
    };
  }, []);

  async function loadHolisticLandmarker() {
    if (holisticRef.current || holisticLoadingRef.current) return;

    holisticLoadingRef.current = true;
    setLandmarkStatus("KI-Tracking wird geladen...");

    try {
      const { FilesetResolver, HolisticLandmarker } = await import(
        "@mediapipe/tasks-vision"
      );
      const vision = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      holisticRef.current = await HolisticLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: HOLISTIC_MODEL_URL,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        minPoseDetectionConfidence: 0.45,
        minPosePresenceConfidence: 0.45,
        minHandLandmarksConfidence: 0.35,
      });
      setLandmarkStatus("KI-Tracking aktiv: Haende, Gesicht und Koerper.");
    } catch (error) {
      console.error("MediaPipe konnte nicht geladen werden:", error);
      setLandmarkStatus("KI-Tracking nicht geladen. Pixel-Fallback aktiv.");
    } finally {
      holisticLoadingRef.current = false;
    }
  }

  async function startCamera() {
    setStatus("Kamera wird gestartet...");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraState("ready");
      setStatus("Bereit. Nimm 3 bis 8 Sekunden Gebaerdensprache auf.");
      loadHolisticLandmarker();
    } catch (error) {
      setCameraState("error");
      setStatus("Kamera konnte nicht gestartet werden. Bitte Browser-Berechtigung pruefen.");
    }
  }

  function sampleFrame() {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    if (holisticRef.current) {
      try {
        const result = holisticRef.current.detectForVideo(video, performance.now());
        const { vector, detections } = extractHolisticFeatures(result);

        if (vector.length) {
          samplesRef.current.push(vector);
          setLandmarkStatus(
            `KI-Tracking: ${detections.hands} Hand/Hände, ${
              detections.pose ? "Koerper" : "kein Koerper"
            }, ${detections.face ? "Gesicht" : "kein Gesicht"}`
          );
          return;
        }
      } catch (error) {
        console.error("MediaPipe Frame-Analyse fehlgeschlagen:", error);
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_SIZE;
    canvas.height = CAPTURE_SIZE;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return;

    context.drawImage(video, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
    const { data } = context.getImageData(0, 0, CAPTURE_SIZE, CAPTURE_SIZE);
    const frame = [];

    for (let index = 0; index < data.length; index += 4) {
      frame.push((data[index] + data[index + 1] + data[index + 2]) / 3 / 255);
    }

    if (previousFrameRef.current) {
      let motion = 0;
      for (let index = 0; index < frame.length; index += 1) {
        motion += Math.abs(frame[index] - previousFrameRef.current[index]);
      }
      samplesRef.current.push(motion / frame.length);
    }

    previousFrameRef.current = frame;
  }

  function startRecording() {
    if (!streamRef.current || isRecording) return;

    samplesRef.current = [];
    previousFrameRef.current = null;
    startedAtRef.current = Date.now();
    setCurrentResult(null);
    setCorrectedText("");
    captureTimerRef.current = window.setInterval(sampleFrame, 220);
    setIsRecording(true);
    setStatus("Aufnahme laeuft. Es wird kein echtes Video gespeichert.");
  }

  function stopRecording() {
    if (!isRecording) return;

    window.clearInterval(captureTimerRef.current);
    const durationMs = Date.now() - startedAtRef.current;
    const features = normalizeVector(flattenSamples(samplesRef.current));
    const suggestion = buildSuggestion(trainingEntries, features, durationMs);

    setCurrentResult({
      ...suggestion,
      features,
      durationMs,
      createdAt: new Date().toISOString(),
    });
    setCorrectedText(suggestion.text);
    setStatus(
      suggestion.source === "training"
        ? "Vorschlag aus deinen gespeicherten Trainingsbeispielen. Die Aufnahme wurde als Avatar dargestellt."
        : "Erster Vorschlag. Korrigiere ihn, damit die App lernen kann. Kein echtes Video wurde gespeichert."
    );
    setIsRecording(false);
  }

  function startLiveMode() {
    if (!streamRef.current || isLive) return;

    samplesRef.current = [];
    previousFrameRef.current = null;
    startedAtRef.current = Date.now();
    setIsLive(true);
    setLiveResult({ text: "Ich hoere zu...", confidence: 0 });
    setStatus("Live-Modus laeuft. Die App vergleicht Bewegungen mit gespeicherten Trainingsbeispielen.");

    captureTimerRef.current = window.setInterval(sampleFrame, 180);
    liveResultTimerRef.current = window.setInterval(() => {
      const features = normalizeVector(flattenSamples(samplesRef.current));
      const durationMs = Date.now() - startedAtRef.current;
      const suggestion = buildSuggestion(trainingEntries, features, durationMs);

      setLiveResult(suggestion);
      samplesRef.current = [];
      previousFrameRef.current = null;
      startedAtRef.current = Date.now();
    }, 1800);
  }

  function stopLiveMode() {
    window.clearInterval(captureTimerRef.current);
    window.clearInterval(liveResultTimerRef.current);
    setIsLive(false);
    setStatus("Live-Modus gestoppt.");
  }

  function switchMode(nextMode) {
    if (isRecording) stopRecording();
    if (isLive) stopLiveMode();
    setMode(nextMode);
    router.push(`/gebaerdensprache?mode=${nextMode}`);
  }

  async function saveCorrection() {
    const text = correctedText.trim();
    if (!text || !currentResult?.features?.length) {
      setStatus("Bitte zuerst aufnehmen und den richtigen Text eintragen.");
      return;
    }

    const nextEntry = {
      id: createId(),
      text,
      features: currentResult.features,
      durationMs: currentResult.durationMs,
      createdAt: new Date().toISOString(),
    };

    const nextEntries = [nextEntry, ...trainingEntries].slice(0, 120);
    saveTrainingEntries(nextEntries);
    setTrainingEntries(nextEntries);
    setStatus("Korrektur lokal gespeichert. Die naechste aehnliche Gebaerde kann besser erkannt werden.");

    if (!supabase) {
      setCloudStatus("Supabase ist noch nicht konfiguriert.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setCloudStatus("Nicht eingeloggt: Korrektur wurde nur lokal gespeichert.");
      return;
    }

    const response = await fetch("/api/sign-training", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        text,
        features: currentResult.features,
        durationMs: currentResult.durationMs,
      }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setCloudStatus(payload.error || "Supabase-Speichern fehlgeschlagen.");
      return;
    }

    if (payload.item?.id) {
      setTrainingEntries((current) => {
        const updated = current.map((entry) =>
          entry.id === nextEntry.id
            ? { ...entry, id: payload.item.id, remote: true }
            : entry
        );
        saveTrainingEntries(updated);
        return updated;
      });
    }

    setCloudStatus("Korrektur auch in Supabase gespeichert.");
  }

  function toggleTrainingSelection(id) {
    setSelectedTrainingIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  async function deleteSelectedTraining() {
    if (!selectedTrainingIds.length) {
      setStatus("Bitte zuerst Trainingsbeispiele zum Loeschen auswaehlen.");
      return;
    }

    const selected = new Set(selectedTrainingIds);
    const nextEntries = trainingEntries.filter((entry) => !selected.has(entry.id));
    saveTrainingEntries(nextEntries);
    setTrainingEntries(nextEntries);
    setSelectedTrainingIds([]);
    setStatus(`${selectedTrainingIds.length} Trainingsbeispiel(e) lokal geloescht.`);

    if (!supabase) {
      setCloudStatus("Supabase ist noch nicht konfiguriert.");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      setCloudStatus("Nicht eingeloggt: Auswahl wurde nur lokal geloescht.");
      return;
    }

    const response = await fetch("/api/sign-training", {
      method: "DELETE",
      headers: {
        authorization: `Bearer ${session.access_token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ ids: selectedTrainingIds }),
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setCloudStatus(payload.error || "Supabase-Loeschen fehlgeschlagen.");
      return;
    }

    setCloudStatus("Ausgewaehlte Trainingsbeispiele auch in Supabase geloescht.");
  }

  function exportTraining() {
    const payload = {
      project: "sign-translate-training",
      language: "DGS",
      exportedAt: new Date().toISOString(),
      entries: trainingEntries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "gebaerden-training.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className={styles.page}>
      <section className={styles.header}>
        <span>{tx.prototype}</span>
        <h1>
          {mode === "live"
            ? tx.liveTitle
            : tx.trainTitle}
        </h1>
        <p>
          {mode === "live"
            ? tx.liveIntro
            : tx.trainIntro}
        </p>
      </section>

      <div className={styles.modeTabs} role="tablist" aria-label="Modus">
        <button
          type="button"
          className={mode === "live" ? styles.activeMode : ""}
          onClick={() => switchMode("live")}
        >
          {tx.live}
        </button>
        <button
          type="button"
          className={mode === "train" ? styles.activeMode : ""}
          onClick={() => switchMode("train")}
        >
          {tx.train}
        </button>
      </div>

      <section className={styles.cameraPanel} aria-label="Kamera und Aufnahme">
        <div className={styles.videoFrame}>
          <video ref={videoRef} autoPlay muted playsInline />
          {cameraState !== "ready" && (
            <div className={styles.videoOverlay}>
              <strong>{tx.readyTitle}</strong>
              <span>{tx.readyHint}</span>
            </div>
          )}
          {isRecording && <div className={styles.recordingDot}>REC</div>}
        </div>

        <div className={styles.controls}>
          {cameraState !== "ready" ? (
            <button type="button" onClick={startCamera} className={styles.primaryButton}>
              {tx.startCamera}
            </button>
          ) : mode === "live" ? (
            <button
              type="button"
              onClick={isLive ? stopLiveMode : startLiveMode}
              className={isLive ? styles.stopButton : styles.primaryButton}
            >
              {isLive ? tx.liveStop : tx.liveStart}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={isRecording ? styles.stopButton : styles.primaryButton}
              >
                {isRecording ? tx.recordStop : tx.recordStart}
              </button>
              <button
                type="button"
                onClick={startRecording}
                disabled={isRecording}
                className={styles.secondaryButton}
              >
                {tx.recordAgain}
              </button>
            </>
          )}
        </div>

        <p className={styles.status}>{status}</p>
        <p className={styles.landmarkStatus}>{landmarkStatus}</p>
        <p className={styles.cloudStatus}>{cloudStatus}</p>
      </section>

      {mode === "live" ? (
        <section className={styles.livePanel}>
          <div className={styles.panelHeader}>
            <span>{tx.liveText}</span>
            <strong>{liveResult.confidence || 0}%</strong>
          </div>
          <p className={styles.liveText}>{liveResult.text}</p>
          <p className={styles.emptyState}>
            {tx.liveHelp}
          </p>
        </section>
      ) : (
      <section className={styles.resultGrid}>
        <div className={styles.resultPanel}>
          <div className={styles.panelHeader}>
            <span>{tx.translation}</span>
            {currentResult && <strong>{currentResult.confidence}%</strong>}
          </div>

          {currentResult?.features?.length > 0 && (
            <AvatarPreview features={currentResult.features} caption={tx.privacyAvatar} />
          )}

          <label className={styles.textLabel} htmlFor="correction">
            {tx.correctedText}
          </label>
          <textarea
            id="correction"
            value={correctedText}
            onChange={(event) => setCorrectedText(event.target.value)}
            placeholder={tx.correctionPlaceholder}
            rows={5}
          />

          <button
            type="button"
            onClick={saveCorrection}
            disabled={!currentResult}
            className={styles.saveButton}
          >
            {tx.saveCorrect}
          </button>
        </div>

        <div className={styles.trainingPanel}>
          <div className={styles.panelHeader}>
            <span>{tx.training}</span>
            <strong>{trainingEntries.length}</strong>
          </div>

          {learnedPhrases.length > 0 ? (
            <>
              <div className={styles.phraseList}>
                {learnedPhrases.map(([phrase, count]) => (
                  <div key={phrase} className={styles.phraseItem}>
                    <span>{phrase}</span>
                    <strong>{count}x</strong>
                  </div>
                ))}
              </div>
              <div className={styles.exampleList} aria-label="Einzelne Trainingsbeispiele">
                {trainingEntries.map((entry) => {
                  const selected = selectedTrainingIds.includes(entry.id);

                  return (
                    <label
                      key={entry.id}
                      className={`${styles.exampleItem}${selected ? ` ${styles.exampleItemSelected}` : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleTrainingSelection(entry.id)}
                      />
                      <AvatarPreview features={entry.features} compact />
                      <span>
                        <strong>{entry.text}</strong>
                        <small>
                          {entry.createdAt
                            ? new Date(entry.createdAt).toLocaleDateString("de-DE")
                            : "Lokal"}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <p className={styles.emptyState}>
              {tx.noTraining}
            </p>
          )}

          <div className={styles.trainingActions}>
            <button type="button" onClick={exportTraining} disabled={!trainingEntries.length}>
              {tx.export}
            </button>
            <button
              type="button"
              onClick={deleteSelectedTraining}
              disabled={!selectedTrainingIds.length}
            >
              {tx.deleteSelected}
            </button>
          </div>
        </div>
      </section>
      )}
    </main>
  );
}
