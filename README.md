# Thuốc Bridge

Medication reconciliation for Vietnamese-speaking patients who use medicines
bought in Vietnam. A patient photographs a medicine box; a clinician reviews
guard-checked ingredients mapped to RxNorm and deterministic, cited alerts.

**Hackathon prototype. No real patient data. Not a substitute for a pharmacist.**

The model transcribes visible text only. The guard verifies text provenance;
normalization and alerts use deterministic code. Unresolved ingredients stay
Unverified. The 27 curated rules still await qualified clinical sign-off.
Vietnamese text awaits fluent-speaker review. Real-photo accuracy is unmeasured;
two live synthetic image smoke checks passed and are reported separately.

## Run

Use Node.js 24. Run `npm ci`, then `npm run dev`, and open
http://localhost:3000. The patient interface defaults to Vietnamese. Accept
consent and enable Demo mode to use the committed synthetic samples without
an API key. Clinician view links to a printable English summary.

Live extraction needs `ANTHROPIC_API_KEY` in the shell or git-ignored `.env.local`.
Only the server uses that key. Images are downscaled, sent through the API to
Anthropic, and never written or logged server-side. On this managed environment,
Node live calls need `NODE_USE_ENV_PROXY=1` to honor the existing HTTPS proxy.
Keep TLS verification enabled; never commit keys, proxy credentials, or photos
with personal details.

## Checks and judging

- `npm run check:all`: typecheck, lint, normalization, alerts, demo cache, scorer,
  production build, and key-free offline server/API checks.
- `npx playwright install chromium` once, then `npm run check:browser`: Chromium
  consent, demo, responsive layout, error/retry, and PDF checks after a build.
- `npm run check:golden`: readiness of independently labeled real photos.
- `npm run eval`: real-photo metrics and separate synthetic alert regression.
- `npm run check:release -- <app-url>`: HTTP acceptance of a running deployment.

See [DEMO-RUNBOOK.md](DEMO-RUNBOOK.md) for the wifi-off local-server fallback and
[REVIEW.md](REVIEW.md) for reviewer tasks. Longer summaries continue onto extra
pages rather than hiding findings. The eight demo variants fit one Letter page.

## Cloudflare Workers

Cloudflare replaces Vercel as the target. `npm run cf:build` adapts the existing
Next.js app using OpenNext. `npm run cf:dry-run` verifies its upload bundle.
`npm run cf:preview` serves it in the local Workers runtime. After a build,
`npm run cf:deploy` publishes when Cloudflare access is configured.

No R2/KV/D1 storage is configured. The static cache stores build-time shells;
visit data and uploaded images are not persisted there. Anthropic is a Worker
runtime secret. `.dev.vars.example` documents local Wrangler secrets.
See [DEPLOYMENT.md](DEPLOYMENT.md) for setup, commands, acceptance gates, and
current milestone status. Deployment stays pending Cloudflare account access.

Milestone 7 has started: [validation and review readiness](MILESTONE-7.md),
including separate exact printed strength/unit scoring. Real-photo collection
and qualified reviewer sign-offs remain pending.

Milestone 8 adds [visit management](MILESTONE-8.md): Start new visit clears
local visit data, cancels pending work, and requires fresh consent while keeping
the language preference. Downloaded PDFs remain. Latest branch: `build/milestone-8`.

Milestone 9 adds a [guided presentation demo](MILESTONE-9.md) at `/demo-guide`,
linked from the patient and clinician controls. It walks through five synthetic
cases, checks expected findings, and links to source review and summaries.
Latest branch: `build/milestone-9`.
