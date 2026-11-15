import herbalJson from "../data/herbal-vi.json";
import synonymsJson from "../data/synonyms.json";
import {
  approximateTerm,
  findRxcuisByName,
  getAtcClasses,
  getProperties,
  getRelatedIngredients,
  RxNavUnavailableError,
  type AtcClass,
  type RxConcept,
} from "./rxnav";
import { fold, levenshtein, lowerNfc } from "./text";

/**
 * Step B: ingredient name -> RxNorm ingredient (RxCUI). Deterministic, no LLM.
 *
 * Match types, strongest first:
 *   exact       the printed name is itself a RxNorm name or synonym
 *   synonym     curated non-US name (data/synonyms.json)
 *   herbal_map  curated Vietnamese herbal name (data/herbal-vi.json)
 *   spelling    a Vietnamese pharmacopoeia spelling ("clorpheniramin") that is
 *               within a small edit distance of a RxNorm name
 *   approximate RxNav fuzzy match, accepted only within the same edit distance
 *   none        unresolved -> shown as "Unverified"
 */
export type MatchType = "exact" | "synonym" | "herbal_map" | "spelling" | "approximate" | "none";

export type Concept = { rxcui: string; name: string; atc: AtcClass[] };

export type Resolution = {
  input: string;
  match: MatchType;
  /** The RxNorm name that was matched. */
  matched_term: string | null;
  concepts: Concept[];
  /** Human-readable caveat for the clinician, if any. */
  note: string | null;
  /** True when RxNav could not be reached, as opposed to "not found". */
  rxnav_unavailable?: boolean;
};

const SYNONYMS = synonymsJson.synonyms as Record<string, string>;
const HERBS = herbalJson.herbs as {
  vi: string;
  latin: string;
  english: string;
  rxnorm_terms: string[];
  verified_by: string | null;
}[];

/** Salt / hydrate words that are not part of the active moiety (folded). */
const SALT_WORDS = new Set([
  "hydroclorid", "hydrochlorid", "hydrochloride", "hcl", "dihydroclorid", "dihydrochloride",
  "hydrobromid", "hydrobromide", "hbr",
  "maleat", "maleate", "sulfat", "sulfate", "sulphate", "phosphat", "phosphate",
  "citrat", "citrate", "acetat", "acetate", "tartrat", "tartrate", "bitartrat", "bitartrate",
  "fumarat", "fumarate", "succinat", "succinate", "besilat", "besylate", "mesilat", "mesylate",
  "natri", "sodium", "kali", "potassium", "calci", "calcium", "magnesi", "magnesium",
  "trihydrat", "trihydrate", "dihydrat", "dihydrate", "monohydrat", "monohydrate",
  "mononitrat", "mononitrate", "nitrat", "nitrate", "bromid", "bromide", "clorid", "chloride",
]);

/** Words on Vietnamese herbal labels that describe the preparation or plant part, not the plant. */
const HERBAL_PREP = /^(cao khô|cao đặc|cao lỏng|cao|bột|chiết xuất|tinh chất|tinh dầu|dịch chiết)\s+/;
const PLANT_PART = /^(lá|rễ|củ|thân rễ|quả|hạt|hoa)\s+/;

const TTY_RANK: Record<string, number> = { IN: 0, PIN: 1, MIN: 2, BN: 3 };

/** How far a RxNorm name may differ from the printed term and still count as the same word. */
const allowedDistance = (term: string) => Math.max(1, Math.floor(term.length * 0.2));

async function withAtc(concepts: RxConcept[]): Promise<Concept[]> {
  return Promise.all(
    concepts.map(async (c) => ({ rxcui: c.rxcui, name: c.name, atc: await getAtcClasses(c.rxcui) })),
  );
}

/** Any RxNorm concept -> its ingredient-level concept(s). */
async function toIngredients(rxcui: string): Promise<RxConcept[]> {
  const props = await getProperties(rxcui);
  if (!props) return [];
  if (props.tty === "IN") return [props];
  return getRelatedIngredients(rxcui);
}

async function propertiesOf(ids: string[], max: number): Promise<RxConcept[]> {
  const props = await Promise.all(ids.slice(0, max).map(getProperties));
  return props.filter((p): p is RxConcept => p !== null);
}

type Lookup = { concepts: Concept[]; name: string; distance: number };

/**
 * RxNorm name lookup, resolved down to ingredients.
 * 1. Exact string match on a RxNorm name or synonym.
 * 2. Unless exactOnly: RxNav's normalized match, then its fuzzy match, each
 *    kept only when the concept's own name is within a small edit distance of
 *    the term. RxNav's own ranking is not safe: its normalized search maps
 *    "chlorpheniramin" to chlorine, and its fuzzy search maps "dinh lang"
 *    (đinh lăng) to the unrelated "Dinh huong".
 */
async function lookup(term: string, exactOnly = false): Promise<Lookup | null> {
  const exactProps = await propertiesOf(await findRxcuisByName(term, 0), 5);
  exactProps.sort((a, b) => (TTY_RANK[a.tty] ?? 9) - (TTY_RANK[b.tty] ?? 9));
  for (const p of exactProps) {
    const ingredients = await toIngredients(p.rxcui);
    if (ingredients.length) return { concepts: await withAtc(ingredients), name: p.name, distance: 0 };
  }
  if (exactOnly || term.length < 5) return null;

  const allowed = allowedDistance(term);
  const normalized = await propertiesOf(await findRxcuisByName(term, 1), 8);
  const fuzzy = normalized.some((p) => levenshtein(fold(p.name), term) <= allowed)
    ? []
    : await propertiesOf((await approximateTerm(term)).map((c) => c.rxcui), 3);
  const near = [...normalized, ...fuzzy]
    .map((p) => ({ p, distance: levenshtein(fold(p.name), term) }))
    .filter((x) => x.distance <= allowed)
    .sort((a, b) => a.distance - b.distance || (TTY_RANK[a.p.tty] ?? 9) - (TTY_RANK[b.p.tty] ?? 9));
  for (const { p, distance } of near) {
    const ingredients = await toIngredients(p.rxcui);
    if (ingredients.length) return { concepts: await withAtc(ingredients), name: p.name, distance };
  }
  return null;
}

/** Vietnamese pharmacopoeia spellings -> likely international spellings. */
export function spellingVariants(term: string): string[] {
  const reordered = term.replace(/^acid (.+)$/, "$1 acid");
  const inner = reordered
    .replace(/\bclo/g, "chlo")
    .replace(/cilin\b/g, "cillin")
    .replace(/\bcef(?=a)/g, "ceph");
  const suffix = (s: string) =>
    s
      .replace(/in\b/g, "ine")
      .replace(/([a-z]{3})on\b/g, "$1one")
      .replace(/([a-z]{3})(id|yd)\b/g, "$1ide")
      .replace(/([a-z]{3})at\b/g, "$1ate")
      .replace(/([a-z]{3})im\b/g, "$1ime")
      .replace(/([a-z]{3})ol\b/g, "$1ole");
  return [...new Set([reordered, inner, suffix(term), suffix(inner)])].filter((v) => v !== term);
}

function stripSalts(term: string): string {
  const kept = term.split(" ").filter((w) => !SALT_WORDS.has(w));
  return kept.length ? kept.join(" ") : term;
}

/** "Amoxicilin (dưới dạng Amoxicilin trihydrat)" -> ["Amoxicilin"]; "Cao bạch quả (Ginkgo biloba)" -> both parts. */
function candidatesFromLabel(input: string): string[] {
  const cleaned = input.replace(/[.…:;]+\s*$/g, "").trim();
  const main = cleaned.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  const inner = [...cleaned.matchAll(/\(([^)]*)\)/g)]
    .map((m) => m[1].trim())
    // Parentheses that describe the salt form or an equivalence are not synonyms.
    .filter((p) => p && !/^(dưới dạng|dạng|tương đương|tương ứng|as |equivalent|equiv\.|eq\.)/i.test(p))
    .filter((p) => !/^\d/.test(p));
  return [...new Set([main, ...inner].filter(Boolean))];
}

const NONE = (input: string, note: string | null = null): Resolution => ({
  input,
  match: "none",
  matched_term: null,
  concepts: [],
  note,
});

async function resolveCandidate(input: string, candidate: string): Promise<Resolution | null> {
  const lower = lowerNfc(candidate);
  const folded = fold(candidate);

  // 1. Curated Vietnamese herbal names (matched with diacritics: tỏi is not tôi).
  const herbName = lower.replace(HERBAL_PREP, "").replace(PLANT_PART, "");
  const herb = HERBS.find((h) => new RegExp(`(^|\\s)${h.vi}($|\\s)`, "u").test(herbName));
  if (herb) {
    const pending = herb.verified_by ? "" : " Herbal mapping pending pharmacist review.";
    for (const term of herb.rxnorm_terms) {
      const hit = await lookup(fold(term), true);
      if (hit) {
        return {
          input,
          match: "herbal_map",
          matched_term: hit.name,
          concepts: hit.concepts,
          note: `Vietnamese "${herb.vi}" = ${herb.latin} (${herb.english}).${pending}`,
        };
      }
    }
    return NONE(
      input,
      `Identified as ${herb.latin} (${herb.english}) from the curated herbal list, but RxNorm has no concept for it.${pending}`,
    );
  }

  const base = stripSalts(folded);

  // 2. Curated synonym, on the full name and on the name without salt words.
  for (const key of new Set([folded, base])) {
    const synonym = SYNONYMS[key];
    if (!synonym) continue;
    const hit = await lookup(synonym, true);
    if (hit) return { input, match: "synonym", matched_term: hit.name, concepts: hit.concepts, note: null };
  }

  // 3. The printed name is itself a RxNorm name (RxNorm maps salt forms to the ingredient).
  for (const term of new Set([folded, base])) {
    const hit = await lookup(term, true);
    if (hit) return { input, match: "exact", matched_term: hit.name, concepts: hit.concepts, note: null };
  }

  // 4. Vietnamese spelling rules: the rewritten name must be an exact RxNorm name.
  for (const variant of spellingVariants(base)) {
    const hit = await lookup(variant, true);
    if (hit) {
      return {
        input,
        match: "spelling",
        matched_term: hit.name,
        concepts: hit.concepts,
        note: `Vietnamese spelling "${base}" read as "${hit.name}".`,
      };
    }
  }

  // 5. RxNav normalized / fuzzy search, gated by edit distance.
  const near = await lookup(base);
  if (near) {
    return {
      input,
      match: near.distance <= 1 ? "spelling" : "approximate",
      matched_term: near.name,
      concepts: near.concepts,
      note: `Closest RxNorm name to "${base}" is "${near.name}". Confirm against the box.`,
    };
  }
  return null;
}

async function safely(input: string, run: () => Promise<Resolution>): Promise<Resolution> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof RxNavUnavailableError) {
      return { ...NONE(input, "RxNorm lookup unavailable (network)."), rxnav_unavailable: true };
    }
    throw error;
  }
}

/** Resolve one ingredient name as printed on a label. */
export function normalizeIngredient(input: string): Promise<Resolution> {
  return safely(input, async () => {
    let herbalNote: Resolution | null = null;
    for (const candidate of candidatesFromLabel(input)) {
      const hit = await resolveCandidate(input, candidate);
      if (hit && hit.match !== "none") return hit;
      if (hit && !herbalNote) herbalNote = hit; // identified herb with no RxNorm concept
    }
    return herbalNote ?? NONE(input);
  });
}

const WEAKNESS: MatchType[] = ["exact", "synonym", "herbal_map", "spelling", "approximate"];

/** Resolve a US medicine typed by the patient or clinician: brand, generic or a combination. */
export function normalizeUsMed(input: string): Promise<Resolution> {
  return safely(input, async () => {
    const cleaned = fold(input)
      .replace(/\b\d+(?:[.,]\d+)?(?:\s*[-/]\s*\d+(?:[.,]\d+)?)*\s*(mg|mcg|g|ml|iu|units?|%)?(?=\s|$)/g, " ")
      .replace(/\b(tablets?|tabs?|capsules?|caps?|caplets?|pills?|er|xr|xl|sr|dr|oral|daily)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return NONE(input);

    const whole = await lookup(cleaned, true);
    if (whole) return { input, match: "exact", matched_term: whole.name, concepts: whole.concepts, note: null };

    const parts = cleaned.split(/\s*(?:\/|\+|&|,|\band\b|\bwith\b|-)\s*/).filter(Boolean);
    if (parts.length > 1) {
      const resolved = await Promise.all(parts.map((p) => resolveCandidate(p, p)));
      if (resolved.every((r) => r && r.match !== "none")) {
        const hits = resolved as Resolution[];
        const concepts = new Map<string, Concept>();
        for (const r of hits) for (const c of r.concepts) concepts.set(c.rxcui, c);
        const weakest = hits
          .map((r) => r.match)
          .sort((a, b) => WEAKNESS.indexOf(b) - WEAKNESS.indexOf(a))[0];
        return {
          input,
          match: weakest,
          matched_term: hits.map((r) => r.matched_term).join(" + "),
          concepts: [...concepts.values()],
          note: hits.map((r) => r.note).filter(Boolean).join(" ") || null,
        };
      }
    }

    return (await resolveCandidate(input, cleaned)) ?? NONE(input);
  });
}
