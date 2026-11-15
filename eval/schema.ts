import { z } from "zod";

/**
 * Format of eval/golden.json: hand-labeled ground truth for the pipeline.
 * Labels come from a person reading the physical box, never from pipeline
 * output. The eval script (npm run eval, next milestone) compares against it.
 */
export const GoldenIngredientSchema = z.object({
  /** Ingredient name exactly as printed on the box. */
  name_printed: z.string().min(1),
  /** Amount per unit; null if the box does not print one. */
  strength: z.number().nullable(),
  /** Unit as printed (mg, g, ml, IU ...); null if no strength is printed. */
  unit: z.string().nullable(),
  /** Expected RxNorm ingredient RxCUI; null if RxNorm has no concept for it. */
  rxcui: z.string().nullable(),
  /** Expected US generic name, for readability only. */
  us_name: z.string().nullable(),
});

export const GoldenItemSchema = z.object({
  id: z.string().min(1),
  /** Path relative to the repo root, e.g. eval/photos/hapacol-650.jpg */
  photo: z.string().min(1),
  /** Who read the box and wrote this entry. */
  labeled_by: z.string().min(1),
  /**
   * true when the photo shows no legible ingredient list (the pipeline must
   * say "Unverified" and list no ingredients).
   */
  expect_unverified: z.boolean(),
  brand_name: z.string().nullable(),
  ingredients: z.array(GoldenIngredientSchema),
  notes: z.string().optional(),
});

export const GoldenSchema = z.object({
  version: z.literal(1),
  items: z.array(GoldenItemSchema),
});

export type Golden = z.infer<typeof GoldenSchema>;
export type GoldenItem = z.infer<typeof GoldenItemSchema>;
