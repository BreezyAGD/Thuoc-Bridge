/** Reproducible synthetic sample labels. These are NOT real-photo extraction evidence. */
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import scenarios from "../eval/scenarios.json";
import { syntheticExtraction } from "../eval/scenario-runner";
import type { ExtractResult } from "../lib/schema";

const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
async function main() {
  await mkdir("public/demo-assets", { recursive: true });
  await mkdir("demo-cache", { recursive: true });
  const entries: { hash: string; photo: string; result: ExtractResult }[] = [];
  const choices = [];
  for (const s of scenarios.scenarios.slice(0, 8)) {
    const hashes = [];
    for (const [i, p] of s.products.entries()) {
      const extraction = syntheticExtraction(p);
      const lines = ["SYNTHETIC DEMO / MẪU MINH HỌA", ...extraction.transcript];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600"><rect width="100%" height="100%" fill="#f0fdfa"/>${lines.map((l, n) => `<text x="30" y="${60 + n * 65}" font-size="26" font-family="sans-serif">${escape(l)}</text>`).join("")}</svg>`;
      const bytes = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
      const hash = createHash("sha256").update(bytes).digest("hex");
      const photo = `/demo-assets/${s.id}-${i}.jpg`;
      const result: ExtractResult = { status: "ok", extraction, model: "synthetic-fixture-not-model-output", ms: 0 };
      await writeFile(`public${photo}`, bytes);
      await writeFile(`demo-cache/${hash}.json`, JSON.stringify(result, null, 2) + "\n");
      entries.push({ hash, photo, result });
      hashes.push(hash);
    }
    choices.push({ id: s.id, description: s.description, hashes, usMeds: s.us_meds, expected: s.expect });
  }
  await writeFile("demo-cache/index.json", JSON.stringify({ provenance: "Synthetic scenario labels; not real box photos or LLM outputs.", entries, scenarios: choices }, null, 2) + "\n");
}
main().catch(() => { console.error("Could not build synthetic demos"); process.exitCode = 1; });
