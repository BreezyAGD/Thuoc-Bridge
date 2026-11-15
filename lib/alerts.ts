import rulesJson from "../data/interactions.json";
import type { ConfidenceLevel, ProductRow, UsMedRow } from "./reconcile";

/**
 * Step C: alerts. Deterministic and curated.
 *
 * An alert is produced only when RxNorm-normalized ingredients match a rule in
 * data/interactions.json, or when the same RxCUI appears in two products. No
 * LLM is involved, and nothing here can invent an interaction.
 *
 * This is NOT a complete interaction screen: it checks a short curated list.
 */
export type Severity = "high" | "moderate" | "low" | "info";
export type AlertKind = "duplicate_ingredient" | "duplicate_class" | "interaction" | "flag" | "unresolved";

export type AlertItem = {
  source_id: string;
  source_kind: "photo" | "us_med";
  /** Brand as photographed, or the US medicine as typed. */
  source_label: string;
  /** As printed on the label (photo) or null for typed US medicines. */
  printed_name: string | null;
  ingredient: string;
  rxcui: string;
  strength: string | null;
  confidence: ConfidenceLevel;
};

export type AlertEvidence = {
  quote: string;
  section: string | null;
  document: string | null;
  link: string | null;
  checked_on: string;
};

export type Alert = {
  id: string;
  rule_id: string;
  kind: AlertKind;
  severity: Severity;
  title: string;
  /** One-line rationale for the clinician. */
  rationale: string;
  mechanism: string | null;
  involved: AlertItem[];
  /** For kind "unresolved": what could not be identified. */
  unresolved: { source_label: string; detail: string }[];
  source: { label: string; url: string } | null;
  evidence: AlertEvidence | null;
  /** Curated rules need a named reviewer; automatic identity matches do not. */
  curated: boolean;
  verified_by: string | null;
  /** True when an involved ingredient rests on a low-confidence match. */
  low_confidence: boolean;
  /** Pre-written, reviewed wording that is safe to show a patient. */
  patient: { vi: string; en: string };
};

type Group = { label: string; atc?: string[]; ingredients?: { name: string; rxcui: string | null }[] };
type Rule = {
  id: string;
  type: "duplicate_ingredient" | "duplicate_class" | "pair" | "flag";
  a: string[];
  b?: string[];
  only_source?: "photo" | "us_med";
  severity: Severity;
  title: string;
  clinician_en: string;
  mechanism: string;
  patient_key: string;
  source: { label: string; url?: string };
  evidence: {
    status: string;
    quote: string | null;
    section: string | null;
    document: string | null;
    link: string | null;
    checked_on: string;
  } | null;
  verified_by: string | null;
};

const GROUPS = rulesJson.groups as Record<string, Group>;
const RULES = rulesJson.rules as Rule[];
const PATIENT = rulesJson.patient_messages as Record<string, { vi: string; en: string }>;

export const CURATED_RULE_COUNT = RULES.length;
export const VERIFIED_RULE_COUNT = RULES.filter((r) => r.verified_by).length;

type Item = AlertItem & { atc: string[] };

const SEVERITY_ORDER: Severity[] = ["high", "moderate", "low", "info"];

function collectItems(products: ProductRow[], usMeds: UsMedRow[]): Item[] {
  const items: Item[] = [];
  for (const p of products) {
    for (const ing of p.ingredients) {
      if (ing.confidence === "unverified") continue;
      for (const c of ing.resolution.concepts) {
        items.push({
          source_id: p.id,
          source_kind: "photo",
          source_label: p.brand ?? "Unnamed photographed product",
          printed_name: ing.printed_name,
          ingredient: c.name,
          rxcui: c.rxcui,
          strength: ing.strength === null ? null : `${ing.strength}${ing.unit ? ` ${ing.unit}` : ""}`,
          confidence: ing.confidence,
          atc: c.atc.map((a) => a.id),
        });
      }
    }
  }
  for (const m of usMeds) {
    if (m.confidence === "unverified") continue;
    for (const c of m.resolution.concepts) {
      items.push({
        source_id: m.id,
        source_kind: "us_med",
        source_label: m.text,
        printed_name: null,
        ingredient: c.name,
        rxcui: c.rxcui,
        strength: null,
        confidence: m.confidence,
        atc: c.atc.map((a) => a.id),
      });
    }
  }
  return items;
}

function inGroups(item: Item, keys: string[]): boolean {
  return keys.some((key) => {
    const g = GROUPS[key];
    if (!g) return false;
    if (g.ingredients?.some((i) => i.rxcui === item.rxcui)) return true;
    return !!g.atc?.some((prefix) => item.atc.some((id) => id.startsWith(prefix)));
  });
}

const strip = (i: Item): AlertItem => ({
  source_id: i.source_id,
  source_kind: i.source_kind,
  source_label: i.source_label,
  printed_name: i.printed_name,
  ingredient: i.ingredient,
  rxcui: i.rxcui,
  strength: i.strength,
  confidence: i.confidence,
});

function uniqueItems(items: Item[]): AlertItem[] {
  const seen = new Set<string>();
  return items
    .filter((i) => {
      const key = `${i.source_id}:${i.rxcui}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(strip);
}

function fromRule(rule: Rule, kind: AlertKind, involved: Item[]): Alert {
  const e = rule.evidence;
  return {
    id: rule.id,
    rule_id: rule.id,
    kind,
    severity: rule.severity,
    title: rule.title,
    rationale: rule.clinician_en,
    mechanism: rule.mechanism,
    involved: uniqueItems(involved),
    unresolved: [],
    source: rule.source.url ? { label: rule.source.label, url: rule.source.url } : null,
    evidence:
      e && e.status === "confirmed" && e.quote
        ? { quote: e.quote, section: e.section, document: e.document, link: e.link, checked_on: e.checked_on }
        : null,
    curated: true,
    verified_by: rule.verified_by,
    low_confidence: involved.some((i) => i.confidence === "low"),
    patient: PATIENT[rule.patient_key] ?? PATIENT.tell_about_this,
  };
}

export function buildAlerts(products: ProductRow[], usMeds: UsMedRow[]): Alert[] {
  const items = collectItems(products, usMeds);
  const alerts: Alert[] = [];

  // 1. Same ingredient (same RxCUI) in two or more products.
  const byRxcui = new Map<string, Item[]>();
  for (const item of items) byRxcui.set(item.rxcui, [...(byRxcui.get(item.rxcui) ?? []), item]);
  for (const [rxcui, group] of byRxcui) {
    if (new Set(group.map((i) => i.source_id)).size < 2) continue;
    const rule = RULES.find((r) => r.type === "duplicate_ingredient" && inGroups(group[0], r.a));
    if (rule) {
      alerts.push(fromRule(rule, "duplicate_ingredient", group));
    } else {
      const name = group[0].ingredient;
      alerts.push({
        id: `duplicate-${rxcui}`,
        rule_id: "duplicate-ingredient",
        kind: "duplicate_ingredient",
        severity: "moderate",
        title: `${name.charAt(0).toUpperCase()}${name.slice(1)} in more than one product`,
        rationale:
          "The same active ingredient (same RxNorm concept) appears in each of these products. Check the combined dose and whether both are intended.",
        mechanism: null,
        involved: uniqueItems(group),
        unresolved: [],
        source: {
          label: `RxNorm ingredient ${rxcui}`,
          url: `https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxcui}`,
        },
        evidence: null,
        curated: false,
        verified_by: null,
        low_confidence: group.some((i) => i.confidence === "low"),
        patient: PATIENT.same_ingredient,
      });
    }
  }

  for (const rule of RULES) {
    if (rule.type === "duplicate_class") {
      // Two DIFFERENT ingredients of the same class, in different products.
      const members = items.filter((i) => inGroups(i, rule.a));
      const involved = members.filter((i) =>
        members.some((j) => j.rxcui !== i.rxcui && j.source_id !== i.source_id),
      );
      if (involved.length) alerts.push(fromRule(rule, "duplicate_class", involved));
    } else if (rule.type === "pair" && rule.b) {
      const as = items.filter((i) => inGroups(i, rule.a));
      const bs = items.filter((i) => inGroups(i, rule.b!));
      // Ingredients formulated together in one product are not flagged against each other.
      const paired = (x: Item, others: Item[]) =>
        others.some((y) => y.source_id !== x.source_id && y.rxcui !== x.rxcui);
      const involved = [...as.filter((x) => paired(x, bs)), ...bs.filter((y) => paired(y, as))];
      if (involved.length) alerts.push(fromRule(rule, "interaction", involved));
    } else if (rule.type === "flag") {
      const involved = items.filter(
        (i) => inGroups(i, rule.a) && (!rule.only_source || i.source_kind === rule.only_source),
      );
      if (involved.length) alerts.push(fromRule(rule, "flag", involved));
    }
  }

  // Anything not identified cannot be checked. Say so explicitly.
  const unresolved: Alert["unresolved"] = [];
  for (const p of products) {
    const label = p.brand ?? "Unnamed photographed product";
    if (p.status === "unverified") {
      unresolved.push({ source_label: label, detail: p.unverified_reason ?? "Not identified." });
    } else if (p.status === "partial") {
      const names = p.ingredients.filter((i) => i.confidence === "unverified").map((i) => i.printed_name);
      unresolved.push({ source_label: label, detail: `Not matched to RxNorm: ${names.join(", ")}.` });
    }
  }
  for (const m of usMeds) {
    if (m.confidence === "unverified") {
      unresolved.push({ source_label: m.text, detail: "US medicine name not recognised." });
    }
  }
  if (unresolved.length) {
    alerts.push({
      id: "unresolved",
      rule_id: "unresolved",
      kind: "unresolved",
      severity: "info",
      title: `${unresolved.length} item${unresolved.length === 1 ? "" : "s"} not fully identified`,
      rationale:
        "Duplications and interactions cannot be checked for ingredients that were not identified. Unverified – ask pharmacist / bring the box.",
      mechanism: null,
      involved: [],
      unresolved,
      source: null,
      evidence: null,
      curated: false,
      verified_by: null,
      low_confidence: false,
      patient: PATIENT.bring_box,
    });
  }

  return alerts.sort(
    (x, y) => SEVERITY_ORDER.indexOf(x.severity) - SEVERITY_ORDER.indexOf(y.severity),
  );
}
