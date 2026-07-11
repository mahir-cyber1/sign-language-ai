"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "homework-helper-language";
const SUPPORTED_LANGUAGES = ["de", "en", "tr"];
const listeners = new Set();
let activeLanguage = null;

function getSupportedLanguage(value) {
  const shortLanguage = String(value || "").toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.includes(shortLanguage) ? shortLanguage : null;
}

function normalizeLanguage(value) {
  return getSupportedLanguage(value) || "de";
}

export function getDeviceLanguage() {
  if (typeof window === "undefined") return "de";

  const preferredLanguages = window.navigator.languages || [
    window.navigator.language,
  ];
  const supportedLanguage = preferredLanguages
    .map(getSupportedLanguage)
    .find(Boolean);

  return supportedLanguage || "de";
}

function getBrowserLanguage() {
  if (typeof window === "undefined") return "de";
  if (activeLanguage) return activeLanguage;

  const savedLanguage = window.localStorage.getItem(STORAGE_KEY);
  if (savedLanguage) {
    activeLanguage = normalizeLanguage(savedLanguage);
    return activeLanguage;
  }

  const cookieLanguage = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${STORAGE_KEY}=`))
    ?.split("=")[1];
  if (cookieLanguage) {
    activeLanguage = normalizeLanguage(cookieLanguage);
    return activeLanguage;
  }

  activeLanguage = getDeviceLanguage();
  return activeLanguage;
}

function emitLanguageChange() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);

  function handleStorage(event) {
    if (event.key === STORAGE_KEY) emitLanguageChange();
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener("languagechange", emitLanguageChange);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("languagechange", emitLanguageChange);
  };
}

export function setAppLanguage(language) {
  const normalizedLanguage = normalizeLanguage(language);
  activeLanguage = normalizedLanguage;
  window.localStorage.setItem(STORAGE_KEY, normalizedLanguage);
  document.cookie = `${STORAGE_KEY}=${normalizedLanguage}; path=/; max-age=31536000; samesite=lax`;
  document.documentElement.lang = normalizedLanguage;
  emitLanguageChange();
}

export function useAppLanguage() {
  const language = useSyncExternalStore(subscribe, getBrowserLanguage, () => "de");

  return { language, setLanguage: setAppLanguage };
}

export function text(translations, language) {
  return translations[language] || translations.de;
}
