# Milestone 9 — guided presentation demo

This extends the prototype with a presenter walkthrough. It requires neither
hosting credentials nor real boxes. The latest branch is `build/milestone-9`.
The independent deployment, photo-evaluation, clinical-review, and language-review
gates remain open; the walkthrough does not complete those gates.

## Presenter flow

Open **Demo walkthrough** from the patient/clinician controls or visit
`/demo-guide`. The English presenter page walks through five existing synthetic
fixtures: paracetamol duplication, ginkgo/warfarin, combination cold medicine,
OTC antibiotic, and a no-list herbal product.

Changing a step alone does not mutate the visit or call an API. **Load synthetic
scenario** explicitly starts the cached demo. A current non-demo visit requires
confirmation before replacement; Cancel preserves it. Loading retains the
existing demo behavior and milestone 8's cancellation/stale-result protection.

Expected findings are derived from the committed fixture IDs and existing rule
titles, not new clinical rules or model-generated advice. The guide compares
actual rule-ID sets with the fixture and requires RxNorm availability before
showing **Expected demo findings reproduced**. It distinguishes checking,
request failure/retry, and a successful HTTP response with mismatched findings.
These are synthetic regression statuses, not clinical verification.

Once checked, **Review clinician findings** opens the table and its existing
photo/transcript controls. A matched fixture also exposes **Open printable
summary**. The original patient and clinician pages still offer all eight demo
variants. The final step directs the presenter to Unverified and Start new visit.
No live extraction request is made by the walkthrough; only the existing
reconciliation endpoint runs against cached sample inputs.

## Verification

The HTTP release check includes `/demo-guide` alongside the five existing pages.
Five new Chromium regressions cover read-only navigation, all five scenario
loads at 320 px, clinician source/summary links, protection of a non-demo visit,
failed-check retry, and fixture-mismatch handling. The full browser suite has
23 cases and runs against both Node and local Cloudflare Workers in CI.
Existing tests cover all eight synthetic PDFs and the milestone 8 lifecycle.

The page states that its samples are synthetic and photo accuracy is unmeasured.
The local server must remain running for a wifi-off presentation. It does not
claim a hosted cold start works offline. The new Vietnamese navigation label
still needs fluent-speaker review; presenter notes are English only.
