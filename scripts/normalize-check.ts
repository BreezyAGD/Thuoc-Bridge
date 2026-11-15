/**
 * Regression check for Step B (RxNorm normalization), run against live RxNav:
 *
 *   npm run check:normalize            # compare with eval/normalization-cases.json
 *   npm run check:normalize -- --print # just print what each name resolves to
 *
 * Set RXNAV_RECORD=1 to also save every RxNav response into
 * data/rxnorm-cache.json, so the same lookups work offline.
 */
import cases from "../eval/normalization-cases.json";
import { normalizeIngredient, normalizeUsMed } from "../lib/normalize";
import { flushRecordedCache } from "../lib/rxnav";

type Case = { input: string; kind: "label" | "us_med"; expect: string[] };

async function main() {
  const printOnly = process.argv.includes("--print");
  let failed = 0;
  for (const c of cases.cases as Case[]) {
    const r = c.kind === "us_med" ? await normalizeUsMed(c.input) : await normalizeIngredient(c.input);
    const got = r.concepts.map((x) => x.rxcui).sort();
    const names = r.concepts.map((x) => `${x.name} [${x.rxcui}]`).join(" + ") || "(unresolved)";
    const ok = JSON.stringify(got) === JSON.stringify([...c.expect].sort());
    if (!ok) failed++;
    const mark = printOnly ? " " : ok ? "PASS" : "FAIL";
    console.log(
      `${mark} ${c.kind.padEnd(6)} ${JSON.stringify(c.input).padEnd(48)} ${r.match.padEnd(11)} ${names}` +
        (ok || printOnly ? "" : `   expected [${c.expect.join(", ")}]`) +
        (r.rxnav_unavailable ? "   (RxNav unavailable)" : ""),
    );
  }
  await flushRecordedCache();
  if (!printOnly) {
    console.log(`\n${cases.cases.length - failed}/${cases.cases.length} normalization cases pass`);
    if (failed) process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
