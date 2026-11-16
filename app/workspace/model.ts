import { findTranscriptLine } from "@/lib/guard";
import type { ConfidenceLevel, IngredientRow, ProductRow, ReconcileResponse } from "@/lib/reconcile";
import type { Extraction, ExtractResult, LineBox } from "@/lib/schema";
import type { Visit, VisitProduct } from "@/lib/visit-store";

/**
 * Pure helpers that turn a visit into the facts the workspace shows:
 * which printed line each value came from, which checks passed, and who
 * (AI, code, RxNorm) did each step. Nothing here decides anything clinical.
 */

export type Role = "brand" | "ingredient" | "strength" | "manufacturer" | "registration" | "dosage_form";
export type MarkStatus = "verified" | "review" | "info";

/** A value the pipeline used, pinned to the printed line it came from. */
export type Mark = {
  line: number;
  role: Role;
  label: string;
  status: MarkStatus;
  /** Index into ProductRow.ingredients for ingredient/strength marks. */
  ingredient?: number;
};

export const ROLE_LABEL: Record<Role, string> = {
  brand: "Brand",
  ingredient: "Active ingredient",
  strength: "Strength",
  manufacturer: "Manufacturer",
  registration: "Registration no.",
  dosage_form: "Dosage form",
};

export function extractionOf(p: VisitProduct | undefined): Extraction | null {
  return p?.result?.status === "ok" ? p.result.extraction : null;
}

export function ingredientStatus(c: ConfidenceLevel): MarkStatus {
  return c === "high" || c === "medium" ? "verified" : "review";
}

export function marksFor(e: Extraction | null, row: ProductRow | undefined): Mark[] {
  if (!e) return [];
  const marks: Mark[] = [];
  const add = (role: Role, label: string, source: string | null, guarded: boolean) => {
    const line = findTranscriptLine(e.transcript, source);
    if (line !== null) marks.push({ line, role, label, status: guarded ? "info" : "review" });
  };
  if (e.brand_name.value) add("brand", e.brand_name.value, e.brand_name.source_text, !!row?.brand);
  if (e.manufacturer.value) add("manufacturer", e.manufacturer.value, e.manufacturer.source_text, !!row?.manufacturer);
  if (e.registration_number.value)
    add("registration", e.registration_number.value, e.registration_number.source_text, !!row?.registration_number);
  if (e.dosage_form.value) add("dosage_form", e.dosage_form.value, e.dosage_form.source_text, !!row?.dosage_form);
  row?.ingredients.forEach((ing, i) => {
    const status = ingredientStatus(ing.confidence);
    if (ing.transcript_line !== null)
      marks.push({ line: ing.transcript_line, role: "ingredient", label: ing.printed_name, status, ingredient: i });
    const sLine = findTranscriptLine(e.transcript, ing.strength_source);
    if (sLine !== null && sLine !== ing.transcript_line && ing.strength !== null)
      marks.push({ line: sLine, role: "strength", label: `${ing.strength} ${ing.unit ?? ""}`.trim(), status, ingredient: i });
  });
  return marks;
}

export function boxFor(e: Extraction | null, line: number | null): LineBox | null {
  if (!e || line === null) return null;
  return e.line_boxes.find((b) => b.line === line) ?? null;
}

/** Where the reading came from: decides how much the boxes can be trusted. */
export type ReadSource = { kind: "live" | "hand_labeled" | "synthetic"; label: string; boxes: string };

export function readSource(result: ExtractResult | undefined): ReadSource | null {
  if (result?.status !== "ok") return null;
  if (result.model === "hand-labeled-fixture-not-model-output")
    return { kind: "hand_labeled", label: "Real photo · hand-transcribed sample", boxes: "Hand-measured line positions" };
  if (result.model === "synthetic-fixture-not-model-output")
    return { kind: "synthetic", label: "Synthetic sample label", boxes: "Measured from the rendered sample" };
  return { kind: "live", label: `Read live by ${result.model}`, boxes: "AI-reported positions (approximate)" };
}

export type ProductState = "reading" | "error" | "verified" | "review";

export function productState(p: VisitProduct, row: ProductRow | undefined): ProductState {
  if (p.state === "reading") return "reading";
  if (p.state === "image_error" || p.result?.status === "error") return "error";
  if (!row) return "reading";
  if (row.status === "resolved" && row.ingredients.every((i) => i.confidence === "high" || i.confidence === "medium"))
    return "verified";
  return "review";
}

export type Stats = {
  labels: number;
  reading: number;
  lines: number;
  claimed: number;
  guarded: number;
  ingredients: number;
  matched: number;
  review: number;
  alerts: number;
  highAlerts: number;
  ms: number;
  liveReads: number;
};

/** Values the AI claimed vs values the guard found in the printed text. */
function claimCounts(e: Extraction, row: ProductRow | undefined) {
  let claimed = 0;
  let guarded = 0;
  const meta: [unknown, unknown][] = [
    [e.brand_name.value, row?.brand],
    [e.manufacturer.value, row?.manufacturer],
    [e.registration_number.value, row?.registration_number],
    [e.dosage_form.value, row?.dosage_form],
  ];
  for (const [claim, ok] of meta) {
    if (claim === null) continue;
    claimed++;
    if (ok) guarded++;
  }
  e.ingredients.forEach((ing, i) => {
    const r = row?.ingredients[i];
    if (ing.name.value !== null) {
      claimed++;
      if (r?.name_verified) guarded++;
    }
    if (ing.strength.value !== null) {
      claimed++;
      if (r && r.strength !== null) guarded++;
    }
  });
  return { claimed, guarded };
}

export function statsFor(visit: Visit): Stats {
  const recon = visit.recon;
  const s: Stats = {
    labels: visit.products.length,
    reading: visit.products.filter((p) => p.state === "reading").length,
    lines: 0,
    claimed: 0,
    guarded: 0,
    ingredients: 0,
    matched: 0,
    review: 0,
    alerts: recon?.alerts.length ?? 0,
    highAlerts: recon?.alerts.filter((a) => a.severity === "high").length ?? 0,
    ms: 0,
    liveReads: 0,
  };
  for (const p of visit.products) {
    const row = recon?.products.find((r) => r.id === p.id);
    if (p.result?.status === "ok" || p.result?.status === "unverified") s.ms += p.result.ms;
    if (readSource(p.result)?.kind === "live") s.liveReads++;
    const e = extractionOf(p);
    if (e) {
      s.lines += e.transcript.length;
      const c = claimCounts(e, row);
      s.claimed += c.claimed;
      s.guarded += c.guarded;
    }
    if (row) {
      s.ingredients += row.ingredients.length;
      s.matched += row.ingredients.filter((i) => i.confidence !== "unverified").length;
      s.review += row.ingredients.filter((i) => ingredientStatus(i.confidence) === "review").length;
      if (row.ingredients.length === 0) s.review++;
    } else if (p.state === "image_error" || p.result?.status === "error") {
      s.review++;
    }
  }
  s.review += recon?.usMeds.filter((m) => m.confidence === "unverified").length ?? 0;
  return s;
}

/** One step of the verification trail, labelled with who performed it. */
export type Step = {
  by: "AI" | "Code" | "RxNorm" | "Rules";
  state: "pass" | "warn" | "fail" | "skip";
  title: string;
  detail?: string;
};

const MATCH_EXPLAIN: Record<string, string> = {
  exact: "Exact RxNorm ingredient name",
  synonym: "Curated synonym list (international name → US name)",
  herbal_map: "Curated Vietnamese herbal name map",
  spelling: "Vietnamese spelling variant of an RxNorm name",
  approximate: "Fuzzy match within a strict edit-distance limit: confirm against the box",
  none: "No RxNorm concept found",
};

export function matchExplain(match: string) {
  return MATCH_EXPLAIN[match] ?? match;
}

/** Mirrors confidenceFor() in lib/reconcile.ts, in words. */
export function confidenceReason(ing: IngredientRow): string {
  const read = Math.round(ing.read_confidence * 100);
  if (!ing.name_verified) return "Unverified: the name was not found in the printed text, so it was never matched.";
  if (ing.resolution.match === "none" || ing.resolution.concepts.length === 0)
    return "Unverified: no RxNorm match. Ask the pharmacist or check the box.";
  if (ing.resolution.match === "approximate") return "Low: the RxNorm match is fuzzy.";
  if (ing.read_confidence < 0.5) return `Low: the text was hard to read (${read}%).`;
  if (ing.resolution.match === "spelling" || ing.resolution.match === "herbal_map")
    return "Medium: matched through a spelling variant or the herbal map.";
  if (ing.read_confidence < 0.8) return `Medium: legibility ${read}% is below 80%.`;
  return `High: the printed text was verified, the RxNorm match is direct (${MATCH_EXPLAIN[ing.resolution.match]}), and legibility is ${read}%.`;
}

export function trailFor(ing: IngredientRow, lineNo: number | null, recon: ReconcileResponse | null): Step[] {
  const read = Math.round(ing.read_confidence * 100);
  const steps: Step[] = [
    {
      by: "AI",
      state: ing.read_confidence >= 0.8 ? "pass" : "warn",
      title: `Copied the printed text "${ing.name_source ?? ing.printed_name}"${lineNo !== null ? ` from line ${lineNo + 1}` : ""}`,
      detail: `Legibility ${read}%. The AI only transcribes; it is told never to name a drug from the brand.`,
    },
  ];
  const nameIssue = ing.guard_issues.find((i) => i.startsWith("ingredient"));
  steps.push(
    ing.name_verified
      ? { by: "Code", state: "pass", title: `Name "${ing.printed_name}" found in the printed text` }
      : { by: "Code", state: "fail", title: "Name not found in the printed text", detail: nameIssue },
  );
  const strengthIssue = ing.guard_issues.find((i) => i.startsWith("strength") || i.startsWith("unit"));
  if (ing.strength !== null) {
    steps.push({
      by: "Code",
      state: "pass",
      title: `Strength ${ing.strength} ${ing.unit ?? ""} matches a number printed on the label`.replace(/\s+/g, " "),
      detail: ing.strength_source ? `Printed: "${ing.strength_source}"` : undefined,
    });
  } else {
    steps.push(
      strengthIssue
        ? { by: "Code", state: "fail", title: "Strength rejected", detail: strengthIssue }
        : { by: "Code", state: "skip", title: "No strength printed for this ingredient" },
    );
  }
  const r = ing.resolution;
  if (!ing.name_verified) {
    steps.push({ by: "RxNorm", state: "skip", title: "Not sent to RxNorm (failed the label check)" });
  } else if (r.match === "none" || r.concepts.length === 0) {
    steps.push({
      by: "RxNorm",
      state: "fail",
      title: r.rxnav_unavailable ? "RxNorm could not be reached" : "No RxNorm match: marked Unverified",
      detail: r.note ?? undefined,
    });
  } else {
    steps.push({
      by: "RxNorm",
      state: r.match === "approximate" ? "warn" : "pass",
      title: `Matched to ${r.concepts.map((c) => `${c.name} (RxCUI ${c.rxcui})`).join(" + ")}`,
      detail: `${matchExplain(r.match)}${r.matched_term && r.matched_term.toLowerCase() !== ing.printed_name.toLowerCase() ? `: "${ing.printed_name}" → "${r.matched_term}"` : ""}${r.note ? `. ${r.note}` : ""}`,
    });
  }
  if (recon && ing.confidence !== "unverified") {
    steps.push({
      by: "Rules",
      state: "pass",
      title: `Checked against ${recon.rules_checked} curated rules and same-ingredient matching`,
      detail: `${recon.rules_verified} of ${recon.rules_checked} rules reviewed by a pharmacist so far.`,
    });
  }
  return steps;
}

/**
 * Plain-text medication reconciliation note for pasting into the chart.
 * Only guard-checked values and deterministic findings; unresolved items say so.
 */
export function chartNote(visit: Visit): string {
  const recon = visit.recon;
  if (!recon) return "";
  const lines: string[] = ["Medications brought from abroad (Thuốc Bridge, prototype; verify against the packaging):"];
  if (recon.products.length === 0) lines.push("- None photographed.");
  for (const p of recon.products) {
    const name = p.brand ?? "Name not read";
    if (p.ingredients.length === 0) {
      lines.push(`- ${name}: UNVERIFIED (${p.unverified_reason ?? "no ingredients read"}). Ask pharmacist / bring the box.`);
      continue;
    }
    const ings = p.ingredients.map((i) => {
      const strength = i.strength !== null ? ` ${i.strength}${i.unit ? ` ${i.unit}` : ""}` : "";
      if (i.confidence === "unverified") return `${i.printed_name}${strength} = UNVERIFIED`;
      const us = i.resolution.concepts.map((c) => `${c.name} (RxCUI ${c.rxcui})`).join(" + ");
      return `${i.printed_name}${strength} = ${us} [${i.confidence}]`;
    });
    lines.push(`- ${name}: ${ings.join("; ")}`);
  }
  lines.push("", "Current US medications as entered:");
  if (recon.usMeds.length === 0) lines.push("- None entered.");
  for (const m of recon.usMeds) {
    const us = m.confidence === "unverified" ? "UNVERIFIED" : m.resolution.concepts.map((c) => `${c.name} (RxCUI ${c.rxcui})`).join(" + ");
    lines.push(`- ${m.text}: ${us}`);
  }
  lines.push("", `Findings (${recon.alerts.length}; ${recon.rules_checked} curated rules, ${recon.rules_verified} pharmacist-reviewed):`);
  if (recon.alerts.length === 0) lines.push("- No curated rule matched. Absence of an alert is not evidence of safety.");
  for (const a of recon.alerts) {
    lines.push(`- ${a.severity.toUpperCase()}: ${a.title}. ${a.rationale}${a.source ? ` Source: ${a.source.label}.` : ""}`);
  }
  return lines.join("\n");
}
