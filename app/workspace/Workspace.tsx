"use client";

import Link from "next/link";
import { useState } from "react";
import { getImage, removeProduct, retryReconcile, useVisit, type Visit } from "@/lib/visit-store";
import { NewVisit } from "../components/NewVisit";
import { DetailPanel } from "./DetailPanel";
import { Findings } from "./Findings";
import { chartNote, extractionOf, marksFor, productState, readSource, statsFor, type ProductState, type Stats } from "./model";
import { ScanViewer } from "./ScanViewer";

const panel = "rounded-[20px] border border-[var(--line)] bg-[var(--card)] p-4 sm:p-5";
const toolbarLink = "inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-[var(--ink)] px-4 text-sm font-semibold hover:bg-[var(--hover)]";

const STATE_CHIP: Record<ProductState, { label: string; className: string }> = {
  reading: { label: "Reading…", className: "text-[var(--info)]" },
  error: { label: "Could not read", className: "text-[var(--alert)]" },
  verified: { label: "Verified", className: "text-[var(--ok)]" },
  review: { label: "Needs review", className: "text-[var(--warn)]" },
};

function Tile({ value, label, tone }: { value: string | number; label: string; tone: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3 text-center">
      <p className={`font-serif text-[28px] leading-tight font-extrabold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}

function Pipeline({ visit, stats }: { visit: Visit; stats: Stats }) {
  const recon = visit.recon;
  const sources = new Set(visit.products.map((p) => readSource(p.result)?.kind).filter(Boolean));
  const readBy = sources.has("live")
    ? "Claude (vision), transcription only"
    : sources.size > 0
      ? "Sample: transcript written by hand, not AI"
      : "Claude (vision), transcription only";
  const steps: { n: number; by: string; title: string; detail: string }[] = [
    { n: 1, by: "Device", title: "Photo", detail: "Downscaled on this device. Never stored on the server." },
    { n: 2, by: "AI", title: "Read printed text", detail: readBy },
    {
      n: 3,
      by: "Code",
      title: "Verify against label",
      detail: stats.claimed ? `${stats.guarded} of ${stats.claimed} values found in the printed text` : "Every value must appear in the printed text",
    },
    {
      n: 4,
      by: "RxNorm",
      title: "Match to US drugs",
      detail: stats.ingredients ? `${stats.matched} of ${stats.ingredients} ingredients matched (NLM RxNorm)` : "NLM RxNorm, no guessing",
    },
    {
      n: 5,
      by: "Rules",
      title: "Check duplicates & interactions",
      detail: recon ? `${recon.rules_checked} cited rules · ${recon.rules_verified} pharmacist-reviewed` : "Cited, curated rules",
    },
  ];
  return (
    <ol aria-label="How results are produced" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
      {steps.map((s) => (
        <li key={s.n} className="relative w-44 shrink-0 snap-start rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-3 sm:w-auto">
          <p className="flex items-center justify-between text-[11px] font-semibold tracking-[0.14em] uppercase">
            <span className="text-[var(--muted)]">Step {s.n}</span>
            <span className={s.by === "AI" ? "text-[var(--terra)]" : "text-[var(--ink-2)]"}>{s.by}</span>
          </p>
          <p className="mt-1 text-sm font-semibold">{s.title}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">{s.detail}</p>
        </li>
      ))}
    </ol>
  );
}

function CopyForChart({ visit }: { visit: Visit }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const ready = !!visit.recon && visit.reconState === "idle";
  return (
    <button
      type="button"
      disabled={!ready}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(chartNote(visit));
          setState("copied");
        } catch {
          setState("failed");
        }
        window.setTimeout(() => setState("idle"), 2500);
      }}
      className={`${toolbarLink} disabled:border-[var(--line)] disabled:text-[var(--muted)]`}
    >
      <span aria-live="polite">{state === "copied" ? "Copied ✓" : state === "failed" ? "Copy blocked" : "Copy for chart"}</span>
    </button>
  );
}

/** Results of the current visit: summary, findings, the photo with its boxes, and the check trail. */
export function Workspace() {
  const visit = useVisit();
  const [picked, setPicked] = useState<string | null>(null);
  const [lineChoice, setLineChoice] = useState<{ productId: string; line: number } | null>(null);
  const [size, setSize] = useState<{ id: string; w: number; h: number } | null>(null);

  const recon = visit.recon;
  const stats = statsFor(visit);
  const product = visit.products.find((p) => p.id === picked) ?? visit.products[0];
  const row = product ? recon?.products.find((r) => r.id === product.id) : undefined;
  const extraction = extractionOf(product);
  const marks = marksFor(extraction, row);
  const source = readSource(product?.result);
  const image = product ? getImage(product.id) ?? product.thumbUrl : null;
  // Default to the first ingredient, so the trail is visible without a click.
  const firstLine = row?.ingredients.find((i) => i.transcript_line !== null)?.transcript_line ?? marks[0]?.line ?? null;
  const line = lineChoice && product && lineChoice.productId === product.id ? lineChoice.line : firstLine;
  const busy = visit.reconState === "loading" || stats.reading > 0;

  const select = (productId: string, l: number) => {
    setPicked(productId);
    setLineChoice({ productId, line: l });
  };

  const showOnLabel = (productId: string, printedName: string | null) => {
    const r = recon?.products.find((p) => p.id === productId);
    const ing = r?.ingredients.find((i) => i.printed_name === printedName) ?? r?.ingredients[0];
    setPicked(productId);
    if (ing?.transcript_line != null) setLineChoice({ productId, line: ing.transcript_line });
    document.getElementById("labels-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="results" aria-labelledby="results-heading" className="workspace scroll-mt-16 border-t border-[var(--line)] bg-[var(--hover)]/40 py-14 md:py-20">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-4 px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="caps text-[var(--terra)]">Results</p>
            <h2 id="results-heading" className="display mt-3 text-[34px] leading-[1.05] sm:text-[44px]">This <em>visit</em></h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/summary" className={toolbarLink}>English summary</Link>
            <Link href="/handout" className={toolbarLink}>Patient handout (VI)</Link>
            <CopyForChart visit={visit} />
            <div className="[&_button]:mt-0 [&_button]:min-h-11 [&_button]:rounded-xl [&_button]:border-[1.5px] [&_button]:text-sm"><NewVisit /></div>
          </div>
        </div>

        {visit.demoMode && (
          <p className="rounded-xl border border-[var(--saffron)] bg-[var(--warn-bg)] px-4 py-2.5 text-sm">
            Demo visit. {source?.kind === "hand_labeled" ? "Real photo with a hand-written transcript" : "Sample label"}: nothing is sent
            to the AI, and this is not accuracy evidence.
          </p>
        )}

        <section aria-labelledby="summary-heading" className={panel}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="summary-heading" className="font-serif text-xl font-bold">Analysis summary</h3>
            <p className="text-xs text-[var(--muted)]" role="status">
              {stats.reading > 0
                ? `Reading ${stats.reading} label(s)…`
                : visit.reconState === "loading"
                  ? "Matching ingredients to RxNorm…"
                  : stats.labels
                    ? `Read ${stats.labels} label(s): ${stats.matched} of ${stats.ingredients} ingredients identified, ${stats.review} need review.`
                    : "No labels scanned yet."}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Tile value={stats.labels} label="Labels scanned" tone="text-[var(--ink)]" />
            <Tile value={stats.lines} label="Text lines read" tone="text-[var(--terra)]" />
            <Tile value={stats.claimed ? `${stats.guarded}/${stats.claimed}` : "–"} label="Values found on label" tone="text-[var(--ink)]" />
            <Tile value={stats.ingredients ? `${stats.matched}/${stats.ingredients}` : "–"} label="Ingredients identified" tone="text-[var(--ok)]" />
            <Tile value={stats.review} label="Need review" tone={stats.review ? "text-[var(--warn)]" : "text-[var(--ink-2)]"} />
            <Tile value={stats.alerts} label={stats.highAlerts ? `Findings (${stats.highAlerts} high)` : "Findings"} tone={stats.highAlerts ? "text-[var(--alert)]" : "text-[var(--ink)]"} />
          </div>
          <div className="mt-3">
            <Pipeline visit={visit} stats={stats} />
          </div>
          {visit.reconState === "error" && (
            <p className="mt-3 rounded-xl border border-[var(--alert)]/40 bg-[var(--alert-bg)] p-3 text-sm text-[var(--alert)]">
              Matching failed.{" "}
              <button type="button" onClick={retryReconcile} className="font-semibold underline">Retry</button>
            </p>
          )}
          {recon?.rxnav_unavailable && (
            <p className="mt-3 rounded-xl border border-[var(--saffron)] bg-[var(--warn-bg)] p-3 text-sm">
              RxNorm could not be reached for some lookups. Those items show as Unverified because of the network, not the label.
            </p>
          )}
        </section>

        <Findings recon={recon} busy={busy} onShow={showOnLabel} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section aria-labelledby="labels-heading" className={`${panel} scroll-mt-20`}>
            <h3 id="labels-heading" className="font-serif text-xl font-bold">Scanned labels</h3>

            {visit.products.length > 0 && (
              <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Labels in this visit">
                {visit.products.map((p, i) => {
                  const r = recon?.products.find((x) => x.id === p.id);
                  const st = STATE_CHIP[productState(p, r)];
                  const active = p.id === product?.id;
                  return (
                    <li key={p.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setPicked(p.id)}
                        aria-pressed={active}
                        className={`flex min-h-14 items-center gap-2 rounded-xl border px-2 py-1.5 text-left ${active ? "border-[var(--ink)] bg-[var(--paper)]" : "border-[var(--line)] hover:bg-[var(--hover)]"}`}
                      >
                        {p.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local thumbnail
                          <img src={p.thumbUrl} alt="" className="size-10 rounded-md object-cover" />
                        ) : (
                          <span className="size-10 animate-pulse rounded-md bg-[var(--hover)]" />
                        )}
                        <span className="text-sm">
                          <span className="block max-w-[10rem] truncate font-semibold">{r?.brand ?? `Label ${i + 1}`}</span>
                          <span className={`block text-xs ${st.className}`}>{st.label}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="mt-3">
              {!product ? (
                <p className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--muted)]">
                  No labels yet. Scan or upload a photo above, or load a sample.
                </p>
              ) : product.state === "reading" ? (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-[var(--paper)] p-10 text-[var(--ink-2)]" role="status">
                  <span className="size-8 animate-spin rounded-full border-2 border-[var(--terra)] border-t-transparent" />
                  AI is reading the printed text…
                </div>
              ) : product.state === "image_error" ? (
                <p className="rounded-xl border border-[var(--alert)]/40 bg-[var(--alert-bg)] p-4 text-sm text-[var(--alert)]">This photo could not be opened. Try another photo.</p>
              ) : (
                <>
                  {product.result?.status === "error" && (
                    <p className="mb-3 rounded-xl border border-[var(--alert)]/40 bg-[var(--alert-bg)] p-3 text-sm text-[var(--alert)]">
                      The label could not be read ({product.result.message}). Treat this product as Unverified.
                    </p>
                  )}
                  {row && row.ingredients.length === 0 && (
                    <p className="mb-3 rounded-xl border border-[var(--saffron)] bg-[var(--warn-bg)] p-3 text-sm">
                      <strong>Unverified: ask the pharmacist or check the box.</strong> {row.unverified_reason}
                    </p>
                  )}
                  <ScanViewer
                    image={image}
                    extraction={extraction}
                    marks={marks}
                    source={source}
                    selectedLine={line}
                    onSelect={(l) => select(product.id, l)}
                    onSize={(s) => setSize({ id: product.id, ...s })}
                  />
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted)]">
                    <span>{source?.label}{product.result?.status === "ok" && product.result.ms > 0 && ` · ${(product.result.ms / 1000).toFixed(1)} s`}</span>
                    <button type="button" onClick={() => removeProduct(product.id)} className="min-h-9 rounded-md px-2 underline hover:text-[var(--ink)]">Remove label</button>
                  </div>
                </>
              )}
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section aria-labelledby="detail-heading" className={panel}>
              <h3 id="detail-heading" className="mb-3 font-serif text-xl font-bold">Detailed analysis</h3>
              {product && product.state === "done" ? (
                <DetailPanel
                  extraction={extraction}
                  row={row}
                  recon={recon}
                  marks={marks}
                  line={line}
                  image={image}
                  size={size && size.id === product.id ? size : null}
                  source={source}
                  onSelectLine={(l) => select(product.id, l)}
                />
              ) : (
                <p className="text-sm text-[var(--muted)]">Results appear here after a label is read.</p>
              )}
            </section>

            {extraction && product && (
              <section aria-labelledby="transcript-heading" className={panel}>
                <details open>
                  <summary className="cursor-pointer">
                    <h3 id="transcript-heading" className="inline font-serif text-xl font-bold">
                      Everything read from this label ({extraction.transcript.length} lines)
                    </h3>
                  </summary>
                  <ol className="mt-3 max-h-80 overflow-y-auto pr-1 text-sm" lang="vi">
                    {extraction.transcript.map((t, i) => {
                      const used = marks.filter((m) => m.line === i);
                      const tone = used.some((m) => m.status === "review")
                        ? "border-l-[var(--saffron)]"
                        : used.some((m) => m.role === "ingredient" || m.role === "strength")
                          ? "border-l-[var(--ok)]"
                          : used.length
                            ? "border-l-[var(--info)]"
                            : "border-l-transparent";
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => select(product.id, i)}
                            aria-pressed={i === line}
                            className={`flex w-full gap-3 border-l-2 px-2 py-1 text-left hover:bg-[var(--hover)] aria-pressed:bg-[var(--hover)] ${tone} ${used.length ? "text-[var(--ink)]" : "text-[var(--muted)]"}`}
                          >
                            <span className="w-6 shrink-0 text-right font-mono text-xs leading-6 text-[var(--muted)]">{i + 1}</span>
                            <span className="min-w-0 break-words">{t}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              </section>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
