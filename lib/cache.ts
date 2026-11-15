import { ExtractResultSchema, type ExtractResult } from "./schema";
import manifest from "../demo-cache/index.json";

/** Only curated, public sample bytes can match. Uploaded images are never saved. */
export async function imageHash(input: string | ArrayBuffer): Promise<string> {
  const bytes = typeof input === "string" ? Uint8Array.from(atob(input), (c) => c.charCodeAt(0)) : new Uint8Array(input);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function cachedExtraction(hash: string): ExtractResult | null {
  const entry = manifest.entries.find((e) => e.hash === hash);
  if (!entry) return null;
  const parsed = ExtractResultSchema.safeParse(entry.result);
  return parsed.success ? parsed.data : null;
}

export async function extractWithCache(image: string, mediaType: string, demoMode: boolean, originalHash?: string, signal?: AbortSignal): Promise<ExtractResult> {
  const cached = cachedExtraction(originalHash ?? await imageHash(image));
  if (demoMode) return cached ?? { status: "error", code: "bad_request", message: "No demo cache for this image." };
  try {
    const response = await fetch("/api/extract", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ image, mediaType }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(90_000)]) : AbortSignal.timeout(90_000),
    });
    const parsed = ExtractResultSchema.safeParse(await response.json());
    if (!response.ok || !parsed.success || parsed.data.status === "error") {
      return cached ?? (parsed.success && parsed.data.status === "error" ? parsed.data : { status: "error", code: "api_error", message: "Extraction request failed" });
    }
    return parsed.data;
  } catch {
    return cached ?? { status: "error", code: "network", message: "Request failed" };
  }
}

export const demoScenarios = manifest.scenarios;
export const demoEntries = manifest.entries;
