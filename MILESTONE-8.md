# Milestone 8 — visit management

This extends the original plan with a local visit lifecycle. Cloudflare access,
real-photo validation, clinical review, and language review remain separate gates.

## Behavior

Patient and clinician demo controls now show **Start new visit** whenever there
are medicines, products, or an active demo. A bilingual dialog explains the
local clearing action. Cancel or Escape keeps the current visit. Confirm:

- Clears products, US medicines, extracted fields, alerts, and reconciliation.
- Clears in-memory photo references and all `tb.visit.*` session-storage entries,
  including older formats. It preserves unrelated storage and language preference.
- Cancels pending browser extraction/reconciliation requests and invalidates
  callbacks from the old visit. Late results cannot populate the next visit.
- Clears this tab's consent and returns to a fresh unchecked consent form.
  This also works when Next.js preserves the earlier consent page in memory.
- Leaves downloaded PDFs and already-transmitted requests outside the scope of
  the local reset. Canceling a browser fetch cannot retract data already received
  by Anthropic. There is no server visit database to delete.

Editing medicines also invalidates old reconciliation immediately, including
inside the debounce interval. Summaries cannot be printed while matching is
pending or after a failed check. Removing a photo cancels its pending extraction.
Reloading preserves the selected interface language and its document language.

## Verification

`npm run check:all` covers the Node build, cache, scorer, alert, and offline API
checks. The browser suite now has 18 tests. Four lifecycle regressions cover
cancel/confirm, storage/consent clearing, pending extraction cancellation, pending
reconciliation cancellation before a different demo, and stale-summary prevention
while a medicine edit is being checked. The existing cases verify all synthetic
demo variants, responsive layouts, source panels, and printable PDFs.

CI runs those browser tests against both the Node production server and local
Cloudflare Workers. No real patient data or live vision calls are required.

## Manual check

Start a demo in either patient or clinician view, choose Start new visit, then
Cancel: medicines should remain. Repeat and confirm: consent is unchecked,
medicines and results are gone, and the language choice is retained. Opening the
summary must show no printable result. Repeat during a pending extraction/check.
New Vietnamese strings still require fluent-speaker review.

The latest release branch is `build/milestone-8`. This does not complete pending
Cloudflare hosting or the independent validation gates described in milestones
6 and 7.
