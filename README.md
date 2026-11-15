# Thuốc Bridge

Medication reconciliation for Vietnamese-speaking patients who take medicines
bought in Vietnam or at Vietnamese pharmacies. A patient photographs the box;
a nurse or pharmacist gets the active ingredients mapped to RxNorm, with
duplication and interaction alerts.

**Prototype. Not a substitute for a pharmacist. No real patient data.**

## Accuracy architecture

| Step | What | How |
|---|---|---|
| A. Extraction | Read only what is printed on the package | Claude vision (`claude-sonnet-5-5`), strict JSON schema, verbatim source text per field |
| B. Normalization | Ingredient name → RxNorm RxCUI | NLM RxNav REST API, deterministic, no LLM |
| C. Interactions | Duplications, drug–drug, herb–drug | Curated `data/interactions.json`, each rule cited and signed off |

The LLM never infers ingredients from a brand name and never creates an alert.
Anything unresolved is shown as **Unverified**.

Between A and B a deterministic guard checks that every extracted value really
appears in the transcript of the label. Values that fail are dropped and
flagged; they are never shown to the patient.

Status: steps A, B and C plus milestone 4 demo/evaluation infrastructure are built.
Real-photo validation is pending a local API key, box photos, and human labels.
The printable summary and deployment remain future milestones.

**None of the 27 rules in `data/interactions.json` is clinically verified yet.**
Each has a cited source and a machine-fetched quote from it, and shows as
"Pending pharmacist review" until a qualified reviewer puts their name in its
`verified_by` field. The rule list is short and curated; it is not a complete
interaction screen.

## Checks

```bash
npm run check:normalize   # 41 ingredient names -> expected RxCUIs (RxNav or the committed cache)
npm run check:scenarios   # 11 demo scenarios -> exact expected alert sets
npm run check:demo        # cached demo scenarios with all network fetches blocked
npm run check:eval        # scoring regression checks
npm run eval              # fresh photo extraction + deterministic alert scenarios -> eval/results.json
npm run rules:refresh     # re-fetch RxCUIs and source quotes for every rule (needs network)
```

See `eval/README.md` for how to add hand-labeled products to `eval/golden.json`.

## Run locally

```bash
npm install
cp .env.example .env.local   # then put your key in .env.local
npm run dev
```

Open http://localhost:3000, accept the disclaimer, and add a photo of a
medicine box.

## Demo mode and metrics

Enable **Demo mode** in the header. It starts a fresh visit and loads a synthetic
sample label plus US medicines. Choose a scenario, then open the clinician view
to inspect its alerts. The eight choices cover all five required scenarios,
including Tylenol/Norco, warfarin/apixaban and the older cold formulation.
Turn demo mode off to clear the sample visit before adding your own photos.

These are visibly marked **synthetic labels**, derived from `eval/scenarios.json`,
not real box photos or recorded model outputs. Regenerate them with
`npm run demo:build`. Cache filenames are SHA-256 hashes of the public JPEG bytes;
`demo-cache/index.json` bundles the validated results for browser use. Demo mode
never calls Anthropic. Normal mode can fall back to these entries after an
extraction HTTP/network/parse error only when the original image bytes match.
Unknown images never inherit a sample result; model refusals remain unverified.
Uploaded images are never recorded in this cache.

For an offline rehearsal, start `npm run dev` while connected and open the app;
disable external networking while keeping localhost reachable. Select each demo
and open `/clinician`. The committed RxNav cache covers every sample ingredient
and US medicine. A running local server is still required; this is not a PWA.

Open `/about-metrics` for counts, denominators, provenance, and limitations.
`npm run eval` uses fresh `extractLabel` calls on human-labeled photos, never the
demo cache. The initial empty photo set is explicitly **not measured**, while
synthetic alert regression reports its actual results separately. Regenerate
the report before `npm run build` to update the deployed metrics page.

Extract one photo from the command line (same code path as the app):

```bash
npm run extract -- path/to/photo.jpg
```

## Privacy

- Photos are downscaled in the browser, sent to `/api/extract`, forwarded to
  the Anthropic API, and discarded. They are never written to disk or logged.
- `.env.local` is git-ignored. Never commit an API key.

## Printable English summary (milestone 5)

From `/clinician`, choose **Printable English summary**, then **Print / Save PDF**.
The summary includes guard-checked label values, US medicine names, RxCUIs,
confidence, unresolved items, and cited clinician alerts with review status.
Printing is disabled until the current reconciliation finishes successfully.
Choose Letter or A4 portrait and disable browser headers and footers. Each of
the eight demo variants fits one Letter page; longer real visits can continue
onto additional pages without dropping findings. The PDF is generated locally
by the browser; there is no summary upload or server-side persistence.

Verified on Chromium: 320/390/768 px layouts, empty and ready summary states,
all eight demo variants with external browser requests blocked, and one-page
Letter PDFs for each variant. The local Next server must remain running for
the offline demo; a cold start of a hosted site without internet is not supported.

Deployment remains pending. The Anthropic key is available in the current
execution environment, but a live call using a synthetic demo label returned
`network`; real-photo accuracy remains unmeasured without labeled box photos.
