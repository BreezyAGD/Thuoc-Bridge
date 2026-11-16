/**
 * Reproducible demo samples.
 * - Synthetic labels: rendered here; text-line boxes are measured from the rendered pixels.
 * - Real-photo fixtures (demo-fixtures/*.json): a team photo with a hand-written transcript
 *   and hand-measured boxes.
 * Neither is real-photo extraction evidence or model output.
 */
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import sharp from "sharp";
import scenarios from "../eval/scenarios.json";
import { syntheticExtraction } from "../eval/scenario-runner";
import { ExtractionSchema, type Extraction, type ExtractResult, type LineBox } from "../lib/schema";

const W = 1000;
const H = 600;
const BG = "#f0fdfa";
const escape = (s: string) => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
const textAt = (l: string, n: number) =>
  `<text x="30" y="${60 + n * 65}" font-size="26" font-family="sans-serif">${escape(l)}</text>`;
const svgOf = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${BG}"/>${body}</svg>`;

/** Measure where one rendered line's ink sits, on the 0–1000 grid. */
async function measure(line: string, n: number): Promise<Omit<LineBox, "line"> | null> {
  const { info } = await sharp(Buffer.from(svgOf(textAt(line, n))))
    .trim({ background: BG, threshold: 10 })
    .toBuffer({ resolveWithObject: true });
  const left = -(info.trimOffsetLeft ?? 0);
  const top = -(info.trimOffsetTop ?? 0);
  if (!info.width || !info.height) return null;
  const pad = 4;
  const x = Math.max(0, left - pad);
  const y = Math.max(0, top - pad);
  return {
    x: Math.round((x / W) * 1000),
    y: Math.round((y / H) * 1000),
    w: Math.round(((info.width + pad * 2) / W) * 1000),
    h: Math.round(((info.height + pad * 2) / H) * 1000),
  };
}

type Entry = { hash: string; photo: string; source: "synthetic" | "real_photo_hand_labeled"; result: ExtractResult };

async function main() {
  await mkdir("public/demo-assets", { recursive: true });
  await mkdir("demo-cache", { recursive: true });
  const entries: Entry[] = [];
  const choices = [];
  const add = async (entry: Entry) => {
    entries.push(entry);
    await writeFile(`demo-cache/${entry.hash}.json`, JSON.stringify(entry.result, null, 2) + "\n");
  };

  // Real-photo fixtures first: they are the most realistic demo.
  for (const file of (await readdir("demo-fixtures")).filter((f) => f.endsWith(".json")).sort()) {
    const fx = JSON.parse(await readFile(`demo-fixtures/${file}`, "utf8"));
    const extraction: Extraction = ExtractionSchema.parse(fx.extraction);
    const bytes = await readFile(fx.photo_file);
    const hash = createHash("sha256").update(bytes).digest("hex");
    const photo = fx.photo_file.replace(/^public/, "");
    await add({ hash, photo, source: "real_photo_hand_labeled", result: { status: "ok", extraction, model: "hand-labeled-fixture-not-model-output", ms: 0 } });
    choices.push({ id: fx.id, description: fx.description, source: "real_photo_hand_labeled", hashes: [hash], usMeds: fx.us_meds, expected: fx.expect });
  }

  for (const s of scenarios.scenarios.slice(0, 8)) {
    const hashes = [];
    for (const [i, p] of s.products.entries()) {
      const base = syntheticExtraction(p);
      const lines = ["SYNTHETIC DEMO / MẪU MINH HỌA", ...base.transcript];
      const line_boxes: LineBox[] = [];
      for (const [k, line] of base.transcript.entries()) {
        const box = await measure(line, k + 1);
        if (box) line_boxes.push({ line: k, ...box });
      }
      const extraction: Extraction = { ...base, line_boxes };
      const bytes = await sharp(Buffer.from(svgOf(lines.map(textAt).join("")))).jpeg({ quality: 85 }).toBuffer();
      const hash = createHash("sha256").update(bytes).digest("hex");
      const photo = `/demo-assets/${s.id}-${i}.jpg`;
      await writeFile(`public${photo}`, bytes);
      await add({ hash, photo, source: "synthetic", result: { status: "ok", extraction, model: "synthetic-fixture-not-model-output", ms: 0 } });
      hashes.push(hash);
    }
    choices.push({ id: s.id, description: s.description, source: "synthetic", hashes, usMeds: s.us_meds, expected: s.expect });
  }
  // Same image used by two scenarios: keep one manifest entry per hash.
  const unique = [...new Map(entries.map((e) => [e.hash, e])).values()];
  await writeFile(
    "demo-cache/index.json",
    JSON.stringify({ provenance: "Synthetic scenario labels plus hand-labeled real photos; none are LLM outputs.", entries: unique, scenarios: choices }, null, 2) + "\n",
  );
  console.log(`Built ${unique.length} demo images for ${choices.length} scenarios.`);
}
main().catch((error) => { console.error("Could not build demos", error); process.exitCode = 1; });
