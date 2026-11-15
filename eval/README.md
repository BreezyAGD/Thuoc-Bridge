# Evaluation data

`golden.json` is the hand-labeled ground truth the pipeline is scored against.
It starts empty. The numbers on the metrics page are only as honest as these
labels, so:

**Label from the physical box, never from what the app says.**

## Adding a product (about 3 minutes each)

1. Photograph the side of the box that lists the ingredients ("Thành phần").
   Save it as `eval/photos/<short-id>.jpg`. No patient names or pharmacy
   labels with personal details: this repository is public.
2. Add an entry to `items` in `golden.json`. Copy the shape from
   `golden.example.json`.
3. For each active ingredient printed on the box, write:
   - `name_printed`: exactly as printed, Vietnamese spelling included
     ("Clorpheniramin maleat", not "chlorpheniramine").
   - `strength` and `unit`: as printed. Use a decimal point (`0.5`, not `0,5`).
     `null` for both if the box prints no amount.
   - `rxcui` and `us_name`: look the ingredient up at
     https://mor.nlm.nih.gov/RxNav/ and copy the **ingredient** (IN) RxCUI.
     Use `null` if RxNorm has no entry (common for herbal ingredients).
4. Leave excipients ("Tá dược vừa đủ ...") out.
5. Put your name in `labeled_by`.

Also include two or three photos where the ingredient list is **not** visible
(front of the box, a blurry shot, a herbal product with no list). Set
`expect_unverified: true` and `ingredients: []`. These measure whether the
pipeline stays safely unsure instead of guessing from the brand name.

## Other files

- `npm run eval` reads `.env.local`, validates `golden.json`, processes each photo
  through `extractLabel` and `reconcile`, and writes `results.json`. No image,
  transcript, or full extraction is saved. No demo cache is used in scoring.
- Precision/recall match guard-checked ingredient names one to one after case
  and diacritic folding. Strength/unit accuracy is not measured. RxNorm success
  requires a single concept matching the human ingredient RxCUI, divided by all
  expected non-null RxCUIs. Missing/failed photos earn no recall or RxNorm credit.
  Photo errors make the report incomplete and the command exits nonzero.
- Unverified rate is unverified products / scored products; classification
  correctness compares each product with `expect_unverified`. Zero denominators
  are `null` (not measured), never 100%. An empty golden set still runs the 11
  synthetic alert scenarios, reported separately with exact-set correctness
  and per-rule precision/recall. Alert failures make the command exit nonzero.
- Synthetic demo assets are not included in `golden.json`; they cannot establish
  photo accuracy. Add real photos and human labels before claiming that accuracy.
- `eval/photos/` is git-ignored. Public sample photos must be reviewed for privacy
  before any explicit publication. Never include patient information.

- `normalization-cases.json`: ingredient names and the RxCUIs they must
  resolve to. Run `npm run check:normalize` (needs network, or the committed
  RxNorm cache). Add a line whenever a new spelling shows up on a box.
- `schema.ts`: the exact format of `golden.json`.
