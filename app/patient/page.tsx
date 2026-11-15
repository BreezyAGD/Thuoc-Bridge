"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { useConsent, useLang } from "@/lib/client-store";
import type { Strings } from "@/lib/i18n";
import type { IngredientRow, ProductRow, UsMedRow } from "@/lib/reconcile";
import { isUnverified } from "@/lib/schema";
import {
  addPhotos,
  addUsMed,
  removeProduct,
  removeUsMed,
  useVisit,
  type VisitProduct,
} from "@/lib/visit-store";

function formatStrength(value: number | null, unit: string | null, lang: string) {
  if (value === null) return null;
  const n = new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
    maximumFractionDigits: 4,
  }).format(value);
  return unit ? `${n} ${unit}` : n;
}

/**
 * The US generic name, shown to the patient only when the RxNorm match is
 * solid and the name actually differs from what is printed on the box.
 */
function usNameFor(ing: IngredientRow): string | null {
  if (ing.confidence !== "high" && ing.confidence !== "medium") return null;
  if (ing.resolution.concepts.length !== 1) return null;
  const name = ing.resolution.concepts[0].name;
  return ing.printed_name.toLowerCase().includes(name.toLowerCase()) ? null : name;
}

function ProductCard({
  item,
  row,
  reconFailed,
  t,
  lang,
}: {
  item: VisitProduct;
  row: ProductRow | undefined;
  reconFailed: boolean;
  t: Strings;
  lang: string;
}) {
  const result = item.result;
  const extraction = result?.status === "ok" ? result.extraction : null;
  // The patient only ever sees values that passed the deterministic guard:
  // names found on the label, and strengths that match their printed text.
  const checked = row ? row.ingredients.filter((i) => i.name_verified) : null;
  const unverified =
    item.state === "done" && result
      ? isUnverified(result) || (checked !== null && checked.length === 0)
      : false;

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        {item.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL, never sent to an image CDN
          <img
            src={item.thumbUrl}
            alt=""
            className="size-24 shrink-0 rounded-xl border border-slate-200 object-cover"
          />
        ) : (
          <div className="size-24 shrink-0 rounded-xl bg-slate-100" />
        )}

        <div className="min-w-0 flex-1">
          {item.state === "reading" && (
            <p className="flex items-center gap-3 text-lg text-slate-700" role="status">
              <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
              {t.reading}
            </p>
          )}

          {item.state === "image_error" && <p className="text-lg text-red-700">{t.errorImage}</p>}

          {item.state === "done" && result?.status === "error" && (
            <p className="text-lg text-red-700">{t.errorGeneric}</p>
          )}

          {item.state === "done" && result?.status !== "error" && (
            <>
              <h2 className="text-xl font-bold break-words">
                {(row ? row.brand : extraction?.brand_name.value) ?? t.unknownName}
              </h2>

              {unverified ? (
                <div className="mt-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
                  <p className="text-lg font-bold text-amber-900">{t.unverified}</p>
                  <p className="mt-1 text-lg text-amber-900">{t.unverifiedHelp}</p>
                </div>
              ) : checked === null ? (
                <p className="mt-2 text-lg text-slate-700" role="status">
                  {reconFailed ? t.errorGeneric : t.checking}
                </p>
              ) : (
                <>
                  <p className="mt-2 text-lg text-slate-700">{t.contains}</p>
                  <ul className="mt-1 flex flex-col gap-2 text-lg">
                    {checked.map((ing, i) => {
                      const strength = formatStrength(ing.strength, ing.unit, lang);
                      const usName = usNameFor(ing);
                      return (
                        <li key={i}>
                          <span className="font-semibold">{ing.printed_name}</span>
                          {strength && <span className="text-slate-700"> · {strength}</span>}
                          {usName && (
                            <span className="block text-base text-teal-800">
                              {t.usName} <span className="font-semibold">{usName}</span>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 rounded-xl bg-teal-50 p-3 text-lg font-medium text-teal-900">
                    {t.tellNurse}
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-start justify-between gap-3">
        {result ? (
          <details className="min-w-0 flex-1 text-sm text-slate-600">
            <summary className="min-h-10 cursor-pointer py-2">{t.details}</summary>
            <pre className="mt-1 max-h-96 overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => removeProduct(item.id)}
          className="min-h-10 shrink-0 rounded-lg px-3 text-base text-slate-600 underline active:bg-slate-100"
        >
          {t.remove}
        </button>
      </div>
    </li>
  );
}

function UsMeds({
  meds,
  rows,
  loading,
  t,
}: {
  meds: { id: string; text: string }[];
  rows: UsMedRow[];
  loading: boolean;
  t: Strings;
}) {
  const [text, setText] = useState("");
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold">{t.usMedsTitle}</h2>
      <p className="mt-1 text-base text-slate-600">{t.usMedsHint}</p>
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
          placeholder={t.usMedsPlaceholder}
          aria-label={t.usMedsTitle}
          maxLength={120}
          autoComplete="off"
          className="min-h-14 min-w-0 flex-1 rounded-xl border-2 border-slate-300 px-4 text-lg focus:border-teal-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="min-h-14 shrink-0 rounded-xl bg-teal-700 px-5 text-lg font-bold text-white active:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500"
        >
          {t.add}
        </button>
      </form>

      {meds.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {meds.map((med) => {
            const row = rows.find((r) => r.id === med.id);
            const resolved = row && row.confidence !== "unverified";
            return (
              <li key={med.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
                <div className="min-w-0 text-lg">
                  <p className="font-semibold break-words">{med.text}</p>
                  {!row && loading && <p className="text-base text-slate-600">{t.checking}</p>}
                  {row && resolved && (
                    <p className="text-base text-teal-800">
                      {t.usMedFound}{" "}
                      <span className="font-semibold">
                        {row.resolution.concepts.map((c) => c.name).join(" + ")}
                      </span>
                    </p>
                  )}
                  {row && !resolved && <p className="text-base text-amber-900">{t.usMedUnknown}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeUsMed(med.id)}
                  className="min-h-10 shrink-0 rounded-lg px-3 text-base text-slate-600 underline active:bg-slate-100"
                >
                  {t.remove}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function PatientPage() {
  const { lang, t } = useLang();
  const consented = useConsent();
  const visit = useVisit();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  if (!consented) {
    return (
      <>
        <AppHeader />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6">
          <p className="text-lg">{t.needConsent}</p>
          <Link
            href="/"
            className="flex min-h-14 items-center justify-center rounded-2xl bg-teal-700 px-6 text-lg font-bold text-white"
          >
            {t.backHome}
          </Link>
        </main>
      </>
    );
  }

  const hasAnything = visit.products.length > 0 || visit.usMeds.length > 0;

  return (
    <>
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
        <h1 className="text-2xl font-bold">{t.patientTitle}</h1>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => cameraInput.current?.click()}
            className="min-h-16 rounded-2xl bg-teal-700 px-6 text-xl font-bold text-white shadow-sm active:bg-teal-800"
          >
            {t.takePhoto}
          </button>
          <button
            type="button"
            onClick={() => libraryInput.current?.click()}
            className="min-h-14 rounded-2xl border-2 border-teal-700 bg-white px-6 text-lg font-semibold text-teal-800 active:bg-teal-50"
          >
            {t.choosePhoto}
          </button>
          <p className="text-base text-slate-600">{t.photoHint}</p>

          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              void addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={libraryInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void addPhotos(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {visit.products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-lg text-slate-600">
            {t.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {visit.products.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                row={visit.recon?.products.find((p) => p.id === item.id)}
                reconFailed={visit.reconState === "error"}
                t={t}
                lang={lang}
              />
            ))}
          </ul>
        )}

        <UsMeds
          meds={visit.usMeds}
          rows={visit.recon?.usMeds ?? []}
          loading={visit.reconState === "loading"}
          t={t}
        />

        {hasAnything && (
          <Link
            href="/clinician"
            className="flex min-h-16 items-center justify-center rounded-2xl bg-slate-800 px-6 text-center text-lg font-bold text-white active:bg-slate-900"
          >
            {t.toClinician}
          </Link>
        )}

        <p className="mt-auto pt-4 text-center text-sm text-slate-500">{t.disclaimer}</p>
      </main>
    </>
  );
}
