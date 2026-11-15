"use client";

import { DemoControls } from "../components/DemoControls";

import Link from "next/link";
import { Fragment, useState } from "react";
import { AlertsPanel } from "./AlertsPanel";
import type { ConfidenceLevel, IngredientRow, ProductRow } from "@/lib/reconcile";
import {
  addUsMed,
  getImage,
  removeUsMed,
  retryReconcile,
  useVisit,
  type VisitProduct,
} from "@/lib/visit-store";

/** Clinician view: English, laid out for a laptop or tablet. */

const CONFIDENCE: Record<ConfidenceLevel, { label: string; className: string }> = {
  high: { label: "High", className: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  medium: { label: "Medium", className: "bg-sky-100 text-sky-900 border-sky-300" },
  low: { label: "Low", className: "bg-orange-100 text-orange-900 border-orange-300" },
  unverified: { label: "Unverified", className: "bg-amber-100 text-amber-900 border-amber-400" },
};

const MATCH_LABEL: Record<string, string> = {
  exact: "RxNorm name",
  synonym: "Curated synonym",
  herbal_map: "Curated herbal map",
  spelling: "Vietnamese spelling",
  approximate: "Fuzzy match",
  none: "No match",
};

const UNVERIFIED_ACTION = "Unverified – ask pharmacist / bring the box";

function Badge({ level }: { level: ConfidenceLevel }) {
  const c = CONFIDENCE[level];
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-sm font-semibold whitespace-nowrap ${c.className}`}>
      {c.label}
    </span>
  );
}

function RxcuiLink({ rxcui }: { rxcui: string }) {
  return (
    <a
      href={`https://mor.nlm.nih.gov/RxNav/search?searchBy=RXCUI&searchTerm=${rxcui}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono text-teal-800 underline"
    >
      {rxcui}
    </a>
  );
}

/** Multi-use ingredients sit in many ATC classes; show three and fold the rest. */
function AtcList({ classes }: { classes: { id: string; name: string }[] }) {
  if (classes.length === 0) return <span className="text-slate-500">none listed</span>;
  const shown = classes.slice(0, 3);
  const rest = classes.slice(3);
  return (
    <>
      {shown.map((a) => (
        <div key={a.id}>
          <span className="font-mono">{a.id}</span> {a.name}
        </div>
      ))}
      {rest.length > 0 && (
        <details className="text-slate-600">
          <summary className="cursor-pointer">+{rest.length} more</summary>
          {rest.map((a) => (
            <div key={a.id}>
              <span className="font-mono">{a.id}</span> {a.name}
            </div>
          ))}
        </details>
      )}
    </>
  );
}

function strengthText(ing: IngredientRow) {
  if (ing.strength === null) return null;
  return `${ing.strength}${ing.unit ? ` ${ing.unit}` : ""}`;
}

type Selection = { productId: string; line: number | null } | null;

function VerifyPanel({
  selection,
  product,
  row,
  onClose,
}: {
  selection: NonNullable<Selection>;
  product: VisitProduct | undefined;
  row: ProductRow | undefined;
  onClose: () => void;
}) {
  const extraction = product?.result?.status === "ok" ? product.result.extraction : null;
  const image = getImage(selection.productId) ?? product?.thumbUrl ?? null;
  return (
    <section className="rounded-2xl border-2 border-teal-600 bg-white p-4 shadow-sm print:hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">
          Source check: {row?.brand ?? "photographed product"}
        </h2>
        <button type="button" onClick={onClose} className="min-h-10 rounded-lg px-3 text-slate-600 underline">
          Close
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Compare the highlighted line with the photo. The transcript is the model&apos;s reading of the
        label; the photo is the source of truth.
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- local data URL
            <img src={image} alt="Photo of the medicine package" className="w-full rounded-xl border border-slate-200" />
          ) : (
            <p className="rounded-xl bg-slate-100 p-4 text-slate-600">Photo not available.</p>
          )}
        </div>
        <ol className="flex flex-col gap-0.5 text-sm">
          {(extraction?.transcript ?? []).map((line, i) => (
            <li
              key={i}
              className={
                i === selection.line
                  ? "rounded bg-yellow-200 px-2 py-1 font-semibold"
                  : "px-2 py-1 text-slate-700"
              }
            >
              <span className="mr-2 font-mono text-xs text-slate-400">{i + 1}</span>
              {line}
            </li>
          ))}
          {!extraction && <li className="text-slate-600">No transcript for this photo.</li>}
        </ol>
      </div>
    </section>
  );
}

function UsMedForm() {
  const [text, setText] = useState("");
  return (
    <form
      className="flex gap-2 print:hidden"
      onSubmit={(e) => {
        e.preventDefault();
        addUsMed(text);
        setText("");
      }}
    >
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a US medicine, e.g. warfarin, Norco, Eliquis"
        aria-label="Add a US medicine"
        maxLength={120}
        autoComplete="off"
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 focus:border-teal-600 focus:outline-none"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="min-h-11 rounded-lg bg-teal-700 px-4 font-semibold text-white disabled:bg-slate-300 disabled:text-slate-500"
      >
        Add
      </button>
    </form>
  );
}

export default function ClinicianPage() {
  const visit = useVisit();
  const [selection, setSelection] = useState<Selection>(null);
  const recon = visit.recon;
  const reading = visit.products.filter((p) => p.state === "reading").length;
  const th = "border-b border-slate-300 px-3 py-2 text-left text-sm font-semibold text-slate-700";
  const td = "border-b border-slate-200 px-3 py-2 align-top";

  return (
    <>
      <header className="bg-slate-800 text-white print:hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <span className="text-xl font-bold">Thuốc Bridge · Medication reconciliation</span>
          <Link href="/patient" className="min-h-10 rounded-full border border-white/60 px-4 py-2 font-medium">
            Patient view
          </Link>
        </div>
        <DemoControls english />
      </header>

      <main lang="en" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-6">
        <p className="rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-700">
          Prototype decision support. Not a substitute for a pharmacist. Ingredients are read from
          photos of the packaging and matched to RxNorm; verify each row against the box.
        </p>

        {visit.reconState === "loading" && (
          <p role="status" className="text-slate-700">Matching ingredients to RxNorm…</p>
        )}
        {reading > 0 && (
          <p role="status" className="text-slate-700">Reading {reading} photo(s)…</p>
        )}
        {visit.reconState === "error" && (
          <p className="rounded-xl border border-red-300 bg-red-50 p-3 text-red-800">
            Reconciliation failed.{" "}
            <button type="button" onClick={retryReconcile} className="font-semibold underline">
              Retry
            </button>
          </p>
        )}
        {recon?.rxnav_unavailable && (
          <p className="rounded-xl border border-amber-400 bg-amber-50 p-3 text-amber-900">
            RxNorm (RxNav) could not be reached for some lookups. Those rows show as Unverified
            because of the network, not because of the label.
          </p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4"><h1 className="text-xl font-bold">Products photographed by the patient</h1><Link href="/summary" className="min-h-11 rounded-lg border border-teal-700 px-3 py-2 font-semibold text-teal-800">Printable English summary</Link></div><p className="px-4 pt-2 text-sm text-slate-600 sm:hidden">Swipe the table sideways to review all ingredient details.</p>
          {visit.products.length === 0 ? (
            <p className="p-4 text-slate-600">
              No photos yet. Use the patient view to photograph the medicine boxes.
            </p>
          ) : (
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[56rem] border-collapse text-base">
                <thead>
                  <tr>
                    <th className={th}>Product as photographed</th>
                    <th className={th}>Printed on label (verbatim)</th>
                    <th className={th}>Active ingredient + strength</th>
                    <th className={th}>RxNorm (RxCUI)</th>
                    <th className={th}>US generic name</th>
                    <th className={th}>ATC class</th>
                    <th className={th}>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.products.map((product) => {
                    const row = recon?.products.find((p) => p.id === product.id);
                    const span = Math.max(1, row?.ingredients.length ?? 1);
                    const productCell = (
                      <td className={td} rowSpan={span}>
                        <div className="flex gap-3">
                          {product.thumbUrl && (
                            // eslint-disable-next-line @next/next/no-img-element -- local data URL
                            <img
                              src={product.thumbUrl}
                              alt=""
                              className="size-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold break-words">{row?.brand ?? "Name not read"}</p>
                            {row?.dosage_form && <p className="text-sm text-slate-600">{row.dosage_form}</p>}
                            {row?.manufacturer && <p className="text-sm text-slate-600">{row.manufacturer}</p>}
                            {row?.registration_number && (
                              <p className="text-sm text-slate-600">SĐK {row.registration_number}</p>
                            )}
                            <button
                              type="button"
                              onClick={() => setSelection({ productId: product.id, line: null })}
                              className="mt-1 text-sm text-teal-800 underline print:hidden"
                            >
                              View photo + transcript
                            </button>
                          </div>
                        </div>
                      </td>
                    );

                    if (product.state !== "done" || !row || row.ingredients.length === 0) {
                      const message =
                        product.state === "reading"
                          ? "Reading label…"
                          : product.state === "image_error"
                            ? "The photo could not be opened."
                            : !row
                              ? "Waiting for RxNorm matching…"
                              : (row.unverified_reason ?? "No ingredients read.");
                      const unverified = product.state !== "reading" && !!row;
                      return (
                        <tr key={product.id}>
                          {productCell}
                          <td className={`${td} ${unverified ? "bg-amber-50" : ""}`} colSpan={5}>
                            {unverified && <p className="font-semibold text-amber-900">{UNVERIFIED_ACTION}</p>}
                            <p className="text-slate-700">{message}</p>
                          </td>
                          <td className={`${td} ${unverified ? "bg-amber-50" : ""}`}>
                            {unverified && <Badge level="unverified" />}
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <Fragment key={product.id}>
                        {row.ingredients.map((ing, i) => {
                          const unresolved = ing.confidence === "unverified";
                          const bg = unresolved ? "bg-amber-50" : "";
                          return (
                            <tr key={i}>
                              {i === 0 && productCell}
                              <td className={`${td} ${bg}`}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelection({ productId: product.id, line: ing.transcript_line })
                                  }
                                  title="Show where this was read on the label"
                                  className="text-left underline decoration-dotted underline-offset-4"
                                >
                                  {ing.name_source ?? ing.printed_name}
                                  {ing.strength_source && ing.strength_source !== ing.name_source && (
                                    <span className="text-slate-600"> · {ing.strength_source}</span>
                                  )}
                                </button>
                                {ing.guard_issues.map((issue) => (
                                  <p key={issue} className="text-sm text-orange-800">Check: {issue}</p>
                                ))}
                              </td>
                              <td className={`${td} ${bg}`}>
                                <span className="font-semibold">{ing.printed_name}</span>
                                {strengthText(ing) ? (
                                  <span> {strengthText(ing)}</span>
                                ) : (
                                  <span className="block text-sm text-slate-600">strength not read</span>
                                )}
                              </td>
                              <td className={`${td} ${bg}`}>
                                {unresolved ? (
                                  <span className="text-slate-500">—</span>
                                ) : (
                                  ing.resolution.concepts.map((c) => (
                                    <div key={c.rxcui}>
                                      <RxcuiLink rxcui={c.rxcui} />
                                    </div>
                                  ))
                                )}
                                <p className="text-sm text-slate-600">{MATCH_LABEL[ing.resolution.match]}</p>
                              </td>
                              <td className={`${td} ${bg}`}>
                                {unresolved ? (
                                  <p className="font-semibold text-amber-900">{UNVERIFIED_ACTION}</p>
                                ) : (
                                  <p className="font-semibold">
                                    {ing.resolution.concepts.map((c) => c.name).join(" + ")}
                                  </p>
                                )}
                                {ing.resolution.note && (
                                  <p className="text-sm text-slate-600">{ing.resolution.note}</p>
                                )}
                              </td>
                              <td className={`${td} ${bg} text-sm`}>
                                {!unresolved && <AtcList classes={ing.resolution.concepts.flatMap((c) => c.atc)} />}
                              </td>
                              <td className={`${td} ${bg}`}>
                                <Badge level={ing.confidence} />
                                <p className="mt-1 text-xs text-slate-500">
                                  read {Math.round(ing.read_confidence * 100)}%
                                </p>
                              </td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selection && (
          <VerifyPanel
            selection={selection}
            product={visit.products.find((p) => p.id === selection.productId)}
            row={recon?.products.find((p) => p.id === selection.productId)}
            onClose={() => setSelection(null)}
          />
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-xl font-bold">Current US medicines</h2>
          <div className="mt-3">
            <UsMedForm />
          </div>
          {visit.usMeds.length === 0 ? (
            <p className="mt-3 text-slate-600">None entered.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-base">
                <thead>
                  <tr>
                    <th className={th}>As entered</th>
                    <th className={th}>RxNorm ingredient(s)</th>
                    <th className={th}>RxCUI</th>
                    <th className={th}>Confidence</th>
                    <th className={`${th} print:hidden`} />
                  </tr>
                </thead>
                <tbody>
                  {visit.usMeds.map((med) => {
                    const row = recon?.usMeds.find((m) => m.id === med.id);
                    const unresolved = !!row && row.confidence === "unverified";
                    const bg = unresolved ? "bg-amber-50" : "";
                    return (
                      <tr key={med.id}>
                        <td className={`${td} ${bg} font-semibold`}>{med.text}</td>
                        <td className={`${td} ${bg}`}>
                          {!row && "…"}
                          {row && unresolved && (
                            <span className="font-semibold text-amber-900">
                              Unverified – confirm the name with the patient or the bottle
                            </span>
                          )}
                          {row && !unresolved && row.resolution.concepts.map((c) => c.name).join(" + ")}
                          {row?.resolution.note && (
                            <p className="text-sm text-slate-600">{row.resolution.note}</p>
                          )}
                        </td>
                        <td className={`${td} ${bg}`}>
                          {row && !unresolved &&
                            row.resolution.concepts.map((c) => (
                              <div key={c.rxcui}>
                                <RxcuiLink rxcui={c.rxcui} />
                              </div>
                            ))}
                        </td>
                        <td className={`${td} ${bg}`}>{row && <Badge level={row.confidence} />}</td>
                        <td className={`${td} ${bg} print:hidden`}>
                          <button
                            type="button"
                            onClick={() => removeUsMed(med.id)}
                            className="text-sm text-slate-600 underline"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <AlertsPanel recon={recon} busy={visit.reconState === "loading" || reading > 0} />
      </main>
    </>
  );
}
