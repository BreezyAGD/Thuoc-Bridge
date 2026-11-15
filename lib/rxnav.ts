import staticCacheJson from "../data/rxnorm-cache.json";

/**
 * Minimal client for the NLM RxNav REST API (free, no key, <= 20 req/s).
 * https://lhncbc.nlm.nih.gov/RxNav/APIs/
 *
 * Lookup order: committed cache (data/rxnorm-cache.json) -> memory -> network.
 * The committed cache is what lets the demo run with no wifi. Refresh it with
 * RXNAV_RECORD=1 (see scripts/normalize-check.ts).
 *
 * NOTE: the RxNav drug-interaction API was discontinued in January 2024 and is
 * deliberately not used anywhere in this project.
 */
const BASE = "https://rxnav.nlm.nih.gov/REST";
const staticCache = staticCacheJson as Record<string, unknown>;
const memory = new Map<string, Promise<unknown>>();
const recorded: Record<string, unknown> = {};

export class RxNavUnavailableError extends Error {}

// Simple semaphore: stay far below the 20 req/s limit.
const MAX_CONCURRENT = 4;
let active = 0;
const waiting: (() => void)[] = [];
async function limited<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

let writeChain: Promise<void> = Promise.resolve();
function record(path: string, json: unknown) {
  if (process.env.RXNAV_RECORD !== "1") return;
  recorded[path] = json;
  writeChain = writeChain.then(async () => {
    const { writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const merged = { ...staticCache, ...recorded };
    const sorted = Object.fromEntries(Object.keys(merged).sort().map((k) => [k, merged[k]]));
    await writeFile(
      join(process.cwd(), "data", "rxnorm-cache.json"),
      JSON.stringify(sorted, null, 1) + "\n",
    );
  });
}
export const flushRecordedCache = () => writeChain;

async function get(path: string): Promise<unknown> {
  if (path in staticCache) return staticCache[path];
  let pending = memory.get(path);
  if (!pending) {
    pending = limited(async () => {
      let res: Response;
      try {
        res = await fetch(BASE + path, {
          headers: { accept: "application/json" },
          signal: AbortSignal.timeout(8000),
        });
      } catch {
        throw new RxNavUnavailableError("RxNav is unreachable");
      }
      if (!res.ok) throw new RxNavUnavailableError(`RxNav returned ${res.status}`);
      const json: unknown = await res.json();
      record(path, json);
      return json;
    });
    memory.set(path, pending);
    pending.catch(() => memory.delete(path));
  }
  return pending;
}

export type RxConcept = { rxcui: string; name: string; tty: string };
export type AtcClass = { id: string; name: string };

/**
 * Name lookup. mode 0 = exact string match on a RxNorm name or synonym (safe).
 * mode 1 = RxNav "normalized" match, which stems and expands abbreviations and
 * can return unrelated concepts ("chlorpheniramin" also returns chlorine), so
 * callers must gate its results. Returns every matching RxCUI.
 */
export async function findRxcuisByName(name: string, mode: 0 | 1 = 0): Promise<string[]> {
  const json = (await get(`/rxcui.json?name=${encodeURIComponent(name)}&search=${mode}`)) as {
    idGroup?: { rxnormId?: string[] };
  };
  return json.idGroup?.rxnormId ?? [];
}

export async function getProperties(rxcui: string): Promise<RxConcept | null> {
  const json = (await get(`/rxcui/${rxcui}/properties.json`)) as {
    properties?: { rxcui: string; name: string; tty: string };
  } | null;
  const p = json?.properties;
  return p ? { rxcui: p.rxcui, name: p.name, tty: p.tty } : null;
}

/** Ingredient-level (TTY=IN) concepts behind a brand, salt form or combination. */
export async function getRelatedIngredients(rxcui: string): Promise<RxConcept[]> {
  const json = (await get(`/rxcui/${rxcui}/related.json?tty=IN`)) as {
    relatedGroup?: {
      conceptGroup?: { tty: string; conceptProperties?: { rxcui: string; name: string; tty: string }[] }[];
    };
  };
  return (json.relatedGroup?.conceptGroup ?? [])
    .flatMap((g) => g.conceptProperties ?? [])
    .map((c) => ({ rxcui: c.rxcui, name: c.name, tty: c.tty }));
}

export type ApproxCandidate = { rxcui: string; name: string | null; score: number };

/** Fuzzy match. Results are NOT trusted on their own: see normalize.ts for the gate. */
export async function approximateTerm(term: string): Promise<ApproxCandidate[]> {
  const json = (await get(
    `/approximateTerm.json?term=${encodeURIComponent(term)}&maxEntries=6`,
  )) as {
    approximateGroup?: { candidate?: { rxcui: string; name?: string; score: string }[] };
  };
  const seen = new Map<string, ApproxCandidate>();
  for (const c of json.approximateGroup?.candidate ?? []) {
    const existing = seen.get(c.rxcui);
    if (!existing) seen.set(c.rxcui, { rxcui: c.rxcui, name: c.name ?? null, score: Number(c.score) });
    else if (!existing.name && c.name) existing.name = c.name;
  }
  return [...seen.values()];
}

/** ATC level 1-4 classes for exactly this ingredient (combination products are filtered out). */
export async function getAtcClasses(rxcui: string): Promise<AtcClass[]> {
  const json = (await get(`/rxclass/class/byRxcui.json?rxcui=${rxcui}&relaSource=ATC`)) as {
    rxclassDrugInfoList?: {
      rxclassDrugInfo?: {
        minConcept: { rxcui: string };
        rxclassMinConceptItem: { classId: string; className: string };
      }[];
    };
  };
  const out = new Map<string, AtcClass>();
  for (const info of json.rxclassDrugInfoList?.rxclassDrugInfo ?? []) {
    if (info.minConcept.rxcui !== rxcui) continue;
    const { classId, className } = info.rxclassMinConceptItem;
    out.set(classId, { id: classId, name: className });
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}
