"use client";

import { useSyncExternalStore } from "react";
import { prepareImage } from "./image";
import type { ReconcileResponse } from "./reconcile";
import type { ExtractResult } from "./schema";
import { cachedExtraction, extractWithCache, imageHash, demoScenarios, demoEntries } from "./cache";

/**
 * One visit's state, shared by the patient and clinician views on the same
 * device. No database: it lives in memory and in sessionStorage, so it is gone
 * when the tab closes. Full-size photos stay in memory only.
 */
export type VisitProduct = {
  id: string;
  thumbUrl: string | null;
  state: "reading" | "done" | "image_error";
  result?: ExtractResult;
};

export type VisitUsMed = { id: string; text: string };

export type Visit = {
  demoMode: boolean;
  demoScenario: string | null;
  products: VisitProduct[];
  usMeds: VisitUsMed[];
  recon: ReconcileResponse | null;
  reconState: "idle" | "loading" | "error";
};

const EMPTY: Visit = { demoMode: false, demoScenario: null, products: [], usMeds: [], recon: null, reconState: "idle" };
// Bump the suffix whenever the stored shape changes, so stale visits are dropped.
const STORAGE_KEY = "tb.visit.v5";

let visit: Visit = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
/** Full downscaled photos by product id, for the clinician's "verify" panel. */
const images = new Map<string, string>();
const extractionControllers = new Map<string, AbortController>();
let visitEpoch = 0;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Visit>;
    visit = {
      demoMode: saved.demoMode === true,
      demoScenario: saved.demoScenario ?? null,
      products: (saved.products ?? []).filter((p) => p.state !== "reading"),
      usMeds: saved.usMeds ?? [],
      recon: saved.recon ?? null,
      reconState: "idle",
    };
    // A restored visit without results (e.g. the tab was reloaded mid-request) is re-run.
    if (!visit.recon && (visit.products.length > 0 || visit.usMeds.length > 0)) {
      setTimeout(scheduleReconcile, 0);
    }
  } catch {
    // Corrupt or blocked storage: start a fresh visit.
  }
}

function set(next: Visit) {
  visit = next;
  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        products: next.products.filter((p) => p.state !== "reading"),
        demoMode: next.demoMode,
        demoScenario: next.demoScenario,
        usMeds: next.usMeds,
        recon: next.recon,
      }),
    );
  } catch {
    // Quota or blocked storage: the visit still works in memory.
  }
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function snapshot(): Visit {
  load();
  return visit;
}

export function useVisit(): Visit {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

export function getImage(id: string): string | null {
  return images.get(id) ?? (visit.demoMode ? visit.products.find((p) => p.id === id)?.thumbUrl ?? null : null);
}

function patchProduct(id: string, patch: Partial<VisitProduct>) {
  if (!visit.products.some((p) => p.id === id)) return;
  set({ ...visit, products: visit.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
}

let reconSeq = 0;
let reconController: AbortController | undefined;
let reconTimer: ReturnType<typeof setTimeout> | undefined;

/** Re-run guard + RxNorm normalization for everything in the visit. */
function scheduleReconcile() {
  reconSeq++;
  reconController?.abort();
  clearTimeout(reconTimer);
  // Invalidate old results immediately, including during the debounce window.
  set({ ...visit, recon: null, reconState: visit.products.length || visit.usMeds.length ? "loading" : "idle" });
  reconTimer = setTimeout(async () => {
    const seq = ++reconSeq;
    const done = visit.products.filter((p) => p.state === "done");
    if (done.length === 0 && visit.usMeds.length === 0) {
      set({ ...visit, recon: null, reconState: "idle" });
      return;
    }
    const controller = new AbortController();
    reconController = controller;
    set({ ...visit, reconState: "loading" });
    try {
      const res = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          products: done.map((p) => ({
            id: p.id,
            extraction: p.result?.status === "ok" ? p.result.extraction : null,
          })),
          usMeds: visit.usMeds,
        }),
      });
      if (!res.ok) throw new Error(`reconcile ${res.status}`);
      const recon = (await res.json()) as ReconcileResponse;
      if (seq === reconSeq) set({ ...visit, recon, reconState: "idle" });
    } catch {
      if (seq === reconSeq) set({ ...visit, reconState: "error" });
    }
  }, 150);
}

async function callExtract(image: string, mediaType: string, originalHash: string, signal: AbortSignal): Promise<ExtractResult> {
  return extractWithCache(image, mediaType, visit.demoMode, originalHash, signal);
}

/** Each photo is one product. Photos are read in parallel. */
export async function addPhotos(files: FileList | File[] | null) {
  if (!files) return;
  load();
  const epoch = visitEpoch;
  await Promise.all(
    Array.from(files).map(async (file) => {
      const id = crypto.randomUUID();
      set({ ...visit, products: [...visit.products, { id, thumbUrl: null, state: "reading" }] });
      let prepared;
      try {
        prepared = await prepareImage(file);
      } catch {
        patchProduct(id, { state: "image_error" });
        return;
      }
      if (epoch !== visitEpoch || !visit.products.some((p) => p.id === id)) return;
      images.set(id, prepared.dataUrl);
      patchProduct(id, { thumbUrl: prepared.thumbUrl });
      const originalHash = await imageHash(await file.arrayBuffer());
      if (epoch !== visitEpoch || !visit.products.some((p) => p.id === id)) return;
      const controller = new AbortController();
      extractionControllers.set(id, controller);
      try {
        const result = await callExtract(prepared.base64, prepared.mediaType, originalHash, controller.signal);
        if (epoch !== visitEpoch || !visit.products.some((p) => p.id === id)) return;
        patchProduct(id, { state: "done", result });
        scheduleReconcile();
      } finally {
        extractionControllers.delete(id);
      }
    }),
  );
}

export function removeProduct(id: string) {
  extractionControllers.get(id)?.abort();
  extractionControllers.delete(id);
  images.delete(id);
  set({ ...visit, products: visit.products.filter((p) => p.id !== id) });
  scheduleReconcile();
}

export function addUsMed(text: string) {
  const trimmed = text.trim().slice(0, 120);
  if (!trimmed) return;
  load();
  set({ ...visit, usMeds: [...visit.usMeds, { id: crypto.randomUUID(), text: trimmed }] });
  scheduleReconcile();
}

export function removeUsMed(id: string) {
  set({ ...visit, usMeds: visit.usMeds.filter((m) => m.id !== id) });
  scheduleReconcile();
}

export function resetVisit() {
  clearTimeout(reconTimer);
  reconController?.abort();
  reconController = undefined;
  for (const controller of extractionControllers.values()) controller.abort();
  extractionControllers.clear();
  images.clear();
  reconSeq++;
  visitEpoch++;
  loaded = true;
  set(EMPTY);
  try {
    // Remove current and older app visit formats, without clearing unrelated storage.
    for (let i = window.sessionStorage.length - 1; i >= 0; i--) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith("tb.visit.")) window.sessionStorage.removeItem(key);
    }
  } catch {
    // In-memory reset still works when browser storage is blocked.
  }
}

/** Loading a demo starts a fresh synthetic visit; no image is sent to the API. */
export async function loadDemo(scenarioId = demoScenarios[0].id) {
  const scenario = demoScenarios.find((s) => s.id === scenarioId);
  if (!scenario) return;
  resetVisit();
  const products: VisitProduct[] = scenario.hashes.map((hash, i) => {
    const entry = demoEntries.find((e) => e.hash === hash)!;
    const id = `demo-${i}`;
    images.set(id, entry.photo);
    return { id, thumbUrl: entry.photo, state: "done", result: cachedExtraction(hash)! };
  });
  set({ ...EMPTY, demoMode: true, demoScenario: scenario.id, products, usMeds: scenario.usMeds.map((text, i) => ({ id: `u${i}`, text })) });
  scheduleReconcile();
}

export function retryReconcile() {
  scheduleReconcile();
}
