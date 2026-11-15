import { z } from "zod";

const reference = z.url().refine(value => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}, "Use a public HTTPS evidence URL without credentials, queries, or fragments");
const commit = z.string().regex(/^[a-f0-9]{40}$/);
const record = z.object({
  checked_by: z.string().trim().min(1), checked_at: z.iso.datetime(),
  commit, reference, outcome: z.enum(["passed", "needs_work"]),
});
export const ReleaseEvidenceSchema = z.object({
  version: z.literal(1),
  regression: z.object({ scope: z.string().min(1), commit, checked_at: z.iso.datetime(), reference,
    outcome: z.enum(["passed", "needs_work"]), node_browser_cases: z.number().int().positive(), workers_browser_cases: z.number().int().positive() }),
  deployment: record.extend({ url: reference, pages_and_apis_checked: z.boolean(), live_extraction_checked: z.boolean() }).nullable(),
  physical_rehearsal: record.extend({ wifi_disabled: z.boolean(), all_five_scenarios: z.boolean(), sources_and_pdf_checked: z.boolean() }).nullable(),
  photo_review: record.extend({ report_generated_at: z.iso.datetime() }).nullable(),
  language_review: record.nullable(),
});
export type ReleaseEvidence = z.infer<typeof ReleaseEvidenceSchema>;
export type ReadinessInput = {
  photo: { generated_at: string; status: string; labeled: number; scored: number; errors: number };
  rules: { total: number; reviewed: number };
  evidence: ReleaseEvidence;
};
export type ReadinessGate = { id: string; title: string; state: "pending" | "needs_review" | "recorded"; detail: string; next: string };

/** Read-only evidence summary. No credential probes, API calls, or approval writes. */
export function readinessGates({ photo, rules, evidence }: ReadinessInput): ReadinessGate[] {
  const hosted = evidence.deployment;
  const deployed = hosted?.outcome === "passed" && hosted.pages_and_apis_checked && hosted.live_extraction_checked;
  const rehearsal = evidence.physical_rehearsal;
  const rehearsed = rehearsal?.outcome === "passed" && rehearsal.wifi_disabled && rehearsal.all_five_scenarios && rehearsal.sources_and_pdf_checked;
  const measured = photo.status === "measured" && photo.labeled > 0 && photo.scored === photo.labeled && photo.errors === 0;
  const photoReviewed = measured && evidence.photo_review?.outcome === "passed" && evidence.photo_review.report_generated_at === photo.generated_at;
  return [
    { id: "hosting", title: "Hosted Cloudflare deployment", state: deployed ? "recorded" : "pending",
      detail: deployed ? `Hosted checks recorded for ${hosted!.url}.` : "No complete hosted deployment verification recorded. Local Workers checks do not establish a live deployment.",
      next: "When account access is available, deploy to Cloudflare, configure the runtime secret, then verify hosted pages, APIs, and live extraction." },
    { id: "photos", title: "Real-photo evaluation", state: photoReviewed ? "recorded" : measured ? "needs_review" : "pending",
      detail: `${photo.labeled} human-labeled photos; ${photo.scored} scored; ${photo.errors} errors. ${photoReviewed ? "Human review recorded for this report." : measured ? "Measurements exist; review against the boxes is still required." : "A complete, nonempty real-photo measurement is not recorded."}`,
      next: "Collect non-identifying ingredient-panel and unreadable/no-list photos, independently label them, evaluate, and review every mismatch." },
    { id: "clinical", title: "Pharmacist rule review", state: rules.total > 0 && rules.reviewed === rules.total ? "recorded" : "pending",
      detail: `${rules.reviewed}/${rules.total} curated rules have reviewer names recorded. Source quotations and synthetic checks are separate from clinical sign-off.`,
      next: "A qualified pharmacist reviews ingredient groups, evidence, severity, clinician wording, and fixed patient messages before recording sign-off." },
    { id: "language", title: "Vietnamese language review", state: evidence.language_review?.outcome === "passed" ? "recorded" : "pending",
      detail: evidence.language_review?.outcome === "passed" ? `Review recorded by ${evidence.language_review.checked_by} for its documented commit.` : "No fluent-speaker review recorded.",
      next: "Have a fluent reviewer check consent, upload instructions, fixed messages, unknown/error states, and newly added navigation/reset text on a phone." },
    { id: "rehearsal", title: "Physical wifi-off rehearsal", state: rehearsed ? "recorded" : "pending",
      detail: rehearsed ? "Physical local-server rehearsal recorded, including all five scenarios, source checks, and PDF." : "No physical wifi-off rehearsal recorded. Automated offline checks do not replace the device rehearsal.",
      next: "Prepare the local build, keep the server running on the same laptop, disable wifi, and rehearse all five scenarios, source checks, and printable summaries." },
  ];
}
