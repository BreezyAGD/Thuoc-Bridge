"use client";

import { useEffect, useSyncExternalStore } from "react";
import { dict, type Lang } from "./i18n";

/**
 * Tiny browser-storage stores (no database, no server state).
 * Language lives in localStorage; consent lives in sessionStorage so each
 * new visit sees the disclaimer again.
 */
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

const LANG_KEY = "tb.lang";
const CONSENT_KEY = "tb.consent";
let consentRevision = 0;

function readLang(): Lang {
  try {
    return window.localStorage.getItem(LANG_KEY) === "en" ? "en" : "vi";
  } catch {
    return "vi";
  }
}

export function setLang(lang: Lang) {
  try {
    window.localStorage.setItem(LANG_KEY, lang);
  } catch {
    // Storage blocked: language just won't persist.
  }
  document.documentElement.lang = lang;
  notify();
}

/** Vietnamese first: "vi" is the default and the server-rendered language. */
export function useLang() {
  const lang = useSyncExternalStore<Lang>(subscribe, readLang, () => "vi");
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  return { lang, t: dict[lang] };
}

function readConsent(): boolean {
  try {
    return window.sessionStorage.getItem(CONSENT_KEY) === "yes";
  } catch {
    return false;
  }
}

export function giveConsent() {
  try {
    window.sessionStorage.setItem(CONSENT_KEY, "yes");
  } catch {
    // Storage blocked: the consent screen will show again.
  }
  notify();
}

export function clearConsent() {
  consentRevision++;
  try { window.sessionStorage.removeItem(CONSENT_KEY); } catch { /* blocked storage */ }
  notify();
}

/** Remount the consent form after reset, including preserved App Router pages. */
export function useConsentRevision(): number {
  return useSyncExternalStore(subscribe, () => consentRevision, () => 0);
}

export function useConsent(): boolean {
  return useSyncExternalStore(subscribe, readConsent, () => false);
}
