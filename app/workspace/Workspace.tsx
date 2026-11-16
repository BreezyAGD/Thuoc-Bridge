"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { giveConsent, useConsent } from "@/lib/client-store";
import { demoScenarios } from "@/lib/cache";
import type { UsMedRow } from "@/lib/reconcile";
import {
  addPhotos,
  addUsMed,
  getImage,
  loadDemo,
  removeProduct,
  removeUsMed,
  retryReconcile,
  useVisit,
  type Visit,
} from "@/lib/visit-store";
import { NewVisit } from "../components/NewVisit";
import { ConfidenceChip, DetailPanel } from "./DetailPanel";
import { Findings } from "./Findings";
import { extractionOf, marksFor, productState, readSource, statsFor, type ProductState, type Stats } from "./model";
import { ScanViewer } from "./ScanViewer";

const panel = "rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 sm:p-5";

const STATE_CHIP: Record<ProductState, { label: string; className: string }> = {
  reading: { label: "Reading…", className: "text-sky-300" },
  error: { label: "Could not read", className: "text-red-300" },
  verified: { label: "Verified", className: "text-emerald-300" },
  review: { label: "Needs review", className: "text-amber-300" },
};

function Tile({ value, label, tone }: { value: string | number; label: string; tone: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-black/20 p-3 text-center">
      <p className={`text-2xl font-bold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
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
  const steps: { n: number; by: string; title: string; detail: string; tone: string }[] = [
    { n: 1, by: "Device", title: "Photo", detail: "Downscaled on this device. Never stored on the server.", tone: "text-slate-300" },
    { n: 2, by: "AI", title: "Read printed text", detail: readBy, tone: "text-violet-300" },
    {
      n: 3,
      by: "Code",
      title: "Verify against label",
      detail: stats.claimed ? `${stats.guarded} of ${stats.claimed} values found in the printed text` : "Every value must appear in the printed text",
      tone: "text-slate-200",
    },
    {
      n: 4,
      by: "RxNorm",
      title: "Match to US drugs",
      detail: stats.ingredients ? `${stats.matched} of ${stats.ingredients} ingredients matched (NLM RxNorm)` : "NLM RxNorm, no guessing",
      tone: "text-sky-300",
    },
    {
      n: 5,
      by: "Rules",
      title: "Check duplicates & interactions",
      detail: recon ? `${recon.rules_checked} cited rules · ${recon.rules_verified} pharmacist-reviewed` : "Cited, curated rules",
      tone: "text-teal-300",
    },
  ];
  return (
    <ol aria-label="How results are produced" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
      {steps.map((s) => (
        <li key={s.n} className="relative w-44 shrink-0 snap-start rounded-xl border border-[var(--line)] bg-black/20 p-3 sm:w-auto">
          <p className="flex items-center justify-between text-[11px] font-semibold tracking-wide uppercase">
            <span className="text-slate-400">Step {s.n}</span>
            <span className={s.tone}>{s.by}</span>
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{s.title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{s.detail}</p>
        </li>
      ))}
    </ol>
  );
}

function ScanNotice() {
  return (
    <div className="rounded-xl border border-sky-400/40 bg-sky-400/10 p-4 text-sm text-slate-100">
      <h3 className="font-bold text-white">Before you scan a real label</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-200">
        <li>The patient agrees to the packaging being photographed.</li>
        <li>Photos are sent to Anthropic&apos;s AI to read the printed text. They are not stored on our server.</li>
        <li>Keep names, pharmacy labels, and other personal details out of the frame.</li>
        <li>This is a prototype for review support. It does not replace a pharmacist.</li>
      </ul>
      <button
        type="button"
        onClick={giveConsent}
        className="mt-3 min-h-11 rounded-lg bg-white px-4 font-semibold text-slate-900 hover:bg-slate-200"
      >
        Confirm and enable scanning
      </button>
      <p className="mt-2 text-xs text-slate-400">Demo samples (menu at the top) need no confirmation and are not sent to the AI.</p>
    </div>
  );
}

function UsMeds({ visit }: { visit: Visit }) {
  const [text, setText] = useState("");
  const rows = visit.recon?.usMeds ?? [];
  return (
    <section aria-labelledby="usmeds-heading" className={panel}>
      <h2 id="usmeds-heading" className="text-lg font-bold text-white">Current US medicines</h2>
      <p className="mt-0.5 text-xs text-slate-400">From the chart or the patient&apos;s bottles. Each is matched to RxNorm.</p>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addUsMed(text);
          setText("");
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. warfarin, Norco, Eliquis"
          aria-label="Add a US medicine"
          maxLength={120}
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-black/30 px-3 text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="min-h-11 rounded-lg bg-sky-500 px-4 font-semibold text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
        >
          Add
        </button>
      </form>
      {visit.usMeds.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">None entered. The medication history may be incomplete.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {visit.usMeds.map((m) => {
            const row: UsMedRow | undefined = rows.find((r) => r.id === m.id);
            return (
              <li key={m.id} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--line)] bg-black/20 p-3">
                <div className="min-w-0 text-sm">
                  <p className="font-semibold break-words text-white">{m.text}</p>
                  {!row ? (
                    <p className="text-slate-400">Matching…</p>
                  ) : row.confidence === "unverified" ? (
                    <p className="text-amber-200">Unverified: confirm the name with the patient or the bottle</p>
                  ) : (
                    <p className="text-slate-300">
                      {row.resolution.concepts.map((c) => c.name).join(" + ")}{" "}
                      <span className="font-mono text-xs text-slate-500">
                        {row.resolution.concepts.map((c) => c.rxcui).join(", ")}
                      </span>
                    </p>
                  )}
                  {row && <div className="mt-1"><ConfidenceChip level={row.confidence} /></div>}
                </div>
                <button
                  type="button"
                  onClick={() => removeUsMed(m.id)}
                  className="min-h-9 shrink-0 rounded-md px-2 text-xs text-slate-400 underline hover:text-white"
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function Workspace() {
  const visit = useVisit();
  const consented = useConsent();
  const camera = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLInputElement>(null);
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
    document.getElementById("scan-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const canScan = consented || visit.demoMode;

  return (
    <div className="workspace flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--line)] bg-[var(--panel)]">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link href="/" className="text-lg font-bold text-white">Thuốc Bridge</Link>
            <p className="text-xs text-slate-400">International medication review · clinician workspace</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="sr-only" htmlFor="demo-pick">Demo sample</label>
            <select
              id="demo-pick"
              value={visit.demoMode ? (visit.demoScenario ?? "") : ""}
              onChange={(e) => e.target.value && void loadDemo(e.target.value)}
              className="min-h-10 max-w-[16rem] rounded-lg border border-[var(--line)] bg-black/30 px-2 text-slate-100"
            >
              <option value="">{visit.demoMode ? "Demo sample…" : "Load a demo sample…"}</option>
              {demoScenarios.map((s) => (
                <option key={s.id} value={s.id}>{s.description}</option>
              ))}
            </select>
            <Link href="/demo-guide" className="min-h-10 rounded-lg px-2 py-2 text-slate-300 underline hover:text-white">Walkthrough</Link>
            <Link href="/summary" className="min-h-10 rounded-lg border border-[var(--line)] px-3 py-2 font-semibold text-slate-100 hover:bg-white/10">English summary</Link>
            <Link href="/handout" className="min-h-10 rounded-lg border border-[var(--line)] px-3 py-2 font-semibold text-slate-100 hover:bg-white/10" lang="en">Patient handout (VI)</Link>
            <div className="text-slate-100 [&_button]:mt-0 [&_button]:min-h-10"><NewVisit /></div>
          </div>
        </div>
      </header>

      <main lang="en" className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-5">
        {visit.demoMode && (
          <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
            Demo visit. {source?.kind === "hand_labeled" ? "Real photo with a hand-written transcript" : "Sample label"}: nothing is
            sent to the AI, and this is not accuracy evidence.
          </p>
        )}

        <section aria-labelledby="summary-heading" className={panel}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 id="summary-heading" className="text-lg font-bold text-white">Analysis summary</h1>
            <p className="text-xs text-slate-400" role="status">
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
            <Tile value={stats.labels} label="Labels scanned" tone="text-white" />
            <Tile value={stats.lines} label="Text lines read" tone="text-violet-300" />
            <Tile value={stats.claimed ? `${stats.guarded}/${stats.claimed}` : "–"} label="Values found on label" tone="text-slate-100" />
            <Tile value={stats.ingredients ? `${stats.matched}/${stats.ingredients}` : "–"} label="Ingredients identified" tone="text-emerald-300" />
            <Tile value={stats.review} label="Need review" tone={stats.review ? "text-amber-300" : "text-slate-300"} />
            <Tile value={stats.alerts} label={stats.highAlerts ? `Findings (${stats.highAlerts} high)` : "Findings"} tone={stats.highAlerts ? "text-red-300" : "text-slate-100"} />
          </div>
          <div className="mt-3">
            <Pipeline visit={visit} stats={stats} />
          </div>
          {visit.reconState === "error" && (
            <p className="mt-3 rounded-lg border border-red-400/50 bg-red-400/10 p-3 text-sm text-red-100">
              Matching failed.{" "}
              <button type="button" onClick={retryReconcile} className="font-semibold underline">Retry</button>
            </p>
          )}
          {recon?.rxnav_unavailable && (
            <p className="mt-3 rounded-lg border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-amber-100">
              RxNorm could not be reached for some lookups. Those items show as Unverified because of the network, not the label.
            </p>
          )}
        </section>

        <Findings recon={recon} busy={busy} onShow={showOnLabel} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section aria-labelledby="scan-heading" className={`${panel} scroll-mt-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="scan-heading" className="text-lg font-bold text-white">Scanned labels</h2>
              {canScan && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => camera.current?.click()}
                    disabled={!consented}
                    className="min-h-11 rounded-lg bg-sky-500 px-4 font-semibold text-slate-950 disabled:bg-slate-700 disabled:text-slate-400"
                  >
                    Scan label
                  </button>
                  <button
                    type="button"
                    onClick={() => library.current?.click()}
                    disabled={!consented}
                    className="min-h-11 rounded-lg border border-[var(--line)] px-4 font-semibold text-slate-100 hover:bg-white/10 disabled:text-slate-500"
                  >
                    Upload
                  </button>
                </div>
              )}
              <input ref={camera} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
              <input ref={library} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">
              Photograph the side that shows the ingredients (Thành phần) or the strength, for example “500 mg PARACETAMOL”. One photo per product.
            </p>

            {!consented && <div className="mt-3"><ScanNotice /></div>}

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
                        className={`flex min-h-14 items-center gap-2 rounded-xl border px-2 py-1.5 text-left ${active ? "border-white bg-white/10" : "border-[var(--line)] hover:bg-white/5"}`}
                      >
                        {p.thumbUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- local thumbnail
                          <img src={p.thumbUrl} alt="" className="size-10 rounded-md object-cover" />
                        ) : (
                          <span className="size-10 animate-pulse rounded-md bg-white/10" />
                        )}
                        <span className="text-sm">
                          <span className="block max-w-[10rem] truncate font-semibold text-white">{r?.brand ?? `Label ${i + 1}`}</span>
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
                <p className="rounded-xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-slate-400">
                  No labels yet. {consented ? "Scan or upload a photo of the medicine package." : "Confirm above to scan, or load a demo sample from the header."}
                </p>
              ) : product.state === "reading" ? (
                <div className="flex flex-col items-center gap-3 rounded-xl bg-black/30 p-10 text-slate-200" role="status">
                  <span className="size-8 animate-spin rounded-full border-2 border-sky-400 border-t-transparent" />
                  AI is reading the printed text…
                </div>
              ) : product.state === "image_error" ? (
                <p className="rounded-xl border border-red-400/50 bg-red-400/10 p-4 text-sm text-red-100">This photo could not be opened. Try another photo.</p>
              ) : (
                <>
                  {product.result?.status === "error" && (
                    <p className="mb-3 rounded-xl border border-red-400/50 bg-red-400/10 p-3 text-sm text-red-100">
                      The label could not be read ({product.result.message}). Treat this product as Unverified.
                    </p>
                  )}
                  {row && row.ingredients.length === 0 && (
                    <p className="mb-3 rounded-xl border border-amber-400/50 bg-amber-400/10 p-3 text-sm text-amber-100">
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
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span>{source?.label}{product.result?.status === "ok" && product.result.ms > 0 && ` · ${(product.result.ms / 1000).toFixed(1)} s`}</span>
                    <button type="button" onClick={() => removeProduct(product.id)} className="min-h-9 rounded-md px-2 underline hover:text-white">Remove label</button>
                  </div>
                </>
              )}
            </div>
          </section>

          <div className="flex flex-col gap-4">
            <section aria-labelledby="detail-heading" className={panel}>
              <h2 id="detail-heading" className="mb-3 text-lg font-bold text-white">Detailed analysis</h2>
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
                <p className="text-sm text-slate-400">Results appear here after a label is read.</p>
              )}
            </section>

            {extraction && product && (
              <section aria-labelledby="transcript-heading" className={panel}>
                <details open>
                  <summary className="cursor-pointer">
                    <h2 id="transcript-heading" className="inline text-lg font-bold text-white">
                      Everything read from this label ({extraction.transcript.length} lines)
                    </h2>
                  </summary>
                  <ol className="mt-3 max-h-80 overflow-y-auto pr-1 text-sm" lang="vi">
                    {extraction.transcript.map((t, i) => {
                      const used = marks.filter((m) => m.line === i);
                      const tone = used.some((m) => m.status === "review")
                        ? "border-l-amber-400"
                        : used.some((m) => m.role === "ingredient" || m.role === "strength")
                          ? "border-l-emerald-400"
                          : used.length
                            ? "border-l-sky-400"
                            : "border-l-transparent";
                      return (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => select(product.id, i)}
                            aria-pressed={i === line}
                            className={`flex w-full gap-3 border-l-2 px-2 py-1 text-left hover:bg-white/5 aria-pressed:bg-white/10 ${tone} ${used.length ? "text-slate-100" : "text-slate-400"}`}
                          >
                            <span className="w-6 shrink-0 text-right font-mono text-xs leading-6 text-slate-500">{i + 1}</span>
                            <span className="min-w-0 break-words">{t}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </details>
              </section>
            )}

            <UsMeds visit={visit} />
          </div>
        </div>

        <p className="pb-4 text-center text-xs text-slate-500">
          Prototype decision support for clinicians. Not a substitute for a pharmacist. No real patient data. The AI only transcribes printed text;
          identification and alerts are deterministic and cited.
        </p>
      </main>
    </div>
  );
}
