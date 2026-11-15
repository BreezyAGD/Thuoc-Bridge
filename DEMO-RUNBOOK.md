# Judging rehearsal without box photos or deployment

Use only the committed synthetic demo samples. Say explicitly that they are
synthetic and that real-photo accuracy has not been measured. No Vercel token,
Anthropic key, physical boxes, or patient information is needed for this path.

## Automated rehearsal

On Node.js 24:

```sh
npm ci
npm run check:all
```

The command runs type checking, lint, 41 normalization fixtures, 11 alert
scenarios, exact-image demo cache checks, evaluation scorer tests, a production
build, and an isolated production HTTP rehearsal. The build/install need
internet; the rehearsal runs after the build with external TCP blocked in its
Node child processes and no inherited credentials. It checks all five pages,
every demo image hash, all eight demo scenario variants through `/api/reconcile`,
invalid input rejection, and safe failure of live extraction without a key.
The child server binds loopback on a temporary port and is stopped afterwards.

If a production build already exists, rerun just the rehearsal:

```sh
npm run check:offline-release
```

This is an automated server/API rehearsal. It does not replace clicking through
the browser, testing the camera/print dialog, or physically disabling wifi. The
network preload is test-only application instrumentation, not an OS firewall.
It is not imported by the app or used in deployed production.

`.github/workflows/checks.yml` runs the same checks on pushes and pull requests,
without configured secrets. An empty real-photo dataset intentionally does not
fail the synthetic demo checks. Use `npm run check:golden` separately before a
real-photo evaluation; an empty set must remain unmeasured.

## Short presentation flow

Start the already-built app with `npm run start` and open
`http://localhost:3000` on the same laptop.

1. Explain the problem: Vietnamese medicine packaging can be difficult to
   reconcile with a US medication list. Accept consent, then enable Demo mode.
2. Choose the paracetamol/Norco scenario. Show the printed ingredient and
   strength, then the clinician table: acetaminophen, RxCUI 161, and duplication.
   Open the source photo/transcript to show where the reading came from.
3. Choose ginkgo with warfarin or apixaban. Show the cited clinician interaction
   and pending pharmacist-review status; keep any unresolved ingredient visible.
4. Choose the cold-medicine/BP scenario. Show the decongestant alert; the PPA
   variant adds its own flag. Do not present per-unit strength as a daily dose.
5. Choose OTC antibiotic. Show antibiotic and allergy-review flags.
6. Choose the herbal sample with no ingredient list. Show Unverified and the
   fixed patient message to bring the box to a pharmacist. No brand inference.
7. Open Printable English summary, then Print / Save PDF. The eight demo variants
   previously fit one Letter page each. Keep all findings if a longer visit
   requires additional pages. Show `/about-metrics`: synthetic regression
   results and unmeasured real-photo metrics are separate.

For a physical wifi-off rehearsal, prepare the build/assets first, leave the
local server running, then disable wifi on that laptop. Run the same browser
flow and `npm run check:release -- http://localhost:3000`. Reconnect afterwards.
A hosted site cannot cold-load offline; a phone on disconnected wifi cannot
reach the laptop. Do not claim either behavior from Demo mode.

## Clear answers to likely questions

- **Does the AI diagnose or create interactions?** No. The model transcribes
  printed text. The guard, RxNorm mapping, and cited alert engine are deterministic.
- **What if a label cannot be read?** It stays Unverified and prompts pharmacist
  confirmation. The model is instructed not to identify ingredients from a brand.
- **How accurate is it?** Two live synthetic image checks passed. Real-photo
  precision/recall is unmeasured; 41 normalization and 11 synthetic alert fixtures
  are regression checks, not clinical validation.
- **Are rules clinically approved?** No reviewer has signed off the 27 curated
  rules yet. Machine-fetched source evidence is separate from human verification.
- **Where do images go?** In live mode, the browser sends a downscaled image
  through the extraction API to Anthropic. The app does not write uploaded images
  server-side. Demo mode uses synthetic committed data. Use no real patient data.

## Remaining external inputs

Vercel access enables hosted deployment. Independent real-box photos and labels
enable measured photo evaluation. A pharmacist and fluent Vietnamese reviewer
enable clinical/language sign-off. None is claimed complete by this rehearsal.

## Browser regression rehearsal

After a production build, install the test browser once and run:

```sh
npx playwright install chromium
npm run check:browser
```

The 23 Chromium tests cover consent, bilingual navigation, patient messages,
empty/error print states, all eight demo variants, source-photo/transcript
panels, Letter PDFs, responsive layouts at 320/390/768 px, and reconciliation
retry, plus honest real-photo strength/unit metrics. They block external browser requests and start a separate production
server on port 3100 with the test-only network preload and empty Anthropic
credentials. Demo scenarios must make zero extraction API calls. This is a
browser simulation of the synthetic path, not a physical camera or wifi test.

GitHub Actions runs the browser tests after the server checks. Its
`synthetic-browser-report` artifact contains the HTML report and synthetic PDFs;
failing tests retain screenshots and traces. Local reports are git-ignored.

Cloudflare runtime check: after `npm run cf:build`, use
`TEST_SERVER=cloudflare npm run check:browser` to run the same suite in local
Workers. Cloudflare deployment replaces the earlier Vercel target; see
[DEPLOYMENT.md](DEPLOYMENT.md).

Before handing the device to another participant, use **Start new visit** and
confirm the local clearing action. The next visit starts with unchecked consent;
previous PDFs on disk remain. See [MILESTONE-8.md](MILESTONE-8.md).

## Guided presentation

Open **Demo walkthrough** from the patient or clinician controls. `/demo-guide`
provides the five-step English presenter flow, expected synthetic findings,
loading/error/mismatch status, and source-review/summary links. Loading asks
before replacing a non-demo visit. Step navigation alone preserves the visit.
Read [MILESTONE-9.md](MILESTONE-9.md) for coverage and limits.
