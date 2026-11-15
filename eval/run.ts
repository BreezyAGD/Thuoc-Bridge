import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { extractLabel, EXTRACTION_MODEL } from "../lib/extract";
import { reconcile } from "../lib/reconcile";
import { flushRecordedCache } from "../lib/rxnav";
import { GoldenSchema } from "./schema";
import { runScenarios } from "./scenario-runner";
import { metric, scoreProduct } from "./score";

async function main() {
  const golden = GoldenSchema.parse(JSON.parse(await readFile("eval/golden.json", "utf8")));
  if (new Set(golden.items.map((i) => i.id)).size !== golden.items.length) throw new Error("Duplicate golden IDs");
  const items = [];
  for (const item of golden.items) {
    if (!process.env.ANTHROPIC_API_KEY) {
      items.push({ id: item.id, error: "no_api_key" });
      continue;
    }
    try {
      const jpeg = await sharp(await readFile(item.photo)).rotate()
        .resize({ width: 1568, height: 1568, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 }).toBuffer();
      const extracted = await extractLabel({ image: jpeg.toString("base64"), mediaType: "image/jpeg" });
      const result = await reconcile({ products: [{ id: item.id, extraction: extracted.status === "ok" ? extracted.extraction : null }], usMeds: [] });
      items.push({ id: item.id, extraction_status: extracted.status,
        ...(extracted.status === "error" ? { error: extracted.code } : {}),
        ...scoreProduct(item, result.products[0]), rxnav_unavailable: result.rxnav_unavailable });
    } catch {
      items.push({ id: item.id, error: "photo_or_pipeline_failed" });
    }
  }
  const scored = items.filter((i) => "correct" in i);
  const sum = (key: "correct" | "predicted" | "expected" | "rxCorrect" | "rxExpected") => scored.reduce((n, i) => n + (i[key] ?? 0), 0);
  const scenarios = await runScenarios();
  const alertCorrect = scenarios.reduce((n, r) => n + r.actual.filter((a) => r.expected.includes(a)).length, 0);
  const errors = items.filter((i) => "error" in i).length;
  const report = {
    version: 1, generated_at: new Date().toISOString(), model: EXTRACTION_MODEL,
    photo_evaluation: {
      status: golden.items.length === 0 ? "not_measured" : errors ? "incomplete" : "measured",
      labeled: golden.items.length, scored: scored.length, errors,
      ingredient_precision: metric(sum("correct"), sum("predicted")),
      ingredient_recall: metric(sum("correct"), golden.items.reduce((n, i) => n + i.ingredients.length, 0)),
      rxnorm_match_rate: metric(sum("rxCorrect"), golden.items.reduce((n, i) => n + i.ingredients.filter((g) => g.rxcui !== null).length, 0)),
      flagged_unverified: metric(scored.filter((i) => i.unverified).length, scored.length),
      unverified_correctness: metric(scored.filter((i) => i.unverifiedCorrect).length, golden.items.length),
      items,
    },
    synthetic_alert_evaluation: {
      exact_scenarios: metric(scenarios.filter((r) => r.passed).length, scenarios.length),
      precision: metric(alertCorrect, scenarios.reduce((n, r) => n + r.actual.length, 0)),
      recall: metric(alertCorrect, scenarios.reduce((n, r) => n + r.expected.length, 0)), scenarios,
    },
  };
  await flushRecordedCache();
  await writeFile("eval/results.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  if (errors || scenarios.some((r) => !r.passed || r.rxnav_unavailable)) process.exitCode = 1;
}
main().catch(() => { console.error("Evaluation failed; check golden labels and local photos. No report was replaced."); process.exitCode = 1; });
