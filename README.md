# Thuốc Bridge

Medication reconciliation for Vietnamese-speaking patients who take medicines
bought in Vietnam or at Vietnamese pharmacies. A patient photographs the box;
a nurse or pharmacist gets the active ingredients mapped to RxNorm, with
duplication and interaction alerts.

**Prototype. Not a substitute for a pharmacist. No real patient data.**

## Accuracy architecture

| Step | What | How |
|---|---|---|
| A. Extraction | Read only what is printed on the package | Claude vision (`claude-sonnet-5-5`), strict JSON schema, verbatim source text per field |
| B. Normalization | Ingredient name → RxNorm RxCUI | NLM RxNav REST API, deterministic, no LLM |
| C. Interactions | Duplications, drug–drug, herb–drug | Curated `data/interactions.json`, each rule cited and signed off |

The LLM never infers ingredients from a brand name and never creates an alert.
Anything unresolved is shown as **Unverified**.

Status: step A is built (milestone 1). Steps B and C are next.

## Run locally

```bash
npm install
cp .env.example .env.local   # then put your key in .env.local
npm run dev
```

Open http://localhost:3000, accept the disclaimer, and add a photo of a
medicine box.

Extract one photo from the command line (same code path as the app):

```bash
npm run extract -- path/to/photo.jpg
```

## Privacy

- Photos are downscaled in the browser, sent to `/api/extract`, forwarded to
  the Anthropic API, and discarded. They are never written to disk or logged.
- `.env.local` is git-ignored. Never commit an API key.
