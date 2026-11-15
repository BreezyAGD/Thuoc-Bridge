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
  assert.deepEqual(scoreProduct(gold, product), { correct: 1, predicted: 1, expected: 1, rxCorrect: 1, rxExpected: 1, strengthCorrect: 1, strengthExpected: 1, unverified: false, unverifiedCorrect: true });
  assert.equal(scoreProduct(gold, { ...product, ingredients: [...product.ingredients, ...product.ingredients] }).correct, 1);
  assert.equal(scoreProduct(gold, { ...product, ingredients: [{ ...product.ingredients[0], name_verified: false }] }).predicted, 0);
  assert.equal(scoreProduct(gold, { ...product, ingredients: [{ ...product.ingredients[0], printed_name: "Ibuprofen" }] }).correct, 0);
  assert.equal(scoreProduct(gold, { ...product, ingredients: [{ ...product.ingredients[0], resolution: { ...product.ingredients[0].resolution, concepts: [] } }] }).rxCorrect, 0);
  assert.equal(scoreProduct(gold, { ...product, ingredients: [...product.ingredients, ...product.ingredients] }).strengthCorrect, 1);
  for (const patch of [{ strength: 650 }, { strength: null }, { unit: "g" }, { unit: null }, { name_verified: false }, { printed_name: "Ibuprofen" }]) {
    assert.equal(scoreProduct(gold, { ...product, ingredients: [{ ...product.ingredients[0], ...patch }] }).strengthCorrect, 0);
  }
  assert.equal(scoreProduct(gold, { ...product, ingredients: [] }).strengthExpected, 1, "missing extraction must retain the labeled denominator");
  const noAmount = { ...gold, ingredients: [{ ...gold.ingredients[0], strength: null, unit: null }] };
  assert.equal(scoreProduct(noAmount, product).strengthExpected, 0);
  assert.equal(scoreProduct(noAmount, product).strengthCorrect, 0, "unlabeled amount cannot earn credit");
  assert.equal(scoreProduct(gold, { ...product, ingredients: [{ ...product.ingredients[0], unit: " MG " }] }).strengthCorrect, 1);
  const decimalGold = { ...gold, ingredients: [{ ...gold.ingredients[0], strength: 0.5, unit: "g" }] };
  assert.equal(scoreProduct(decimalGold, { ...product, ingredients: [{ ...product.ingredients[0], strength: 0.5, unit: "g" }] }).strengthCorrect, 1);
  assert.equal(scoreProduct(decimalGold, product).strengthCorrect, 0, "no conversion between 500 mg and 0.5 g in verbatim scoring");
  const rejectedStrength = syntheticExtraction({ brand: "test", ingredients: [{ name: "Paracetamol", strength: 500, unit: "mg" }] });
  rejectedStrength.ingredients[0].strength.value = 650;
  const checkedStrength = await reconcile({ products: [{ id: "test", extraction: rejectedStrength }], usMeds: [] });
  assert.equal(checkedStrength.products[0].ingredients[0].strength, null);
  assert.equal(scoreProduct(gold, checkedStrength.products[0]).strengthCorrect, 0, "guard-rejected amount receives no credit");
  assert.equal(metric(0, 0).percent, null);
  assert.equal(metric(1, 2).percent, 50);
  const unreadable = syntheticExtraction({ brand: "Printed brand", ingredients: [] });
  unreadable.brand_name.value = "Invented brand";
  const guarded = await reconcile({ products: [{ id: "test", extraction: unreadable }], usMeds: [] });
  assert.equal(guarded.products[0].status, "unverified");
  assert.equal(guarded.products[0].brand, null, "even unverified products must not display unguarded metadata");
  console.log("PASS scoring: one-to-one ingredients, guard rejection, wrong name/RxCUI, exact amount/unit, decimals, missing/rejected amount, zero denominator");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
