import { z } from "zod";

/**
 * Step A (extraction) schema. This is the ONLY shape the LLM is allowed to fill.
 * Every value carries the verbatim label text it came from, so later
 * deterministic steps (guard, RxNorm normalization) can verify it.
 */
const field = <T extends z.ZodType>(value: T, what: string) =>
  z.object({
    value: value
      .nullable()
      .describe(`${what}. null if not printed or not legible.`),
    source_text: z
      .string()
      .nullable()
      .describe(
        "The exact characters printed on the label that this value was read from. null when value is null.",
      ),
    confidence: z
      .number()
      .describe(
        "0 to 1: how sure you are that the printed characters were read correctly (legibility only).",
      ),
  });

export const IngredientSchema = z.object({
  name: field(
    z.string(),
    "Active ingredient name exactly as printed (original spelling, not translated)",
  ),
  strength: field(
    z.number(),
    "Amount per unit as a number, decimal comma converted to a point",
  ),
  unit: field(z.string(), "Unit as printed, e.g. mg, g, mcg, ml, IU, mg/5ml"),
});

export const ExtractionSchema = z.object({
  is_medicine_package: z
    .boolean()
    .describe("false if the photo does not show a medicine or supplement package"),
  transcript: z
    .array(z.string())
    .describe(
      "Every legible printed line, verbatim, in reading order, with diacritics preserved.",
    ),
  brand_name: field(z.string(), "Product/brand name as printed"),
  manufacturer: field(z.string(), "Manufacturer name as printed"),
  registration_number: field(
    z.string(),
    "Vietnamese registration number (SĐK / Số ĐK / Reg. No.) as printed",
  ),
  dosage_form: field(
    z.string(),
    "Dosage form as printed, e.g. viên nén, viên sủi, siro, viên nang",
  ),
  ingredients_section_found: z
    .boolean()
    .describe(
      "true only if an ingredients/composition section (Thành phần, Công thức, Hoạt chất, Composition) is visible and legible in this photo",
    ),
  ingredients: z
    .array(IngredientSchema)
    .describe(
      "Active ingredients listed in the ingredients section. Empty if the section is not visible.",
    ),
});

export type Extraction = z.infer<typeof ExtractionSchema>;
export type Ingredient = z.infer<typeof IngredientSchema>;
export type ExtractedField<T> = {
  value: T | null;
  source_text: string | null;
  confidence: number;
};

export type ExtractErrorCode =
  | "bad_request"
  | "no_api_key"
  | "auth"
  | "rate_limited"
  | "network"
  | "api_error";

/** Result of one photo going through Step A. */
export type ExtractResult =
  | { status: "ok"; extraction: Extraction; model: string; ms: number }
  | {
      status: "unverified";
      reason: "refusal" | "unparseable" | "truncated";
      ms: number;
    }
  | { status: "error"; code: ExtractErrorCode; message: string };

export const ExtractRequestSchema = z.object({
  /** Base64 image bytes, no data: prefix. Downscaled in the browser first. */
  image: z.string().min(100).max(7_000_000),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]),
});
export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

/**
 * A product counts as "unverified" for the patient/clinician when Step A could
 * not read an ingredient list. Being safely unsure beats being wrong.
 */
export function isUnverified(result: ExtractResult): boolean {
  if (result.status !== "ok") return true;
  const e = result.extraction;
  return (
    !e.is_medicine_package ||
    !e.ingredients_section_found ||
    e.ingredients.filter((i) => i.name.value).length === 0
  );
}
