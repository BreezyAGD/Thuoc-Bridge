# Milestone 7 — validation and review readiness

This is a new extension to the original six-milestone hackathon plan. It has
started; real-photo evaluation and qualified human review remain pending.
Cloudflare deployment is still milestone 6 and is not marked complete here.

## Implemented in this branch

The photo scorer now measures printed strength + unit correctness separately
from ingredient precision/recall and RxNorm matching. It requires a matched,
guard-checked printed ingredient name and the exact guarded numeric strength
with the labeled unit. Unit case and surrounding whitespace are ignored; there
are no conversions between g and mg and no daily-dose calculations.

The denominator is all human-labeled ingredients with a non-null printed
strength, including ingredients in failed or missing extractions. Missing,
wrong, or guard-rejected amounts/units earn no credit. Ingredients with no
labeled amount are excluded. One-to-one name matching prevents duplicate
predictions from inflating the numerator. Report schema version is now 2.

Scorer regressions cover wrong amount/unit/name, missing and rejected strengths,
decimals, duplicate predictions, unlabeled amounts, and zero denominators. The
metrics page shows this separate count/rate. With zero real photos, it must
remain 0/0 and Not measured. The two live synthetic smoke checks are separate.

## Remaining gates

1. Collect real non-identifying ingredient-panel photos plus no-list/blurred
   negatives. Independently transcribe labels and record the human labeler.
   Do not copy model output or synthetic fixtures into the real-photo dataset.
2. Run `npm run check:golden`, then `npm run eval` with runtime Anthropic access.
   Review every wrong/missing ingredient, amount/unit, RxCUI, and Unverified
   outcome against the box. Report actual sample counts and unresolved failures.
3. Use REVIEW.md for qualified pharmacist review of all 27 rules, ingredient
   groups, evidence, clinical wording, and patient messages. Do not insert
   reviewer names or sign-offs without their actual review.
4. Obtain fluent Vietnamese review of consent, upload instructions, fixed
   patient messages, and unknown/error states on a phone. Record corrections.
5. After those inputs arrive, rerun Node/Workers/browser regression and evaluate
   whether the prototype is suitable for its intended demo scope. A green CI
   run alone is not clinical validation; do not invent acceptance percentages.

## Source of truth

- `eval/golden.json`: human labels, still empty.
- `eval/results.json`: real-photo and separate synthetic regression counts.
- `eval/live-smoke-results.json`: two live synthetic image checks only.
- `data/interactions.json`: rule-level reviewer fields, still pending.
- `REVIEW.md`: human reviewer checklist.
- `DEPLOYMENT.md`: Cloudflare milestone 6 setup and hosted verification gates.
