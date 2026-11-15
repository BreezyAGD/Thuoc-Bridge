import type { Extraction, ExtractedField } from "./schema";
import { compact, numbersIn } from "./text";

/**
 * Deterministic guard between Step A (LLM extraction) and Step B (RxNorm).
 *
 * The model must show its work: every value has to be found in its own
 * source_text, and every source_text has to be found in the transcript of the
 * label. A value that fails is treated as not read. This is the mechanical
 * backstop for "never infer ingredients from the brand name".
 *
 * Known limit: it cannot catch a model that invents the transcript too. The
 * clinician view shows the photo next to the transcript for that reason.
 */
export type FieldCheck = { ok: boolean; issue: string | null };

const PASS: FieldCheck = { ok: true, issue: null };

function checkText(
  field: ExtractedField<string>,
  transcript: string,
  label: string,
): FieldCheck {
  if (field.value === null) return PASS; // nothing claimed, nothing to check
  if (!field.source_text) return { ok: false, issue: `${label}: no source text` };
  const source = compact(field.source_text);
  if (!source || !transcript.includes(source)) {
    return { ok: false, issue: `${label}: source text not found in label transcript` };
  }
  if (!source.includes(compact(field.value))) {
    return { ok: false, issue: `${label}: value differs from its source text` };
  }
  return PASS;
}

function checkStrength(field: ExtractedField<number>, transcript: string): FieldCheck {
  if (field.value === null) return PASS;
  if (!field.source_text) return { ok: false, issue: "strength: no source text" };
  const source = compact(field.source_text);
  if (!source || !transcript.includes(source)) {
    return { ok: false, issue: "strength: source text not found in label transcript" };
  }
  const printed = numbersIn(field.source_text);
  if (!printed.some((n) => Math.abs(n - field.value!) < 1e-9)) {
    return { ok: false, issue: "strength: number differs from its source text" };
  }
  return PASS;
}

export type IngredientGuard = {
  name: FieldCheck;
  strength: FieldCheck;
  unit: FieldCheck;
  /** Index into extraction.transcript of the line this ingredient was read from. */
  transcript_line: number | null;
};

export type GuardReport = {
  brand_name: FieldCheck;
  manufacturer: FieldCheck;
  registration_number: FieldCheck;
  dosage_form: FieldCheck;
  ingredients: IngredientGuard[];
};

/** First transcript line containing the given printed text, or null. */
export function findTranscriptLine(transcript: string[], text: string | null): number | null {
  if (!text) return null;
  const needle = compact(text);
  if (!needle) return null;
  const index = transcript.findIndex((line) => compact(line).includes(needle));
  return index === -1 ? null : index;
}

export function guardExtraction(e: Extraction): GuardReport {
  const transcript = compact(e.transcript.join(" "));
  return {
    brand_name: checkText(e.brand_name, transcript, "brand"),
    manufacturer: checkText(e.manufacturer, transcript, "manufacturer"),
    registration_number: checkText(e.registration_number, transcript, "registration number"),
    dosage_form: checkText(e.dosage_form, transcript, "dosage form"),
    ingredients: e.ingredients.map((ing) => ({
      name: checkText(ing.name, transcript, "ingredient"),
      strength: checkStrength(ing.strength, transcript),
      unit: checkText(ing.unit, transcript, "unit"),
      transcript_line:
        findTranscriptLine(e.transcript, ing.name.source_text) ??
        findTranscriptLine(e.transcript, ing.name.value),
    })),
  };
}
