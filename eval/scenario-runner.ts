import scenariosJson from "./scenarios.json";
import { reconcile } from "../lib/reconcile";
import type { Extraction } from "../lib/schema";

export type Scenario = {
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
    // Filled with measured positions by scripts/demo-build.ts for the demo images.
    line_boxes: [],
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

export async function runScenarios() {
  const rows = [];
  for (const s of scenariosJson.scenarios as Scenario[]) {
    const result = await reconcile({
      products: s.products.map((p, i) => ({ id: 'p'+i, extraction: syntheticExtraction(p) })),
      usMeds: s.us_meds.map((text, i) => ({ id: 'u'+i, text })),
    });
    const actual = [...new Set(result.alerts.map(a => a.rule_id))].sort();
    const expected = [...s.expect].sort();
    rows.push({ id: s.id, actual, expected, passed: JSON.stringify(actual) === JSON.stringify(expected), rxnav_unavailable: result.rxnav_unavailable });
  }
  return rows;
}
