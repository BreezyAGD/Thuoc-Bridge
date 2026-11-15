import { z } from "zod";
import { buildAlerts, CURATED_RULE_COUNT, VERIFIED_RULE_COUNT, type Alert } from "./alerts";
import { guardExtraction } from "./guard";
import { normalizeIngredient, normalizeUsMed, type Resolution } from "./normalize";
import { ExtractionSchema } from "./schema";

/**
 * Reconciliation = guard (deterministic) + RxNorm normalization (deterministic).
 * Alerts (Step C) are added on top of these rows; nothing here calls an LLM.
 */
export const ReconcileRequestSchema = z.object({
  products: z
    .array(
      z.object({
        id: z.string().max(64),
        /** null when Step A failed for this photo. */
        extraction: ExtractionSchema.nullable(),
      }),
    )
    .max(20),
  usMeds: z.array(z.object({ id: z.string().max(64), text: z.string().min(1).max(120) })).max(30),
});
export type ReconcileRequest = z.infer<typeof ReconcileRequestSchema>;

export type ConfidenceLevel = "high" | "medium" | "low" | "unverified";

export type IngredientRow = {
  /** Ingredient name exactly as printed on the label. */
  printed_name: string;
  /** false when the name could not be found on the label transcript (never show it to a patient). */
  name_verified: boolean;
  name_source: string | null;
  strength: number | null;
  unit: string | null;
  strength_source: string | null;
  /** How sure the vision model was that it read the characters correctly (0-1). */
  read_confidence: number;
  /** Index into the extraction transcript, for "show me where this came from". */
  transcript_line: number | null;
  guard_issues: string[];
  resolution: Resolution;
  confidence: ConfidenceLevel;
};

export type ProductRow = {
  id: string;
  brand: string | null;
  manufacturer: string | null;
  registration_number: string | null;
  dosage_form: string | null;
  /** resolved = every ingredient mapped; partial = some; unverified = none. */
  status: "resolved" | "partial" | "unverified";
  unverified_reason: string | null;
  field_issues: string[];
  ingredients: IngredientRow[];
};

export type UsMedRow = {
  id: string;
  text: string;
  resolution: Resolution;
  confidence: ConfidenceLevel;
};

export type ReconcileResponse = {
  products: ProductRow[];
  usMeds: UsMedRow[];
  /** Deterministic alerts from the curated rules (Step C), most severe first. */
  alerts: Alert[];
  /** How many curated rules were checked, and how many a reviewer has signed off. */
  rules_checked: number;
  rules_verified: number;
  /** True if any lookup failed because RxNav was unreachable. */
  rxnav_unavailable: boolean;
};

/**
 * One confidence level per ingredient, computed from facts rather than from
 * the model's self-reported number alone.
 */
function confidenceFor(nameOk: boolean, readConfidence: number, r: Resolution): ConfidenceLevel {
  if (!nameOk || r.match === "none" || r.concepts.length === 0) return "unverified";
  if (r.match === "approximate" || readConfidence < 0.5) return "low";
  if (r.match === "spelling" || r.match === "herbal_map" || readConfidence < 0.8) return "medium";
  return "high";
}

function usMedConfidence(r: Resolution): ConfidenceLevel {
  if (r.match === "none" || r.concepts.length === 0) return "unverified";
  if (r.match === "approximate") return "low";
  if (r.match === "spelling" || r.match === "herbal_map") return "medium";
  return "high";
}

async function reconcileProduct(p: ReconcileRequest["products"][number]): Promise<ProductRow> {
  const e = p.extraction;
  const empty = (reason: string): ProductRow => ({
    id: p.id,
    brand: e?.brand_name.value ?? null,
    manufacturer: e?.manufacturer.value ?? null,
    registration_number: e?.registration_number.value ?? null,
    dosage_form: e?.dosage_form.value ?? null,
    status: "unverified",
    unverified_reason: reason,
    field_issues: [],
    ingredients: [],
  });

  if (!e) return empty("The label could not be read from this photo.");
  if (!e.is_medicine_package) return empty("The photo does not appear to show a medicine package.");
  if (!e.ingredients_section_found || e.ingredients.length === 0) {
    return empty("No legible ingredient list in this photo.");
  }

  const guard = guardExtraction(e);
  const ingredients = await Promise.all(
    e.ingredients.map(async (ing, i): Promise<IngredientRow> => {
      const g = guard.ingredients[i];
      const printed = ing.name.value ?? "";
      // A name that fails the guard is not sent for normalization at all.
      const resolution: Resolution = g.name.ok
        ? await normalizeIngredient(printed)
        : { input: printed, match: "none", matched_term: null, concepts: [], note: null };
      const strengthOk = g.strength.ok && g.unit.ok;
      return {
        printed_name: printed,
        name_verified: g.name.ok,
        name_source: ing.name.source_text,
        strength: strengthOk ? ing.strength.value : null,
        unit: strengthOk ? ing.unit.value : null,
        strength_source: ing.strength.source_text,
        read_confidence: Math.min(
          ing.name.confidence,
          ing.strength.value === null ? 1 : ing.strength.confidence,
        ),
        transcript_line: g.transcript_line,
        guard_issues: [g.name.issue, g.strength.issue, g.unit.issue].filter(
          (x): x is string => x !== null,
        ),
        resolution,
        confidence: confidenceFor(g.name.ok, ing.name.confidence, resolution),
      };
    }),
  );

  const resolved = ingredients.filter((i) => i.confidence !== "unverified").length;
  const status = resolved === 0 ? "unverified" : resolved === ingredients.length ? "resolved" : "partial";
  const brandOk = guard.brand_name.ok;
  return {
    id: p.id,
    brand: brandOk ? e.brand_name.value : null,
    manufacturer: guard.manufacturer.ok ? e.manufacturer.value : null,
    registration_number: guard.registration_number.ok ? e.registration_number.value : null,
    dosage_form: guard.dosage_form.ok ? e.dosage_form.value : null,
    status,
    unverified_reason:
      status === "unverified" ? "None of the listed ingredients could be matched to RxNorm." : null,
    field_issues: [
      guard.brand_name.issue,
      guard.manufacturer.issue,
      guard.registration_number.issue,
      guard.dosage_form.issue,
    ].filter((x): x is string => x !== null),
    ingredients,
  };
}

export async function reconcile(request: ReconcileRequest): Promise<ReconcileResponse> {
  const [products, usMeds] = await Promise.all([
    Promise.all(request.products.map(reconcileProduct)),
    Promise.all(
      request.usMeds.map(async (m): Promise<UsMedRow> => {
        const resolution = await normalizeUsMed(m.text);
        return { id: m.id, text: m.text, resolution, confidence: usMedConfidence(resolution) };
      }),
    ),
  ]);
  const rxnav_unavailable =
    products.some((p) => p.ingredients.some((i) => i.resolution.rxnav_unavailable)) ||
    usMeds.some((m) => m.resolution.rxnav_unavailable);
  return {
    products,
    usMeds,
    alerts: buildAlerts(products, usMeds),
    rules_checked: CURATED_RULE_COUNT,
    rules_verified: VERIFIED_RULE_COUNT,
    rxnav_unavailable,
  };
}
