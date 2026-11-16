"use client";

import type { ConfidenceLevel, IngredientRow, ProductRow, ReconcileResponse } from "@/lib/reconcile";
import type { Extraction, LineBox } from "@/lib/schema";
import {
  boxFor,
  confidenceReason,
  matchExplain,
  ROLE_LABEL,
  trailFor,
  type Mark,
  type ReadSource,
  type Step,
} from "./model";

export const CONFIDENCE: Record<ConfidenceLevel, { label: string; chip: string; dot: string }> = {
  high: { label: "High confidence", chip: "border-[var(--ok)]/40 bg-[var(--ok-bg)] text-[var(--ok)]", dot: "bg-[var(--ok)]" },
  medium: { label: "Medium confidence", chip: "border-[var(--info)]/40 bg-[var(--info-bg)] text-[var(--info)]", dot: "bg-[var(--info)]" },
  low: { label: "Low confidence", chip: "border-[var(--warn)]/40 bg-[var(--warn-bg)] text-[var(--warn)]", dot: "bg-[var(--warn)]" },
  unverified: { label: "Unverified", chip: "border-[var(--warn)]/50 bg-[var(--warn-bg)] text-[var(--warn)]", dot: "bg-[var(--saffron)]" },
};

export function ConfidenceChip({ level, read }: { level: ConfidenceLevel; read?: number }) {
  const c = CONFIDENCE[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${c.chip}`}>
      <span className={`size-2 rounded-full ${c.dot}`} />
      {c.label}
      {read !== undefined && <span className="font-normal opacity-80">· read {Math.round(read * 100)}%</span>}
    </span>
  );
}

const BY_STYLE: Record<Step["by"], string> = {
  AI: "bg-[var(--saffron)]/25 text-[var(--ink)] border-[var(--saffron)]",
  Code: "bg-[var(--hover)] text-[var(--ink)] border-[var(--line)]",
  RxNorm: "bg-[var(--info-bg)] text-[var(--info)] border-[var(--info)]/30",
  Rules: "bg-[var(--clay)]/40 text-[var(--terra-2)] border-[var(--clay)]",
};

const STATE_ICON: Record<Step["state"], { icon: string; className: string; sr: string }> = {
  pass: { icon: "✓", className: "bg-[var(--ok)] text-[var(--ink)]", sr: "Passed" },
  warn: { icon: "!", className: "bg-[var(--saffron)] text-[var(--ink)]", sr: "Check" },
  fail: { icon: "✕", className: "bg-[var(--alert)] text-[var(--ink)]", sr: "Failed" },
  skip: { icon: "–", className: "bg-[var(--line)] text-[var(--ink-2)]", sr: "Not applicable" },
};

/** The printed region the value came from, cut out of the photo. */
export function RegionCrop({ image, box, size }: { image: string; box: LineBox; size: { w: number; h: number } | null }) {
  const pad = 12;
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  const w = Math.min(1000 - x, box.w + pad * 2);
  const h = Math.min(1000 - y, box.h + pad * 2);
  const ratio = size ? (w * size.w) / (h * size.h) : w / h;
  return (
    <div
      role="img"
      aria-label="Close-up of the printed text this value was read from"
      className="w-full rounded-lg border border-[var(--line)] bg-no-repeat"
      style={{
        aspectRatio: `${Math.max(1.2, Math.min(ratio, 14))}`,
        backgroundImage: `url("${image}")`,
        backgroundSize: `${100000 / w}% ${100000 / h}%`,
        backgroundPosition: `${w >= 1000 ? 0 : (x / (1000 - w)) * 100}% ${h >= 1000 ? 0 : (y / (1000 - h)) * 100}%`,
      }}
    />
  );
}

function Trail({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col gap-2.5">
      {steps.map((s, i) => {
        const st = STATE_ICON[s.state];
        return (
          <li key={i} className="flex gap-3">
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs font-bold ${st.className}`}>
              <span aria-hidden>{st.icon}</span>
              <span className="sr-only">{st.sr}</span>
            </span>
            <div className="min-w-0 text-sm">
              <p className="text-[var(--ink)]">
                <span className={`mr-2 inline-block rounded border px-1.5 text-[11px] font-semibold tracking-wide uppercase ${BY_STYLE[s.by]}`}>
                  {s.by}
                </span>
                {s.title}
              </p>
              {s.detail && <p className="mt-0.5 break-words text-[var(--muted)]">{s.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Matches({ ing }: { ing: IngredientRow }) {
  const concepts = ing.resolution.concepts;
  if (ing.confidence === "unverified" || concepts.length === 0) {
    return (
      <p className="rounded-lg border border-[var(--saffron)]/50 bg-[var(--warn-bg)] p-3 text-sm text-[var(--warn)]">
        <strong>Unverified: ask the pharmacist or check the box.</strong> No US equivalent is shown because nothing
        matched safely. The app never guesses.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {concepts.map((c, i) => (
        <li key={c.rxcui} className="rounded-lg border border-[var(--line)] bg-[var(--paper)] p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-[var(--ink)]">
              <span className="mr-2 text-xs text-[var(--muted)]">#{i + 1}</span>
              {c.name}
            </p>
            <a
              href={`https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${c.rxcui}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-[var(--terra)] underline"
            >
              RxCUI {c.rxcui}
            </a>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-[var(--muted)]">Printed as</dt>
            <dd className="text-[var(--ink)]">{ing.printed_name}</dd>
            <dt className="text-[var(--muted)]">How matched</dt>
            <dd className="text-[var(--ink)]">{matchExplain(ing.resolution.match)}</dd>
            <dt className="text-[var(--muted)]">Drug class</dt>
            <dd className="text-[var(--ink)]">
              {c.atc.length === 0 ? "none listed" : c.atc.slice(0, 3).map((a) => `${a.id} ${a.name}`).join(" · ")}
              {c.atc.length > 3 && ` · +${c.atc.length - 3} more`}
            </dd>
          </dl>
        </li>
      ))}
    </ul>
  );
}

export function DetailPanel({
  extraction,
  row,
  recon,
  marks,
  line,
  image,
  size,
  source,
  onSelectLine,
}: {
  extraction: Extraction | null;
  row: ProductRow | undefined;
  recon: ReconcileResponse | null;
  marks: Mark[];
  line: number | null;
  image: string | null;
  size: { w: number; h: number } | null;
  source: ReadSource | null;
  onSelectLine: (line: number) => void;
}) {
  const lineMarks = marks.filter((m) => m.line === line);
  const ingMark = lineMarks.find((m) => m.ingredient !== undefined);
  const ing = ingMark !== undefined && row ? row.ingredients[ingMark.ingredient!] : undefined;
  const box = boxFor(extraction, line);
  const text = line !== null ? extraction?.transcript[line] : undefined;

  if (!extraction) {
    return (
      <p className="text-sm text-[var(--ink-2)]">
        No text was read from this photo, so there is nothing to trace. Ask the patient for the box or a clearer photo.
      </p>
    );
  }

  if (line === null || text === undefined) {
    return <p className="text-sm text-[var(--ink-2)]">Select a highlighted box on the photo or a line in the transcript.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
            Line {line + 1} of {extraction.transcript.length}
            {lineMarks.length > 0 && ` · ${[...new Set(lineMarks.map((m) => ROLE_LABEL[m.role]))].join(", ")}`}
          </p>
          <h3 className="mt-0.5 text-lg font-bold break-words text-[var(--ink)]">
            {ing ? (
              <>
                <span className="mr-2 rounded border border-[var(--ink)]/30 px-1.5 text-sm">#{ingMark!.ingredient! + 1}</span>
                {ing.printed_name}
                {ing.confidence !== "unverified" && ing.resolution.concepts.length > 0 && (
                  <span className="text-[var(--ok)]"> → {ing.resolution.concepts.map((c) => c.name).join(" + ")}</span>
                )}
              </>
            ) : (
              lineMarks[0]?.label ?? "Text read from the label"
            )}
          </h3>
        </div>
        {ing && <ConfidenceChip level={ing.confidence} read={ing.read_confidence} />}
      </div>

      <section aria-label="What was read" className="flex flex-col gap-2">
        {image && box ? (
          <RegionCrop image={image} box={box} size={size} />
        ) : (
          <p className="rounded-lg border border-dashed border-[var(--line)] p-3 text-xs text-[var(--muted)]">
            No position reported for this line. Find it on the photo by its text.
          </p>
        )}
        <p className="rounded-lg bg-[var(--paper)] px-3 py-2 font-mono text-sm break-words text-[var(--ink)]" lang="vi">
          “{text}”
        </p>
        <p className="text-xs text-[var(--muted)]">
          Verbatim text read from the label{source ? ` · ${source.label}` : ""}
          {box && ` · region x${Math.round(box.x)} y${Math.round(box.y)} (0–1000 grid)`}
        </p>
      </section>

      {ing ? (
        <>
          <section aria-label="Verification trail">
            <h4 className="mb-2 text-sm font-bold text-[var(--ink)]">How this was checked</h4>
            <Trail steps={trailFor(ing, ing.transcript_line, recon)} />
            <p className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-2.5 text-xs text-[var(--ink-2)]">
              <strong className="text-[var(--ink)]">Why this confidence:</strong> {confidenceReason(ing)}
            </p>
          </section>
          <section aria-label="Identification matches">
            <h4 className="mb-2 text-sm font-bold text-[var(--ink)]">
              US identification{ing.resolution.concepts.length > 0 ? ` (${ing.resolution.concepts.length})` : ""}
            </h4>
            <Matches ing={ing} />
          </section>
        </>
      ) : lineMarks.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-[var(--ink)]">
          {lineMarks.map((m, i) => (
            <li key={i}>
              <span className="text-[var(--muted)]">{ROLE_LABEL[m.role]}:</span> {m.label}{" "}
              {m.status === "review" ? (
                <span className="text-[var(--warn)]">(not found in the printed text, so it is ignored)</span>
              ) : (
                <span className="text-[var(--ok)]">(found in the printed text)</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Read from the label but not used for identification (for example indications or dosing text). It is shown so
          you can see everything the AI read.
        </p>
      )}

      {row && row.ingredients.length > 1 && (
        <nav aria-label="Other ingredients on this label" className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-3">
          {row.ingredients.map((r, i) =>
            r.transcript_line === null ? null : (
              <button
                key={i}
                type="button"
                onClick={() => onSelectLine(r.transcript_line!)}
                aria-pressed={r.transcript_line === line}
                className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-sm text-[var(--ink)] hover:bg-[var(--hover)] aria-pressed:bg-[var(--ink)] aria-pressed:text-[var(--card)]"
              >
                #{i + 1} {r.printed_name}
              </button>
            ),
          )}
        </nav>
      )}
    </div>
  );
}
