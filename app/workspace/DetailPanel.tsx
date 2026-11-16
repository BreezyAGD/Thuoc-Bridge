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
  high: { label: "High confidence", chip: "border-emerald-400/50 bg-emerald-400/10 text-emerald-300", dot: "bg-emerald-400" },
  medium: { label: "Medium confidence", chip: "border-sky-400/50 bg-sky-400/10 text-sky-300", dot: "bg-sky-400" },
  low: { label: "Low confidence", chip: "border-orange-400/50 bg-orange-400/10 text-orange-300", dot: "bg-orange-400" },
  unverified: { label: "Unverified", chip: "border-amber-400/60 bg-amber-400/15 text-amber-200", dot: "bg-amber-400" },
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
  AI: "bg-violet-400/15 text-violet-200 border-violet-400/40",
  Code: "bg-slate-400/15 text-slate-200 border-slate-400/40",
  RxNorm: "bg-sky-400/15 text-sky-200 border-sky-400/40",
  Rules: "bg-teal-400/15 text-teal-200 border-teal-400/40",
};

const STATE_ICON: Record<Step["state"], { icon: string; className: string; sr: string }> = {
  pass: { icon: "✓", className: "bg-emerald-400 text-emerald-950", sr: "Passed" },
  warn: { icon: "!", className: "bg-orange-400 text-orange-950", sr: "Check" },
  fail: { icon: "✕", className: "bg-red-400 text-red-950", sr: "Failed" },
  skip: { icon: "–", className: "bg-slate-500 text-slate-100", sr: "Not applicable" },
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
              <p className="text-slate-100">
                <span className={`mr-2 inline-block rounded border px-1.5 text-[11px] font-semibold tracking-wide uppercase ${BY_STYLE[s.by]}`}>
                  {s.by}
                </span>
                {s.title}
              </p>
              {s.detail && <p className="mt-0.5 break-words text-slate-400">{s.detail}</p>}
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
      <p className="rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-amber-100">
        <strong>Unverified: ask the pharmacist or check the box.</strong> No US equivalent is shown because nothing
        matched safely. The app never guesses.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {concepts.map((c, i) => (
        <li key={c.rxcui} className="rounded-lg border border-[var(--line)] bg-black/20 p-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold text-white">
              <span className="mr-2 text-xs text-slate-400">#{i + 1}</span>
              {c.name}
            </p>
            <a
              href={`https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${c.rxcui}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-sky-300 underline"
            >
              RxCUI {c.rxcui}
            </a>
          </div>
          <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
            <dt className="text-slate-400">Printed as</dt>
            <dd className="text-slate-200">{ing.printed_name}</dd>
            <dt className="text-slate-400">How matched</dt>
            <dd className="text-slate-200">{matchExplain(ing.resolution.match)}</dd>
            <dt className="text-slate-400">Drug class</dt>
            <dd className="text-slate-200">
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
      <p className="text-sm text-slate-300">
        No text was read from this photo, so there is nothing to trace. Ask the patient for the box or a clearer photo.
      </p>
    );
  }

  if (line === null || text === undefined) {
    return <p className="text-sm text-slate-300">Select a highlighted box on the photo or a line in the transcript.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
            Line {line + 1} of {extraction.transcript.length}
            {lineMarks.length > 0 && ` · ${[...new Set(lineMarks.map((m) => ROLE_LABEL[m.role]))].join(", ")}`}
          </p>
          <h3 className="mt-0.5 text-lg font-bold break-words text-white">
            {ing ? (
              <>
                <span className="mr-2 rounded border border-white/30 px-1.5 text-sm">#{ingMark!.ingredient! + 1}</span>
                {ing.printed_name}
                {ing.confidence !== "unverified" && ing.resolution.concepts.length > 0 && (
                  <span className="text-emerald-300"> → {ing.resolution.concepts.map((c) => c.name).join(" + ")}</span>
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
          <p className="rounded-lg border border-dashed border-[var(--line)] p-3 text-xs text-slate-400">
            No position reported for this line. Find it on the photo by its text.
          </p>
        )}
        <p className="rounded-lg bg-black/30 px-3 py-2 font-mono text-sm break-words text-slate-100" lang="vi">
          “{text}”
        </p>
        <p className="text-xs text-slate-400">
          Verbatim text read from the label{source ? ` · ${source.label}` : ""}
          {box && ` · region x${Math.round(box.x)} y${Math.round(box.y)} (0–1000 grid)`}
        </p>
      </section>

      {ing ? (
        <>
          <section aria-label="Verification trail">
            <h4 className="mb-2 text-sm font-bold text-white">How this was checked</h4>
            <Trail steps={trailFor(ing, ing.transcript_line, recon)} />
            <p className="mt-3 rounded-lg border border-[var(--line)] bg-black/20 p-2.5 text-xs text-slate-300">
              <strong className="text-white">Why this confidence:</strong> {confidenceReason(ing)}
            </p>
          </section>
          <section aria-label="Identification matches">
            <h4 className="mb-2 text-sm font-bold text-white">
              US identification{ing.resolution.concepts.length > 0 ? ` (${ing.resolution.concepts.length})` : ""}
            </h4>
            <Matches ing={ing} />
          </section>
        </>
      ) : lineMarks.length > 0 ? (
        <ul className="flex flex-col gap-1 text-sm text-slate-200">
          {lineMarks.map((m, i) => (
            <li key={i}>
              <span className="text-slate-400">{ROLE_LABEL[m.role]}:</span> {m.label}{" "}
              {m.status === "review" ? (
                <span className="text-amber-300">(not found in the printed text, so it is ignored)</span>
              ) : (
                <span className="text-emerald-300">(found in the printed text)</span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">
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
                className="min-h-9 rounded-lg border border-[var(--line)] px-3 text-sm text-slate-200 hover:bg-white/10 aria-pressed:bg-white aria-pressed:text-slate-900"
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
