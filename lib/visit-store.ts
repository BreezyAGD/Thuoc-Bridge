"use client";

import { useSyncExternalStore } from "react";
import { prepareImage } from "./image";
import type { ReconcileResponse } from "./reconcile";
import type { ExtractResult } from "./schema";

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
  products: VisitProduct[];
  usMeds: VisitUsMed[];
  recon: ReconcileResponse | null;
  reconState: "idle" | "loading" | "error";
};

const EMPTY: Visit = { products: [], usMeds: [], recon: null, reconState: "idle" };
// Bump the suffix whenever the stored shape changes, so stale visits are dropped.
const STORAGE_KEY = "tb.visit.v3";

let visit: Visit = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
/** Full downscaled photos by product id, for the clinician's "verify" panel. */
const images = new Map<string, string>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Visit>;
    visit = {
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
  return images.get(id) ?? null;
}

function patchProduct(id: string, patch: Partial<VisitProduct>) {
  set({ ...visit, products: visit.products.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
}

let reconSeq = 0;
let reconTimer: ReturnType<typeof setTimeout> | undefined;

/** Re-run guard + RxNorm normalization for everything in the visit. */
function scheduleReconcile() {
  clearTimeout(reconTimer);
  reconTimer = setTimeout(async () => {
    const seq = ++reconSeq;
    const done = visit.products.filter((p) => p.state === "done");
    if (done.length === 0 && visit.usMeds.length === 0) {
      set({ ...visit, recon: null, reconState: "idle" });
      return;
    }
    set({ ...visit, reconState: "loading" });
    try {
      const res = await fetch("/api/reconcile", {
        method: "POST",
        headers: { "content-type": "application/json" },
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

async function callExtract(image: string, mediaType: string): Promise<ExtractResult> {
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image, mediaType }),
    });
    return (await res.json()) as ExtractResult;
  } catch {
    return { status: "error", code: "network", message: "Request failed" };
  }
}

/** Each photo is one product. Photos are read in parallel. */
export async function addPhotos(files: FileList | File[] | null) {
  if (!files) return;
  load();
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
      images.set(id, prepared.dataUrl);
      patchProduct(id, { thumbUrl: prepared.thumbUrl });
      const result = await callExtract(prepared.base64, prepared.mediaType);
      patchProduct(id, { state: "done", result });
      scheduleReconcile();
    }),
  );
}

export function removeProduct(id: string) {
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
  images.clear();
  reconSeq++;
  set(EMPTY);
}

export function retryReconcile() {
  scheduleReconcile();
}
