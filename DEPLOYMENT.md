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

For Workers Builds connected to GitHub, select `main`. All milestone and
validation work is consolidated there. Use Node 24, build command
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

Milestone 7 has started; see [MILESTONE-7.md](MILESTONE-7.md). It covers precise evaluation of
printed names, strength/unit pairs, RxCUIs, and Unverified behavior, plus human
clinical and language review. It cannot be called clinically validated without
real independent labels and qualified reviewer sign-off.

Use [DEMO-RUNBOOK.md](DEMO-RUNBOOK.md) for the local-server wifi-off demo and
[REVIEW.md](REVIEW.md) for human review. A hosted website is not cold-start offline.

References: [OpenNext setup](https://opennext.js.org/cloudflare/get-started),
[cache options](https://opennext.js.org/cloudflare/caching),
[Cloudflare secrets](https://developers.cloudflare.com/workers/configuration/secrets/).

[Milestone 8](MILESTONE-8.md) adds local visit reset and stale-result protection.
Its browser regressions run against Node and Workers in the same CI workflow.

[Milestone 9](MILESTONE-9.md) adds `/demo-guide`; hosted acceptance must check
this route too. It remains a synthetic presentation, not a clinical validation.

[Milestone 10](MILESTONE-10.md) adds `/readiness` to hosted acceptance and a
read-only evidence summary. See [NEXT-STEPS.md](NEXT-STEPS.md) for the remaining
sequence. Record actual evidence in data/release-evidence.json; never secrets.

## Integration configuration still required

The repository contains the Workers/OpenNext configuration and both server API
routes. Tests and dry-runs do not create a Cloudflare account/project or deploy
the app. The current GitHub Actions workflow runs checks only; merging into
`main` does not deploy until a deployment integration is connected.

- **Cloudflare account:** provide the intended account ID and a securely scoped
  Workers deployment API token for CLI deployment, or sign in locally with
  Wrangler. Neither was configured in this execution environment.
- **Worker:** publish `thuoc-bridge` using `npm run cf:build` and
  `npm run cf:deploy`. The ASSETS and WORKER_SELF_REFERENCE bindings are already
  declared in wrangler.jsonc. No R2/KV/D1 database is required by this app.
- **Git-based deploys (optional):** connect this GitHub repository to Cloudflare
  Workers Builds, production branch `main`, root `/`, Node 24, build command
  `npm run cf:build`, deploy command `npm run cf:deploy`. The existing GitHub CI
  is verification only. CLI deployment is sufficient if automatic deploys are
  not wanted. Do not add an Anthropic key to browser/build-public variables.
- **Anthropic runtime secret:** set `ANTHROPIC_API_KEY` on the deployed Worker
  through the Cloudflare secret UI or Wrangler's secure secret prompt. The SDK,
  model, structured extraction, and API route are implemented; the key already
  worked in two local live synthetic smoke checks. That local environment key
  is not automatically copied to Cloudflare. For local Workers live preview,
  use git-ignored `.dev.vars`; demo mode needs no key.
- **Hosted verification:** use the actual deployed URL for seven-page HTTP
  checks, browser demo/printing, and an uncached live extraction. Confirm the
  runtime can reach Anthropic and the deployed key can use `claude-sonnet-5-5`.
  A cached result is not proof of a successful live API request.
- **Domain (optional):** a workers.dev URL is sufficient. Custom domain/DNS,
  Cloudflare storage, and Vercel credentials are not required for this setup.

Do not copy the managed development environment's HTTPS proxy configuration
into Workers. The local `NODE_USE_ENV_PROXY=1` fix was environment-specific;
Workers use their own outbound fetch. Keep credentials out of source, chat,
client bundles, and committed evidence records.

## Deployed but “No URLs enabled”

A Ready build can exist without a public route. In the Worker dashboard, open
Domains (or Settings > Domains & Routes), locate the disabled workers.dev row,
and enable it. Use the actual address displayed there. The repository now
explicitly sets workers_dev: true so subsequent deployments request the public
workers.dev route. No custom domain or DNS record is needed for this demo URL.
This does not verify the app or Anthropic; run the hosted checks after enabling.

## PR preview deployment configuration

Cloudflare's default non-production command, `npx wrangler preview`, uses the
new isolated Worker Previews system. It fails for this repository with
“Your Wrangler configuration needs a previews block.” Adding an empty block
alone also leaves the service binding excluded, as the log warns.

For this OpenNext application, configure Workers Builds to upload a Worker
version using the adapter's supported command instead:

| Cloudflare setting | Value |
| --- | --- |
| Build command | `npm run cf:build` |
| Production branch | `main` |
| Production deploy command | `npm run cf:deploy` |
| Non-production / Preview command | `npm run cf:upload` |
| Root | `/` |

Edit the Preview command under the Worker's Settings > Build(s) configuration.
The script `cf:upload` runs `opennextjs-cloudflare upload`: it prepares the
static cache assets and invokes `wrangler versions upload`. It does not switch
production traffic to the uploaded PR version. `preview_urls: true` enables
Version URLs in Wrangler configuration. This mode needs no `previews` block.

Version URLs use that version's Worker bindings/secrets; they are not isolated
branch resource environments. In particular, live extraction there can use the
Worker's runtime Anthropic secret. Synthetic demo checks need no key. This app
has no shared visit database, R2, KV, or D1 data store. Do not use production
deploy as the PR Preview command, and do not add secrets to source.

After updating the dashboard, run the latest PR build containing these scripts.
Retrying the original ebb6a4d build cannot run cf:upload because that old commit
does not contain it. A new push creates a build using the updated source.

`npm run cf:upload:dry-run` checks adapter asset preparation and the version
upload bundle without credentials or publishing; CI runs it after cf:build.
Actual remote preview upload still requires Cloudflare's authorized build token
and the dashboard command change. A token's display name alone does not establish
its permissions; investigate that only if a subsequent error reports access denial.

References: https://opennext.js.org/cloudflare/cli and
https://developers.cloudflare.com/workers/ci-cd/builds/configuration/ .
