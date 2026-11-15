import Link from "next/link";
import results from "@/eval/results.json";
import { CURATED_RULE_COUNT, VERIFIED_RULE_COUNT } from "@/lib/alerts";

const format = (m: { numerator: number; denominator: number; percent: number | null }) =>
  `${m.numerator}/${m.denominator} · ${m.percent === null ? "Not measured" : `${m.percent}%`}`;

export default function AboutMetrics() {
  const photo = results.photo_evaluation;
  const alerts = results.synthetic_alert_evaluation;
  return <main lang="en" className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-8 text-slate-900">
    <Link href="/" className="text-teal-800 underline">Thuốc Bridge</Link>
    <h1 className="text-3xl font-bold">About the metrics</h1>
    <p>Generated {results.generated_at}. Extraction model: {results.model}.</p>
    <p>Real-photo evaluation: {photo.status.replaceAll("_", " ")}. {photo.labeled} human-labeled photos, {photo.scored} scored, {photo.errors} errors.</p>
    <dl className="grid grid-cols-2 gap-3 rounded-xl border p-4">
      {([
        ["Ingredient precision", photo.ingredient_precision], ["Ingredient recall", photo.ingredient_recall],
        ["RxNorm match rate", photo.rxnorm_match_rate], ["Products flagged unverified", photo.flagged_unverified],
        ["Unverified classification correctness", photo.unverified_correctness],
      ] as const).map(([name, value]) => <div key={name}><dt>{name}</dt><dd className="font-bold">{format(value)}</dd></div>)}
    </dl>
    <p>Ingredient scoring compares guard-checked printed names with human labels, one to one, ignoring case and diacritics. Strength and unit accuracy are not included. RxNorm matches require the expected ingredient RxCUI; the denominator is all labeled ingredients with an expected RxCUI. Failed or missing extraction cannot earn recall credit. Errors make the run incomplete.</p>
    <h2 className="text-xl font-bold">Synthetic alert regression</h2>
    <p>Exact scenarios: {format(alerts.exact_scenarios)}. Alert precision: {format(alerts.precision)}. Alert recall: {format(alerts.recall)}.</p>
    <p>These scenarios assume ingredient lists. They test deterministic normalization and alerts, not photo extraction or clinical sensitivity. Demo images are synthetic labels and do not count toward real-photo accuracy.</p>
    <p>{VERIFIED_RULE_COUNT}/{CURATED_RULE_COUNT} cited rules have human reviewer sign-off. Vietnamese text has not had native-speaker review. This is a prototype for pharmacist review, not a validated clinical tool.</p>
  </main>;
}
