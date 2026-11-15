# Clinical and Vietnamese review packet

Status: pending human review. No sign-offs have been entered by the agent.

## Pharmacist review

For each rule in data/interactions.json, read the source and stored evidence
quote, confirm the normalized ingredient groups, exclusions, severity, clinician
wording, and fixed patient message. Review low-confidence and unresolved cases.
Record corrections and reviewer name/date; only the qualified reviewer should
authorize a verified_by value. Machine-confirmed source wording is not clinical
verification. Refresh evidence/RxCUIs with npm run rules:refresh instead of
manually editing those fields.

| Rule | Finding | Severity | Evidence | Human status |
| --- | --- | --- | --- | --- |
| apap-duplicate | Acetaminophen in more than one product | high | [FDA OTC label: acetaminophen](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0005aafa-08f8-4990-a54d-cc097195708f) | Pending |
| apap-warfarin | Acetaminophen with warfarin | moderate | [FDA OTC label: acetaminophen](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0005aafa-08f8-4990-a54d-cc097195708f) | Pending |
| ginkgo-warfarin | Ginkgo-containing product with warfarin | moderate | [FDA prescribing information: warfarin](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0cbce382-9c88-4f58-ae0f-532a841e8f95) | Pending |
| ginkgo-doac | Ginkgo-containing product with a direct oral anticoagulant | moderate | [NIH NCCIH: Ginkgo](https://www.nccih.nih.gov/health/ginkgo) | Pending |
| garlic-antithrombotic | Garlic supplement with an anticoagulant or antiplatelet | low | [NIH NCCIH: Garlic](https://www.nccih.nih.gov/health/garlic) | Pending |
| nsaid-anticoagulant | NSAID with an anticoagulant | high | [FDA prescribing information: warfarin](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=19a69a72-ac5d-45d5-a94d-a5aaecbe4730) | Pending |
| antiplatelet-anticoagulant | Aspirin or another antiplatelet with an anticoagulant | high | [FDA prescribing information: warfarin](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0cbce382-9c88-4f58-ae0f-532a841e8f95) | Pending |
| nsaid-duplicate | More than one NSAID | moderate | [FDA OTC label: ibuprofen](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=00653b7c-7099-487e-9a01-e89781c21323) | Pending |
| nsaid-raas-diuretic | NSAID with an ACE inhibitor, ARB or diuretic | moderate | [FDA prescribing information: lisinopril](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=00b266d9-ac4a-e931-e063-6294a90a6a0b) | Pending |
| nsaid-corticosteroid | NSAID with a corticosteroid | moderate | [FDA OTC label: ibuprofen](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=00653b7c-7099-487e-9a01-e89781c21323) | Pending |
| decongestant-antihypertensive | Decongestant with a blood-pressure medicine | moderate | [FDA OTC label: phenylephrine](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0153294d-7f52-4d92-8db8-daeca3e29a3b) | Pending |
| decongestant-maoi | Decongestant with an MAO inhibitor | high | [FDA OTC label: phenylephrine](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0153294d-7f52-4d92-8db8-daeca3e29a3b) | Pending |
| ppa-present | Product contains phenylpropanolamine (PPA) | high | [Federal Register 2014-03596: phenylpropanolamine, withdrawal of approval](https://www.federalregister.gov/documents/2014/02/20/2014-03596/phenylpropanolamine-withdrawal-of-approval-of-13-new-drug-applications-and-7-abbreviated-new-drug) | Pending |
| sedating-antihistamine-cns | Sedating antihistamine with an opioid or benzodiazepine | moderate | [FDA OTC label: chlorpheniramine](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=01a1a91e-04ba-4526-8946-10483932b30c) | Pending |
| opioid-benzodiazepine | Opioid with a benzodiazepine | high | [FDA prescribing information: hydrocodone](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=025eb0f7-d002-4ce0-87b8-71461ab18356) | Pending |
| opioid-duplicate | More than one opioid | high | [FDA prescribing information: hydrocodone](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=025eb0f7-d002-4ce0-87b8-71461ab18356) | Pending |
| foreign-opioid | Photographed product contains an opioid | moderate | [FDA prescribing information: codeine](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=010905f9-3bcb-4b50-9fe8-a3ad0010f14c) | Pending |
| otc-antibiotic | Antibiotic obtained without a US prescription | moderate | [FDA prescribing information: amoxicillin](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=00b86913-50c8-443f-8467-f4f499d358af) | Pending |
| beta-lactam-allergy | Penicillin-class antibiotic: confirm allergy history | low | [FDA prescribing information: amoxicillin](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=00b86913-50c8-443f-8467-f4f499d358af) | Pending |
| chloramphenicol-present | Product contains chloramphenicol | high | [FDA prescribing information: chloramphenicol](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=aed29594-211d-49ef-813f-131975a8d0e3) | Pending |
| fluoroquinolone-corticosteroid | Fluoroquinolone with a corticosteroid | moderate | [FDA prescribing information: ciprofloxacin](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0c355077-7361-41d0-9e82-eb31beaf5daa) | Pending |
| metronidazole-warfarin | Metronidazole with warfarin | high | [FDA prescribing information: metronidazole](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=02046a22-a5eb-4bb7-bec7-e5a2aa55e142) | Pending |
| sulfamethoxazole-warfarin | Sulfamethoxazole (co-trimoxazole) with warfarin | high | [FDA prescribing information: sulfamethoxazole and trimethoprim](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=079c828c-148f-45b9-966e-d8906043b2a2) | Pending |
| macrolide-statin | Clarithromycin or erythromycin with simvastatin or lovastatin | high | [FDA prescribing information: clarithromycin](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=0be243c6-de02-45dd-8210-cab1bbc8dfa7) | Pending |
| systemic-corticosteroid | Corticosteroid obtained without a US prescription | moderate | [FDA prescribing information: dexamethasone](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=01cfaa3e-5e30-18fa-e063-6394a90a084e) | Pending |
| corticosteroid-antidiabetic | Corticosteroid with a diabetes medicine | moderate | [FDA prescribing information: dexamethasone](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=01cfaa3e-5e30-18fa-e063-6394a90a084e) | Pending |
| albuterol-beta-blocker | Albuterol (salbutamol) with a beta-blocker | moderate | [FDA prescribing information: albuterol](https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid=04c8a345-0a0d-5a01-e063-6294a90a40d2) | Pending |

## Vietnamese language review

A fluent reviewer should review lib/i18n.ts and the fixed sentences below on a
phone, including stacked diacritics, photo instructions, consent, language
switching, retries, and unresolved states. Confirm the same meaning in English
and Vietnamese, respectful wording, no dosing advice, and no instruction to
stop a medicine. Review data/synonyms.json and data/herbal-vi.json with a
pharmacist or botanical specialist; do not guess from a brand or strip
diacritics when identifying herbs.

| Key | Vietnamese | English |
| --- | --- | --- |
| same_ingredient | Hai hoặc nhiều thuốc của bạn có cùng một hoạt chất. Hãy cho điều dưỡng hoặc dược sĩ xem tất cả các thuốc này. | Two or more of your medicines contain the same active ingredient. Show all of them to your nurse or pharmacist. |
| taken_together | Điều dưỡng hoặc dược sĩ cần biết bạn đang dùng các thuốc này cùng nhau. Hãy cho họ xem. | Your nurse or pharmacist needs to know that you take these medicines together. Please show them. |
| tell_about_this | Hãy nói với điều dưỡng hoặc dược sĩ rằng bạn đang dùng thuốc này. | Tell your nurse or pharmacist that you take this medicine. |
| bring_box | Chúng tôi chưa xác minh được thuốc này. Hãy mang hộp thuốc cho dược sĩ xem. | We could not verify this medicine. Bring the box to your pharmacist. |

## Real-photo evaluation collection

Collect non-identifying ingredient panels for paracetamol, ginkgo, combination
cold medicine, and an antibiotic, plus two or three unreadable/no-list images.
Use multiple lighting conditions and independent boxes when available. A person
reads the original box and labels eval/golden.json before viewing model output.
Record salts/spelling, per-unit strengths/units, ingredient RxCUIs, and labeler.
Do not treat synthetic demo labels or repeated photos as independent real data.
Run npm run check:golden before npm run eval. Investigate every mismatch; report
the actual sample count. The existing scorer does not measure strength/unit
accuracy, so review those manually and do not claim a measured strength score.

Reviewer: ____________________ Role: ____________________ Date: __________

Corrections / unresolved questions: ______________________________________
