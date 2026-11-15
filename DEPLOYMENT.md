# Cloudflare Workers deployment — milestone 6

Cloudflare Workers replaces Vercel as the deployment target. Use OpenNext for
this existing Next.js app; do not use a static Cloudflare Pages export because
`/api/extract` and `/api/reconcile` require server execution.

## Configuration

- `wrangler.jsonc`: Worker `thuoc-bridge`, Node compatibility, self-service
  binding, static assets, compatibility date pinned to the installed runtime.
- `open-next.config.ts`: read-only build-time static cache. Cache interception
  stays off for Partial Prerendering. No ISR, R2, KV, D1, or uploaded-image store.
- Existing `next dev`, Node production server, and offline fallback still work.
- `public/_headers` caches hashed build assets. Worker observability is disabled;
  request bodies/images must never be logged. Existing API logs contain only
  counts, outcome codes, and elapsed times.
- Anthropic is a runtime secret. Nothing named `NEXT_PUBLIC_` should contain it.

## Build and verify locally (no Cloudflare account needed)

Use Node.js 24 and install dependencies with `npm ci`.

```sh
npm run check:all
npm run cf:build
npm run cf:dry-run
npm run cf:preview -- --ip 127.0.0.1 --port 8788
```

In a second terminal:

```sh
npm run check:release -- http://127.0.0.1:8788
```

For the browser suite against Workers, stop the manual preview, install Chromium
once, then run:

```sh
npx playwright install chromium
TEST_SERVER=cloudflare npm run check:browser
```

CI runs the Node checks, Chromium suite, OpenNext build, deployment dry-run,
and the same Chromium suite against local Workers. Dry-run bundles and checks
upload size but does not publish. A local Workers pass is not a hosted result.

For local live extraction, copy `.dev.vars.example` to git-ignored `.dev.vars`
and set the key there. The app never needs a browser-visible key. On managed
cloud environments, Wrangler logs/config can be placed in writable task paths
using `WRANGLER_LOG_PATH` and `XDG_CONFIG_HOME`. Do not copy proxy credentials.

## Deploy once Cloudflare access is available

1. Select the intended Cloudflare account. Configure `CLOUDFLARE_API_TOKEN`
   securely for Workers deployment and `CLOUDFLARE_ACCOUNT_ID` for that account,
   or use `npx wrangler login` on your own computer. Do not paste tokens in chat.
   No Cloudflare credentials were available during this migration.
2. Build and deploy the release branch:
   `npm run cf:build` then `npm run cf:deploy`. This uses the configured Worker
   name `thuoc-bridge`; rename it and its self-reference together if needed.
3. Add `ANTHROPIC_API_KEY` using the Cloudflare Worker secret UI or
   `npx wrangler secret put ANTHROPIC_API_KEY`. Enter it through the secure prompt,
   never as a command argument or committed variable. Cloudflare's API token is
   for deployment only and must not become an app runtime binding.
4. Open the actual Worker URL returned by deployment, then run
   `npm run check:release -- <actual-worker-url>`. Do not guess a workers.dev URL.
5. Test one live synthetic extraction with Demo mode OFF and confirm `status:ok`
   from `/api/extract`; cached fallback does not prove a live call. Check the
   clinician source panel, patient messages, demo variants, and PDFs on the host.
6. Record URL, commit, deployment status, hosted HTTP results, live extraction
   result, and rehearsal evidence before marking milestone 6 complete.

For Workers Builds connected to GitHub, select the latest release branch, not
`main` (which still holds only the initial README). Use Node 24, build command
`npm run cf:build`, deploy command `npm run cf:deploy`, root directory `/`.
Configure runtime secrets separately from build variables; this build needs no
Anthropic key. No custom domain, DNS change, or paid storage is required by this
configuration. Confirm the account's current plan limits before launch; a
successful dry-run does not establish hosted CPU/request-limit behavior.

## Plan status

Milestones 1–5 are implemented. Milestone 6's Cloudflare adaptation can be
verified locally, but hosted deployment and the physical wifi-off rehearsal
remain open. Automated offline Node and browser regression already exist.
Two live synthetic Anthropic calls passed; real-photo metrics remain unmeasured.

Milestone 7 starts validation and review readiness: precise evaluation of
printed names, strength/unit pairs, RxCUIs, and Unverified behavior, plus human
clinical and language review. It cannot be called clinically validated without
real independent labels and qualified reviewer sign-off.

Use [DEMO-RUNBOOK.md](DEMO-RUNBOOK.md) for the local-server wifi-off demo and
[REVIEW.md](REVIEW.md) for human review. A hosted website is not cold-start offline.

References: [OpenNext setup](https://opennext.js.org/cloudflare/get-started),
[cache options](https://opennext.js.org/cloudflare/caching),
[Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/).
