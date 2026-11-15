# Milestone 10 — release readiness and next steps

Latest branch: `build/milestone-10`, including milestones 8–9 and the Cloudflare
adaptation. This adds a read-only presenter/operator page at `/readiness`, linked
from metrics and the demo walkthrough. It does not change patient visit data.

The page lists implementation milestones separately from five external gates:
Cloudflare hosted verification, real-photo evaluation/review, pharmacist rule
review, Vietnamese review, and the physical wifi-off rehearsal. It does not
probe credentials, call APIs, submit approvals, or offer checkboxes that can
silently mark a gate complete.

## Evidence and status

- Photo measurement counts come from `eval/results.json`; empty, failed, or
  incomplete runs cannot become measured/reviewed evidence. Human photo review
  must reference the exact report timestamp; rerunning eval invalidates an old
  photo-review record until the new report is reviewed.
- Rule review counts come from existing rule-level `verified_by` fields. Zero
  rules cannot count as full review. No new sign-offs were entered.
- Deployment, physical rehearsal, and language/photo-review records live in
  `data/release-evidence.json` and remain null until actual evidence exists.
  The schema requires reviewer/checker identity, timestamp, commit, outcome,
  and public reference. Hosted checks include pages/APIs and live extraction;
  physical rehearsal includes wifi disabled, all five cases, source checks/PDF.
- The recorded software baseline is milestone 9's successful CI run at its
  explicit commit/date. Its 23-case counts are historical, not the current test
  count or a live status claim. The current branch's CI result is separate.
- Evidence applies to the documented commit/report, not automatically to later
  code. CI does not establish clinical accuracy. No secret values belong in
  records or links. Use public HTTPS evidence links without URL credentials,
  queries, or fragments; reference private evidence through a safe public record.

## Verification

`npm run check:readiness` tests empty/incomplete evidence, report-specific review,
required hosted/rehearsal checks, reviewer fields, invalid references, and CI
separation. It runs in `check:all`. Two browser cases verify truthful pending
counts, read-only navigation, no API probes, visit preservation, and responsive
layouts. The full suite has 25 cases against Node and local Workers.
HTTP release acceptance now includes `/readiness` (seven pages total).

See [NEXT-STEPS.md](NEXT-STEPS.md). The remaining work completes milestones 6
and 7; these additional feature milestones do not remove their external gates.
