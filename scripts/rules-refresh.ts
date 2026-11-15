/**
 * Fill in the machine-checkable parts of data/interactions.json:
 *
 *   npm run rules:refresh
 *
 * 1. Every ingredient named in a group gets its RxNorm ingredient RxCUI from
 *    RxNav (exact name match, must be an ingredient-level concept).
 * 2. Every rule's cited source is fetched (openFDA drug label API, or a web
 *    page) and searched for the rule's `terms`. If all terms are found, the
 *    surrounding sentence is stored as `evidence` so a reviewer can see the
 *    source wording next to our paraphrase.
 *
 * This does NOT verify the rule clinically. That is what `verified_by` is for.
 * It only proves the source exists and says something about the stated terms.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { findRxcuisByName, getProperties } from "../lib/rxnav";

const FILE = join(process.cwd(), "data", "interactions.json");
const UA = "thuoc-bridge-hackathon-rules-check/0.1";

type Source = {
  kind: "openfda" | "web";
  label: string;
  query?: string;
  url?: string;
  fetch_url?: string;
  terms: string[];
};

type Evidence = {
  status: "confirmed" | "not_found" | "unreachable";
  quote: string | null;
  section: string | null;
  document: string | null;
  link: string | null;
  checked_on: string;
};

const today = new Date().toISOString().slice(0, 10);

function clean(text: string): string {
  return text
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** The sentence(s) around the first term, capped at ~360 characters. */
function quoteAround(text: string, term: string): string {
  const at = text.toLowerCase().indexOf(term.toLowerCase());
  let start = Math.max(0, at - 220);
  let end = Math.min(text.length, at + term.length + 220);
  const before = text.slice(start, at);
  const sentenceStart = Math.max(before.lastIndexOf(". "), before.lastIndexOf("• "), before.lastIndexOf(": "));
  if (sentenceStart !== -1) start += sentenceStart + 2;
  const after = text.slice(at + term.length, end);
  const sentenceEnd = after.indexOf(". ");
  if (sentenceEnd !== -1) end = at + term.length + sentenceEnd + 1;
  return (start > 0 && sentenceStart === -1 ? "…" : "") + text.slice(start, end).trim() + (sentenceEnd === -1 && end < text.length ? "…" : "");
}

const hasAll = (text: string, terms: string[]) => {
  const lower = text.toLowerCase();
  return terms.every((t) => lower.includes(t.toLowerCase()));
};

async function openFdaEvidence(source: Source): Promise<{ url: string; evidence: Evidence }> {
  const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:%22${encodeURIComponent(source.query!)}%22&limit=15`;
  const base = { quote: null, section: null, document: null, link: null, checked_on: today };
  let json: { results?: Record<string, unknown>[] };
  try {
    const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) return { url, evidence: { status: "unreachable", ...base } };
    json = (await res.json()) as typeof json;
  } catch {
    return { url, evidence: { status: "unreachable", ...base } };
  }

  type Openfda = { generic_name?: string[]; brand_name?: string[] };
  const results = json.results ?? [];
  // Prefer single-ingredient labels for the queried drug over combination products.
  const rank = (r: Record<string, unknown>) => {
    const names = ((r.openfda as Openfda | undefined)?.generic_name ?? []).map((n) => n.toLowerCase());
    return names.some((n) => n === source.query!.toLowerCase() || n.startsWith(`${source.query!.toLowerCase()} `)) ? 0 : 1;
  };
  for (const r of [...results].sort((a, b) => rank(a) - rank(b))) {
    for (const [section, value] of Object.entries(r)) {
      if (!Array.isArray(value) || typeof value[0] !== "string") continue;
      if (/_table$|^spl_|^package_label/.test(section)) continue;
      const text = clean((value as string[]).join(" "));
      if (!hasAll(text, source.terms)) continue;
      const openfda = r.openfda as Openfda | undefined;
      const setId = r.set_id as string | undefined;
      return {
        url,
        evidence: {
          status: "confirmed",
          quote: quoteAround(text, source.terms[0]),
          section,
          document: `${openfda?.brand_name?.[0] ?? "?"} (${openfda?.generic_name?.[0] ?? "?"}), label dated ${r.effective_time ?? "?"}`,
          link: setId ? `https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=${setId}` : null,
          checked_on: today,
        },
      };
    }
  }
  return { url, evidence: { status: "not_found", ...base } };
}

async function webEvidence(source: Source): Promise<{ url: string; evidence: Evidence }> {
  const url = source.url!;
  const base = { quote: null, section: null, document: source.label, link: url, checked_on: today };
  try {
    const res = await fetch(source.fetch_url ?? url, {
      headers: { "user-agent": "Mozilla/5.0 (compatible; rules-check)" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return { url, evidence: { status: "unreachable", ...base } };
    const text = clean((await res.text()).replace(/\\u003c[^\\]*?\\u003e/g, " ").replace(/\\n/g, " "));
    if (!hasAll(text, source.terms)) return { url, evidence: { status: "not_found", ...base } };
    return { url, evidence: { status: "confirmed", ...base, quote: quoteAround(text, source.terms[0]) } };
  } catch {
    return { url, evidence: { status: "unreachable", ...base } };
  }
}

async function main() {
  const data = JSON.parse(await readFile(FILE, "utf8"));
  let problems = 0;

  console.log("== RxCUIs");
  for (const [key, group] of Object.entries<{ ingredients?: { name: string; rxcui: string | null }[] }>(data.groups)) {
    for (const ing of group.ingredients ?? []) {
      const props = (await Promise.all((await findRxcuisByName(ing.name.toLowerCase(), 0)).map(getProperties))).filter(
        (p) => p?.tty === "IN",
      );
      if (props.length !== 1) {
        problems++;
        ing.rxcui = null;
        console.log(`  PROBLEM ${key}: "${ing.name}" matched ${props.length} RxNorm ingredients`);
      } else {
        ing.rxcui = props[0]!.rxcui;
        console.log(`  ${key.padEnd(24)} ${ing.name.padEnd(30)} ${ing.rxcui}  (${props[0]!.name})`);
      }
    }
  }

  console.log("\n== Source evidence");
  for (const rule of data.rules as { id: string; source: Source & { url?: string }; evidence: Evidence | null }[]) {
    const { url, evidence } =
      rule.source.kind === "openfda" ? await openFdaEvidence(rule.source) : await webEvidence(rule.source);
    rule.source.url = url;
    rule.evidence = evidence;
    if (evidence.status !== "confirmed") problems++;
    console.log(`  ${evidence.status.toUpperCase().padEnd(11)} ${rule.id.padEnd(32)} ${evidence.section ?? ""}`);
    if (evidence.quote) console.log(`              "${evidence.quote.slice(0, 230)}${evidence.quote.length > 230 ? "…" : ""}"`);
  }

  await writeFile(FILE, JSON.stringify(data, null, 2) + "\n");
  console.log(`\n${problems === 0 ? "All RxCUIs resolved and all sources confirmed." : `${problems} problem(s) to fix above.`}`);
  if (problems) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
