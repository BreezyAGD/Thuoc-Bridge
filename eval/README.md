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

- `normalization-cases.json`: ingredient names and the RxCUIs they must
  resolve to. Run `npm run check:normalize` (needs network, or the committed
  RxNorm cache). Add a line whenever a new spelling shows up on a box.
- `schema.ts`: the exact format of `golden.json`.
