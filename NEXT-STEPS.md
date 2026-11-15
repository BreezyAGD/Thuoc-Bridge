# Remaining steps for Thuốc Bridge

Release branch: `main` (all milestone and validation branches are included). Milestones 1–5 and 8–10 are
implemented. Milestone 6 has a tested Cloudflare adaptation but no hosted
verification; milestone 7 has evaluation tools but no independent real-photo
study or qualified human review. No additional feature milestone is required
to finish the original hackathon plan.

## 1. Rehearse now, without credentials or real boxes

Prepare while connected: `npm ci`, `npm run check:all`, then `npm run start`.
Open the local app on the same laptop, choose Demo walkthrough, and run the five
cases. Check source images/transcripts, cited clinician alerts, patient messages,
and printable PDFs. Test Start new visit and fresh consent. Then disable wifi
on that laptop while keeping the server running and repeat the flow. Reconnect
when finished. Automated network-blocked checks are not this physical rehearsal.

Record the tester, date, release commit, and outcomes in the evidence register
only after the actual rehearsal. See DEMO-RUNBOOK.md. The guide and synthetic
samples need no Anthropic key.

## 2. Deploy when Cloudflare access is available — finish milestone 6

Securely configure `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` for the
intended account; do not put them in chat, source, evidence records, or the app's
browser code. Follow DEPLOYMENT.md to build/deploy Workers and configure
`ANTHROPIC_API_KEY` as a runtime secret. No Vercel token is needed.

Use the actual URL returned by deployment. Run `npm run check:release -- <url>`,
verify the hosted browser flow, and confirm a real `/api/extract` success with
Demo mode off. A cached fallback is not live API evidence. Record the hosted
URL, commit, timestamp, and verification evidence. No domain/DNS change is
required by the current Workers setup.

## 3. Evaluate real photos when available — milestone 7

Collect non-identifying ingredient-panel photos and unreadable/no-list negatives.
A person independently transcribes each box before seeing model output and
records their name. Add local files and labels as described in eval/README.md.
Run `npm run check:golden`, then `npm run eval` with API access. Review all wrong
or missing names, printed amount/unit pairs, RxCUIs, and Unverified results.
Report counts and failures; do not invent accuracy from synthetic examples.
Record the human review against that exact report timestamp.

## 4. Obtain human review — milestone 7

Use REVIEW.md for pharmacist review of all 27 rules, ingredient groups, evidence,
clinical wording, and patient messages. A fluent Vietnamese reviewer checks the
patient interface, consent, fixed messages, unknown/error states, and all newly
added navigation/reset wording on a phone. Record actual reviewers and scope;
do not fill sign-offs from an automated check.

## 5. Final release decision

Rerun Node/Workers/browser checks after corrections. Verify the intended hosted
release, physical fallback, real-photo report, and scoped human review evidence.
The `/readiness` page summarizes committed evidence and does not perform a live
audit. Old records apply only to their documented commits/reports. A clinician
must judge suitability for the intended use; CI is not clinical validation.
