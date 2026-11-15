import type { GoldenItem } from "./schema";
import type { ProductRow } from "../lib/reconcile";
import { fold } from "../lib/text";

export const metric = (numerator: number, denominator: number) => ({
  numerator, denominator, percent: denominator ? Math.round(10000 * numerator / denominator) / 100 : null,
});

/** One-to-one matching: duplicate predictions cannot inflate recall. */
export function scoreProduct(gold: GoldenItem, product: ProductRow) {
  const predicted = product.ingredients.filter((i) => i.name_verified);
  const remaining = new Set(gold.ingredients.map((_, i) => i));
  let correct = 0;
  let rxCorrect = 0;
  for (const p of predicted) {
    const index = [...remaining].find((i) => fold(gold.ingredients[i].name_printed) === fold(p.printed_name));
    if (index === undefined) continue;
    remaining.delete(index);
    correct++;
    const expected = gold.ingredients[index].rxcui;
    if (expected && p.resolution.concepts.length === 1 && p.resolution.concepts[0].rxcui === expected) rxCorrect++;
  }
  return { correct, predicted: predicted.length, expected: gold.ingredients.length,
    rxCorrect, rxExpected: gold.ingredients.filter((i) => i.rxcui !== null).length,
    unverified: product.status === "unverified",
    unverifiedCorrect: (product.status === "unverified") === gold.expect_unverified };
}
