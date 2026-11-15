import { readFile, realpath } from "node:fs/promises";
import { resolve, relative, isAbsolute } from "node:path";
import sharp from "sharp";
import { GoldenSchema } from "../eval/schema";

/** Local readiness check: never sends photos to an API or writes image data. */
async function main() {
  const golden = GoldenSchema.parse(JSON.parse(await readFile("eval/golden.json", "utf8")));
  if (!golden.items.length) {
    console.error("NOT READY: no independently labeled real photos in eval/golden.json. Photo accuracy remains unmeasured.");
    process.exitCode = 2;
    return;
  }
  const root = await realpath("eval/photos");
  const ids = new Set<string>();
  const photos = new Set<string>();
  for (const item of golden.items) {
    if (ids.has(item.id)) throw new Error("Duplicate golden item ID");
    ids.add(item.id);
    if (/your name|template|example-/i.test(item.labeled_by + item.id)) throw new Error("Replace template IDs and reviewer names before evaluation");
    if (item.expect_unverified !== (item.ingredients.length === 0)) throw new Error("Each label needs ingredients or an explicit unverified expectation");
    for (const ingredient of item.ingredients) {
      if (ingredient.strength !== null && (!Number.isFinite(ingredient.strength) || ingredient.strength <= 0)) throw new Error("Strength must be positive when present");
      if (ingredient.rxcui !== null && !/^\d+$/.test(ingredient.rxcui)) throw new Error("RxCUI must be numeric or null");
    }
    const photo = await realpath(resolve(item.photo));
    const rel = relative(root, photo);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Error("Real-photo evaluation files must stay inside eval/photos (including symlink targets)");
    if (photos.has(photo)) throw new Error("Duplicate photo paths would overcount the evaluation set");
    photos.add(photo);
    // Decode the entire image, rather than accepting a header for a broken file.
    await sharp(await readFile(photo)).rotate().resize({width:1568,height:1568,fit:"inside",withoutEnlargement:true}).jpeg().toBuffer();
  }
  console.log(`READY: ${golden.items.length} labeled, decodable local photos; ${golden.items.filter(i => i.expect_unverified).length} unverified examples. This does not verify label truth, privacy, or accuracy.`);
}
main().catch(() => {
  console.error("NOT READY: check label schema, IDs, reviewer names, expected ingredients, RxCUIs, and readable unique files inside eval/photos. No photos were uploaded.");
  process.exitCode = 1;
});
