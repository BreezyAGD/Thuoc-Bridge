# Milestone 10 — current

Current branch: `build/milestone-10`, based on `build/milestone-9`.
Added read-only /readiness with implementation milestones, five external gates,
actual photo/rule counts, explicitly historical software evidence, and next steps.
No credential probes or visit writes. data/release-evidence.json contains the
verified milestone 9 CI baseline; hosted/rehearsal/human-review records stay null.
Schema and pure status checks are included in check:all. Two browser regressions
bring the suite to 25 against Node and local Workers; HTTP acceptance covers
seven pages. NEXT-STEPS.md is the remaining action sequence.
Milestones 6 (hosting/rehearsal) and 7 (real photos/human review) remain open.
Earlier handoff sections below are historical.

# Milestone 9 — current

Branch: `build/milestone-9`, based on `build/milestone-8`.
Added /demo-guide: English guided presentation of five synthetic scenarios,
fixture/rule-derived expected findings, actual rule-set comparison, retry and
mismatch states, and source-review/summary links. Loading asks before replacing
a non-demo visit; step navigation alone does not mutate it. No live extraction.
HTTP release acceptance now covers six pages. Five new browser regressions
bring the suite to 23; CI runs it against Node and local Workers.
See MILESTONE-9.md and DEMO-RUNBOOK.md. All prior migration/lifecycle work is
included. Deployment access, real photos, and human reviews remain deferred.

# Milestone 8 — current release branch

Current branch: `build/milestone-8`, based on `build/milestone-7`.
Added bilingual Start new visit with cancel/confirm, local data and consent
clearing, language retention, and fresh consent even with cached Next.js pages.
Pending fetches are aborted; visit generation and reconciliation sequence guards
reject old callbacks. Editing medicines invalidates results before debounce.
No Visit storage fields changed, so the persisted v4 shape remains compatible.
Reset removes old tb.visit.* formats, without clearing unrelated browser storage.
Four lifecycle browser regressions supplement the existing fourteen cases; CI
runs all eighteen against Node and local Workers. See MILESTONE-8.md.
Cloudflare access is deferred by the user. Real photos and human reviews remain
unavailable; those milestones are not marked complete by these changes.

# Milestone 7 started (current)

Branch: `build/milestone-7`, based on `build/cloudflare-milestone-6`.
Milestone 7 is newly defined as validation/review readiness; see MILESTONE-7.md.
Implemented separate printed strength/unit correctness in report schema v2,
with tests for wrong/missing/rejected values, decimals, duplicates, and zero
counts. The metrics page displays the separate rate. Real-photo data remain
empty and rates unmeasured. Human clinical/language sign-offs remain pending.
Cloudflare migration is included. Use this latest branch for eventual hosting.
No Cloudflare credentials are available; hosted deployment remains incomplete.

# Cloudflare migration (current)

Cloudflare Workers replaces Vercel by user request. Branch:
`build/cloudflare-milestone-6`, based on `validation/browser-rehearsal`.
OpenNext 1.20.17 and Wrangler 4.148.0 support the pinned Next 16.4.6.
Added wrangler.jsonc, open-next.config.ts, static headers, local secret template,
cf build/preview/deploy/dry-run scripts, and Workers browser testing in CI.
The read-only static cache does not store visit data. No R2/KV/D1 is configured.
Compatibility date is 2026-10-13 to match the pinned local workerd binary.
Build, dry-run, and every HTTP demo variant pass in local Workers.
No Cloudflare token/account access exists here; no hosted deployment claimed.
DEPLOYMENT.md is authoritative; older Vercel notes below are historical.
Milestone 7 is newly defined as validation/review readiness, starting next.

# Browser rehearsal update

Current release candidate: `validation/browser-rehearsal`, based on
`validation/offline-release`. Adds a key-free Chromium test suite for consent,
bilingual navigation, synthetic demo scenarios, source verification, responsive
layouts, error/retry, and one-page printable PDFs. Tests run in CI after the
server checks; reports contain only committed synthetic fixtures.
See DEMO-RUNBOOK.md and `npm run check:browser`.
Real photos, human sign-offs, and Vercel deployment remain deferred.

# Automated offline release rehearsal

Latest branch: `validation/offline-release`, based on `validation/live-vision`.
Added `check:all`, `check:offline-release`, a test-only external-TCP-blocking
Node preload, key-free GitHub Actions checks, and DEMO-RUNBOOK.md.
The HTTP rehearsal starts/stops its own loopback-only production server on a
free port, excludes inherited secrets, and requires missing-key extraction to
fail safely. It checks every page, sample hash, and synthetic scenario variant.
This is server/API coverage, not browser automation or a physical wifi-off test.
Vercel token and real photos are explicitly deferred; human review stays pending.
Use this latest branch for deployment so the validation additions are included.

# Live validation update

Branch: `validation/live-vision`, based on `build/milestone-6`.
Anthropic connectivity is resolved: this environment requires Node 24's
`NODE_USE_ENV_PROXY=1` to honor its existing HTTPS proxy. TLS stays enabled;
no secrets or proxy values were printed or written to source.
Two live synthetic calls succeeded using claude-sonnet-5-5. Their outputs passed
downstream assertions: Paracetamol 650 mg -> guarded name/strength -> RxCUI 161
and duplication with Norco; no-list herbal sample -> no ingredients ->
Unverified and unresolved alert. See eval/live-smoke-results.json.
Real-photo metrics remain unmeasured; do not relabel synthetic results as real.
Added local-only check:golden readiness check and REVIEW.md human review packet.
Vercel token deferred by user; deployment remains pending.

# Milestone 6 release preparation

Current branch: `build/milestone-6`. See `DEPLOYMENT.md` for the full plan,
Vercel setup, acceptance gates, and wifi-off local-server rehearsal.
Deployment is NOT complete: no VERCEL_TOKEN or project binding is available,
and the browser security policy rejected the Vercel browser action.
No alternate route was used to bypass that restriction.

Added `npm run check:release -- <app-url>` for real HTTP acceptance checks:
all app pages, exact sample hashes, eight reconciliation variants, and invalid
API input rejection. This does not claim live vision or browser verification.

# Current handoff — milestone 5 completed

The original milestone-3 handoff below is historical. Current work is on
`build/milestone-5`, based on remote `build/milestone-4` at `08fd58f`.

- Milestone 4 exists and its checks pass. Photo evaluation remains
  `not_measured`: zero labeled real photos. Synthetic checks are not photo accuracy.
- Milestone 5 adds `/summary`, linked from `/clinician`, with a browser print/PDF
  action and English guarded ingredients, RxCUIs, confidence, US medicines,
  unresolved findings, cited alerts, review status, and clinician sign-off line.
- Mobile header wrapping, table swipe guidance, and keyboard focus styling added.
- Verified: typecheck, lint, 41 normalization cases, 11 alert scenarios, offline
  demo checks, evaluation scoring checks, eval, production build, Chromium mobile
  widths 320/390/768, empty/ready print states, no browser errors, all eight demo
  variants with external browser requests blocked. Each generated Letter PDF
  has one page. Local server is still required; no cold-start offline hosting.
- ANTHROPIC_API_KEY is present in the environment; it was never printed or saved.
  A live extraction smoke check against a synthetic sample returned `network`.
  No successful real-photo extraction is claimed.
- Milestone 6: Vercel deployment is pending. No Vercel token or CLI found here.
  Configure hosting, set ANTHROPIC_API_KEY as a server environment secret, then
  verify the hosted app and repeat the demo dry-run. Never put the key in Git.
- No clinical reviewer has signed off rules; no real patient photos supplied.

---

# HANDOFF: Thuốc Bridge

## Current state

Milestone 4 infrastructure is implemented on `build/milestone-4`, branched from
`build/milestone-3` at `7d3af45`. Main has not been changed.

Added demo mode and exact-byte SHA-256 extraction fallback, synthetic sample JPEGs
and per-image cache entries, a fresh-extraction evaluation runner, and
`/about-metrics`. The eight demo choices cover all five required scenarios plus
Tylenol, apixaban and the older cold formulation. All sample images are visibly
synthetic, derived from the existing assumed scenarios. They are not real box
photos and their cached extractions are not model outputs.

**Still blocked:** no `.env.local` key, real box photos, or human golden labels
were available. The user was asked for them. `eval/golden.json` remains empty;
photo metrics are explicitly not measured. No claim of real-photo accuracy or
clinical validation is justified. Do not mark that part of milestone 4 complete.

Validation: TypeScript, ESLint, production build, 41 normalization cases,
11 exact alert scenarios, scoring regression, and eight demo variants with every
network fetch blocked pass. The synthetic report records 11/11 exact scenarios
and 16/16 expected alert occurrences. Browser checks at 390px cover all demo
choices, clinician results, restored selection, clearing demo mode, metrics,
and no extraction requests or browser errors. External browser requests were
blocked; localhost remained available. This is a local-server demo, not a PWA.

No interaction rules, match gates, model configuration, or clinical evidence
were changed. The patient card's title now waits for a guard-checked brand.
The visit storage shape changed to `tb.visit.v4`.

## Files to start with

- `lib/cache.ts`: bundled curated cache, runtime validation, exact-byte lookup,
  no-network demo extraction, live-error fallback (never replaces a refusal).
- `lib/visit-store.ts`: demo visit lifecycle and reconciliation.
- `app/components/DemoControls.tsx`: bilingual toggle and scenario picker.
- `scripts/demo-build.ts`: reproducible synthetic label/cache generation.
- `scripts/demo-check.ts`: hashes, fallback and fully offline reconciliation.
- `eval/run.ts`, `eval/score.ts`, `eval/scenario-runner.ts`: fresh photo eval,
  scoring, and shared synthetic scenarios; `eval/results.json` is generated.
- `app/about-metrics/page.tsx`: counts, denominators, provenance and limits.
- `eval/README.md`: human labeling instructions and scoring definitions.

## Architectural Decisions & Constraints

There is no `CLAUDE.md`. `AGENTS.md` (generated by Next.js) applies: **this is Next.js 16.4.6 with breaking changes; read `node_modules/next/dist/docs/` before writing Next code.** `cacheComponents: true` is on, so do **not** export `runtime` from routes; `maxDuration` is fine.

Stack: Next.js App Router, TypeScript, Tailwind 4, zod 4, `@anthropic-ai/sdk` 1.8.0, `tsx` + `sharp` for scripts. No database.

Rules that must hold (user requirements):
1. **LLM extracts only.** `claude-sonnet-5-5` via `client.messages.parse` + `zodOutputFormat(ExtractionSchema)`, `output_config.effort: "low"`. It transcribes printed text and must never infer ingredients from a brand name. Do not send `temperature`, `budget_tokens`, or forced `tool_choice` (all 400 on this model).
2. **Normalization and alerts are deterministic.** No LLM call in `lib/normalize.ts`, `lib/reconcile.ts`, `lib/alerts.ts`. The LLM must never create an alert.
3. **Do not use the RxNav interaction API** (discontinued Jan 2024, returns 404).
4. **Unresolved → "Unverified – ask pharmacist / bring the box".** Never guess.
5. **Patient view**: only guard-checked values (`IngredientRow.name_verified`, guarded `strength`); only fixed sentences from `patient_messages`. No severity, no dosing advice, never tell a patient to stop a medicine.
6. **Privacy**: never log or persist uploaded images server-side. No real patient data. Repo is public: never commit `.env.local` or photos with personal details.
7. **Alerts need a cited source.** Do not hand-edit `rxcui` or `evidence` in `data/interactions.json`; run `npm run rules:refresh`. Leave `verified_by` for the human reviewer.
8. Git: one branch per milestone (`build/milestone-N`) branched from the previous one, commit and push after each milestone. Do not push to `main` unless the user asks.

Decisions already made:
- Field provenance is **text-level** (transcript line index + photo), not pixel bounding boxes.
- Confidence is categorical (`high|medium|low|unverified`), computed in `confidenceFor()` from guard result + match type + read confidence.
- Acetaminophen duplication lists per-unit strengths and asks the clinician to total daily intake; it does not compute a daily dose.
- Patient and clinician share one device; no cross-device sync.
- Refusal / parse failure / truncation from the API → `status: "unverified"`. Server-side model fallback was deliberately not enabled.
- Pair rules skip ingredients inside the same product (formulated together).
- Bump the `STORAGE_KEY` suffix in `lib/visit-store.ts` whenever `ReconcileResponse` or `Visit` changes shape.

## Ruled Out / Failed Approaches

- **RxNav `search=2` / `search=1` (normalized) name lookup without a gate**: mapped "chlorpheniramin" to **chlorine**. `lookup()` now uses `search=0` (exact) first and accepts normalized/fuzzy hits only when `levenshtein(fold(name), term) <= max(1, floor(len*0.2))`. Do not loosen this.
- **RxNav `approximateTerm` score as a threshold**: "dinh lang" (đinh lăng) scores well against unrelated "Dinh huong". Same edit-distance gate applies.
- **Folded (diacritic-stripped) matching for Vietnamese herb names**: unsafe (tỏi vs tôi). Herbal map matches with diacritics.
- **Showing raw extraction values on the patient card**: displayed a strength the guard had rejected. Patient card now renders from `ReconcileResponse` rows only.
- **Rules without a verifiable source**: ginseng, licorice, dong quai interactions and ginkgo + antiplatelet/NSAID were dropped because the candidate sources (NCCIH pages, a MedlinePlus URL) did not state them. Do not re-add without a fetchable source.
- **Dead/blocked source URLs**: the FDA PPA information page (404) and `cdc.gov/antibiotic-use` (403 to scripts). Use the Federal Register API and the openFDA amoxicillin label instead (already in place).
- **`cam thảo` (licorice)** resolves to RxNorm "licorice allergenic extract", which is the wrong concept; no rule depends on it, but fix or remove its `rxnorm_terms` in `data/herbal-vi.json` before relying on it.
- **`create-next-app` directly in the repo folder** fails (capitalised folder name, existing README); the scaffold was generated elsewhere and copied in.
- **`python` in Git Bash on this Windows machine** hangs (Store stub). Use `node`/`tsx` for scripting.
- `LayoutProps<"/">` in `app/layout.tsx` breaks `tsc --noEmit` before a build generates types; an explicit `{ children: React.ReactNode }` type is used instead.


## Exact Next Step

1. Ask for the missing prerequisites if not yet provided: add
   `ANTHROPIC_API_KEY` to ignored `.env.local`, real box photos without personal
   details to ignored `eval/photos/`, and human-written labels to
   `eval/golden.json` using `eval/README.md`. Never infer golden labels from
   model output or use synthetic demos as real-photo evaluation data.
2. Run `npm run extract -- eval/photos/<file>.jpg`; compare every
   `source_text` with the actual box before trusting or publishing its cache.
3. Replace synthetic public demo assets/cache entries with privacy-reviewed,
   real sample photos and reviewed model outputs when available. Keep the
   SHA-256 key tied to original public image bytes. The manifest must reference
   the same per-image results. Run `RXNAV_RECORD=1 npm run eval` and both
   normalization/scenario checks to record any newly required RxNav responses.
4. Run `npm run eval`, `npx tsc --noEmit`, `npm run lint`,
   `npm run check:normalize`, `npm run check:scenarios`,
   `npm run check:demo`, `npm run check:eval`, and `npm run build`.
   Rehearse `npm run dev` with external networking disabled and localhost
   available; every required scenario must show expected alerts on
   `/clinician`. Report real-photo denominators and errors honestly.
5. Continue milestone 5 (mobile/UI polish and printable English summary), then
   milestone 6 (deployment/full dry-run), each on its own stacked branch.

## How to test the current synthetic demo

`npm install`, `npm run dev`, open http://localhost:3000, accept consent,
turn on Demo mode, choose a scenario, and open Clinician view. The clinician
header also has a demo picker. Inspect photo/transcript and cited alerts.
Open http://localhost:3000/about-metrics for the report. No API key is needed
for synthetic demo mode. Turning it off starts an empty visit.
