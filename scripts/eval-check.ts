import assert from "node:assert/strict";
import { metric, scoreProduct } from "../eval/score";
import { syntheticExtraction } from "../eval/scenario-runner";
import { reconcile } from "../lib/reconcile";
import type { GoldenItem } from "../eval/schema";

async function main() {
  const gold: GoldenItem = { id: "test", photo: "unused", labeled_by: "test", expect_unverified: false,
    brand_name: "test", ingredients: [{ name_printed: "Paracetamol", strength: 500, unit: "mg", rxcui: "161", us_name: "acetaminophen" }] };
  const result = await reconcile({ products: [{ id: "test", extraction: syntheticExtraction({ brand: "test", ingredients: [{ name: "Paracetamol", strength: 500, unit: "mg" }] }) }], usMeds: [] });
  const product = result.products[0];
  assert.deepEqual(scoreProduct(gold, product), { correct: 1, predicted: 1, expected: 1, rxCorrect: 1, rxExpected: 1, unverified: false, unverifiedCorrect: true });
  assert.equal(scoreProduct(gold, { ...product, ingredients: [...product.ingredients, ...product.ingredients] }).correct, 1);
  assert.equal(scoreProduct(gold, { ...product, ingredients: [{ ...product.ingredients[0], name_verified: false }] }).predicted, 0);
  assert.equal(scoreProduct(gold, { ...product, ingredients: [{ ...product.ingredients[0], printed_name: "Ibuprofen" }] }).correct, 0);
  assert.equal(scoreProduct(gold, { ...product, ingredients: [{ ...product.ingredients[0], resolution: { ...product.ingredients[0].resolution, concepts: [] } }] }).rxCorrect, 0);
  assert.equal(metric(0, 0).percent, null);
  assert.equal(metric(1, 2).percent, 50);
  const unreadable = syntheticExtraction({ brand: "Printed brand", ingredients: [] });
  unreadable.brand_name.value = "Invented brand";
  const guarded = await reconcile({ products: [{ id: "test", extraction: unreadable }], usMeds: [] });
  assert.equal(guarded.products[0].status, "unverified");
  assert.equal(guarded.products[0].brand, null, "even unverified products must not display unguarded metadata");
  console.log("PASS scoring: one-to-one ingredients, guard rejection, wrong name/RxCUI, zero denominator");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
