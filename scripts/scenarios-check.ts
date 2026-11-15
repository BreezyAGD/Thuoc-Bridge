/**
 * Alert-engine regression check:
 *
 *   npm run check:scenarios
 *
 * Builds a synthetic label for each scenario in eval/scenarios.json, runs the
 * real guard + RxNorm normalization + alert engine, and requires the set of
 * fired rule ids to equal the expected set exactly (missed alerts and extra
 * alerts both fail). No LLM and no photo are involved.
 */
import scenariosJson from "../eval/scenarios.json";
import { reconcile } from "../lib/reconcile";
import { flushRecordedCache } from "../lib/rxnav";
import type { Extraction } from "../lib/schema";

type Scenario = {
  id: string;
  description: string;
  products: { brand: string; ingredients: { name: string; strength: number; unit: string }[] }[];
  us_meds: string[];
  expect: string[];
};

const field = <T,>(value: T | null, source: string | null) => ({
  value,
  source_text: source,
  confidence: value === null ? 0 : 0.95,
});

/** A label as Step A would return it, if it read these lines perfectly. */
export function syntheticExtraction(p: Scenario["products"][number]): Extraction {
  const lines = p.ingredients.map((i) => `${i.name} ..... ${String(i.strength).replace(".", ",")} ${i.unit}`);
  return {
    is_medicine_package: true,
    transcript: [p.brand, ...(lines.length ? ["Thành phần:", ...lines] : ["Hộp 3 vỉ x 10 viên"])],
    brand_name: field(p.brand, p.brand),
    manufacturer: field<string>(null, null),
    registration_number: field<string>(null, null),
    dosage_form: field<string>(null, null),
    ingredients_section_found: lines.length > 0,
    ingredients: p.ingredients.map((i, n) => ({
      name: field(i.name, i.name),
      strength: field(i.strength, lines[n]),
      unit: field(i.unit, lines[n]),
    })),
  };
}

async function main() {
  let failed = 0;
  const scenarios = scenariosJson.scenarios as Scenario[];
  for (const s of scenarios) {
    const result = await reconcile({
      products: s.products.map((p, i) => ({ id: `p${i}`, extraction: syntheticExtraction(p) })),
      usMeds: s.us_meds.map((text, i) => ({ id: `u${i}`, text })),
    });
    const got = result.alerts.map((a) => a.rule_id).sort();
    const want = [...s.expect].sort();
    const ok = JSON.stringify(got) === JSON.stringify(want);
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} ${s.id.padEnd(36)} ${got.join(", ") || "(no alerts)"}`);
    if (!ok) console.log(`     expected: ${want.join(", ") || "(no alerts)"}`);
    if (result.rxnav_unavailable) console.log("     note: RxNav was unreachable for some lookups");
  }
  await flushRecordedCache();
  console.log(`\n${scenarios.length - failed}/${scenarios.length} scenarios pass`);
  if (failed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
