# Thuốc Bridge release plan

## Current status

Milestones 1–5 are implemented. Milestone 6 is **prepared, not deployed**.
No hosted URL has been verified. Two live synthetic Anthropic extractions now
pass with guard, RxNorm, and alert checks (see eval/live-smoke-results.json).
Real-photo extraction accuracy is still unmeasured.
The release branch is `build/milestone-6`, based on `build/milestone-5`.
`main` still contains only the initial README; do not deploy it.

## Deploy on Vercel

1. Import GitHub repository `BreezyAGD/Thuoc-Bridge` into the intended Vercel
   account/team. Choose Next.js, repository root, Node.js 22.x, `npm ci`,
   `npm run build`, and the default Next.js output directory.
2. Set the production branch to `build/milestone-6`. Do not merge or change
   `main` just to deploy. For a preview instead, select this same branch and
   configure the key for Preview as well.
3. Add `ANTHROPIC_API_KEY` as a sensitive, server-side environment variable.
   Do not use a `NEXT_PUBLIC_` prefix, commit `.env.local`, or paste the key
   into a URL. Redeploy after setting/changing the variable.
4. Deploy and wait for Vercel's Ready status. If the build fails, inspect the
   build logs before changing pinned dependency versions or Next.js settings.
5. Run `npm run check:release -- https://YOUR-DEPLOYMENT.vercel.app` against
   the actual URL. This checks all five pages, exact demo image hashes, all
   eight synthetic scenario variants through the HTTP API, and invalid-input
   rejection. It does not invoke Anthropic or measure photo accuracy.
   An authentication/protection page must not be counted as an app success.
6. Open the hosted patient view on a phone. Accept consent, enable Demo mode,
   and run the five scenario families below. Open clinician view and printable
   summary for each. Verify the summary PDF and source-photo/transcript panel.
7. With a synthetic sample, test `/api/extract` once with Demo mode OFF.
   Confirm an actual `status: ok` response, source text against the image, and
   guarded downstream results. A cached fallback is not proof of a live call.
   Then repeat with consented, non-identifying real box photos and hand labels.
8. Record deployment URL, commit, Ready status, HTTP check output, live vision
   result, and rehearsal results here before marking milestone 6 complete.

Alternatively, when `VERCEL_TOKEN` is securely available in the execution
session, use the official Vercel CLI to link the intended account/project,
configure runtime secrets, and deploy this branch. Do not print or commit the
credential. Account/team selection is still required if ambiguous.

## Wifi-off judging rehearsal

A hosted website needs internet for a cold load and API requests. Demo mode
caches extraction and RxNorm data; it is not a service worker or a fully offline
hosted app. Use the local production server for the wifi-off rehearsal:

```sh
npm ci
npm run typecheck
npm run lint
npm run check:normalize
npm run check:scenarios
npm run check:demo
npm run check:eval
npm run build
npm run start
```

Open `http://localhost:3000`, enable Demo mode, then disable wifi on the demo
laptop while leaving the local server running. Use the browser on that same
laptop. Do not use a separate phone that depends on wifi to reach the laptop.
Run `npm run check:release -- http://localhost:3000` in a second terminal.

| Scenario family | Required visible finding |
| --- | --- |
| Paracetamol + Tylenol / Norco | Acetaminophen duplication; per-unit strengths |
| Ginkgo + warfarin / apixaban | Cited interaction; unresolved ingredients retained |
| Combination cold medicine + BP medicine | Decongestant/BP warning; PPA flag in PPA variant |
| OTC antibiotic | OTC antibiotic and allergy-review flags |
| Herbal product with no readable ingredients | Unverified; bring box / ask pharmacist |

For every family: verify patient-safe fixed sentences, English clinician
alerts and citations, pending pharmacist review labels, and printable summary.
Reconnect wifi after rehearsal. Keep the local demo available as the judging
fallback. No real patient data in the demo or repository.

## Full plan after deployment

| Milestone / gate | Status and next action |
| --- | --- |
| 1. Consent, photo upload, extraction | Implemented; live synthetic vision validated; real-photo validation pending |
| 2. Provenance guard, RxNorm, clinician table, US medicines | Implemented; 41 normalization fixtures pass |
| 3. Deterministic alerts and patient messages | Implemented; 11 synthetic scenarios pass; 27 rules await clinical review |
| 4. Demo cache, evaluation, metrics | Implemented; eight demo variants pass offline logic checks; real-photo metrics unmeasured |
| 5. Mobile polish and English print summary | Implemented; prior Chromium checks at 320/390/768 px and all eight one-page Letter demo PDFs pass |
| 6. Vercel deployment and full dry-run | Blocked on deployment access; release checks/runbook prepared; hosted and physical wifi-off evidence pending |
| Real-photo validation | Supply non-identifying box photos in `eval/photos/`, independently label `eval/golden.json`, run `npm run eval`; investigate every mismatch |
| Clinical and language review | Pharmacist verifies rules and evidence; Vietnamese speaker reviews UI and fixed messages; keep review status honest |
| Final judging rehearsal | Time the five scenarios, check source provenance, PDF, live-vs-demo labels, and local-server fallback |

The original plan is a hackathon prototype plan. Deployment and synthetic
regression results do not establish clinical accuracy or readiness for patient
care. Do not invent photo metrics or reviewer sign-offs.

Validation update: live transport works on this managed environment with Node 24
and `NODE_USE_ENV_PROXY=1`. See `eval/README.md`, `npm run check:golden`, and
[REVIEW.md](REVIEW.md) for the next real-photo and human review steps.
