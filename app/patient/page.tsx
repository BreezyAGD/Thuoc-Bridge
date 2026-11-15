"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { useConsent, useLang } from "@/lib/client-store";
import type { Strings } from "@/lib/i18n";
import { prepareImage } from "@/lib/image";
import { isUnverified, type ExtractResult } from "@/lib/schema";

type Item = {
  id: string;
  thumbUrl: string | null;
  state: "reading" | "done" | "image_error";
  result?: ExtractResult;
};

async function callExtract(image: string, mediaType: string): Promise<ExtractResult> {
  try {
    const res = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ image, mediaType }),
    });
    return (await res.json()) as ExtractResult;
  } catch {
    return { status: "error", code: "network", message: "Request failed" };
  }
}

function formatStrength(value: number | null, unit: string | null, lang: string) {
  if (value === null) return null;
  const n = new Intl.NumberFormat(lang === "vi" ? "vi-VN" : "en-US", {
    maximumFractionDigits: 4,
  }).format(value);
  return unit ? `${n} ${unit}` : n;
}

function ProductCard({
  item,
  t,
  lang,
  onRemove,
}: {
  item: Item;
  t: Strings;
  lang: string;
  onRemove: () => void;
}) {
  const result = item.result;
  const extraction = result?.status === "ok" ? result.extraction : null;
  const unverified = item.state === "done" && result ? isUnverified(result) : false;

  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex gap-4">
        {item.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL, never uploaded to an image CDN
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

          {item.state === "image_error" && (
            <p className="text-lg text-red-700">{t.errorImage}</p>
          )}

          {item.state === "done" && result?.status === "error" && (
            <p className="text-lg text-red-700">{t.errorGeneric}</p>
          )}

          {item.state === "done" && result?.status !== "error" && (
            <>
              <h2 className="text-xl font-bold break-words">
                {extraction?.brand_name.value ?? t.unknownName}
              </h2>

              {unverified ? (
                <div className="mt-2 rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
                  <p className="text-lg font-bold text-amber-900">{t.unverified}</p>
                  <p className="mt-1 text-lg text-amber-900">{t.unverifiedHelp}</p>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-lg text-slate-700">{t.contains}</p>
                  <ul className="mt-1 flex flex-col gap-1 text-lg">
                    {extraction!.ingredients.map((ing, i) => {
                      const strength = formatStrength(ing.strength.value, ing.unit.value, lang);
                      return (
                        <li key={i} className="font-semibold">
                          {ing.name.value}
                          {strength && (
                            <span className="font-normal text-slate-700"> · {strength}</span>
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
          onClick={onRemove}
          className="min-h-10 shrink-0 rounded-lg px-3 text-base text-slate-600 underline active:bg-slate-100"
        >
          {t.remove}
        </button>
      </div>
    </li>
  );
}

export default function PatientPage() {
  const { lang, t } = useLang();
  const consented = useConsent();
  const [items, setItems] = useState<Item[]>([]);
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);

  function update(id: string, patch: Partial<Item>) {
    setItems((current) => current.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function addFiles(files: FileList | null) {
    if (!files) return;
    // Each photo is one product. Photos are processed in parallel.
    await Promise.all(
      Array.from(files).map(async (file) => {
        const id = crypto.randomUUID();
        setItems((current) => [...current, { id, thumbUrl: null, state: "reading" }]);
        let prepared;
        try {
          prepared = await prepareImage(file);
        } catch {
          update(id, { state: "image_error" });
          return;
        }
        update(id, { thumbUrl: prepared.thumbUrl });
        const result = await callExtract(prepared.base64, prepared.mediaType);
        update(id, { state: "done", result });
      }),
    );
  }

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
              void addFiles(e.target.files);
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
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-lg text-slate-600">
            {t.empty}
          </p>
        ) : (
          <ul className="flex flex-col gap-4">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                item={item}
                t={t}
                lang={lang}
                onRemove={() => setItems((current) => current.filter((it) => it.id !== item.id))}
              />
            ))}
          </ul>
        )}

        <p className="mt-auto pt-4 text-center text-sm text-slate-500">{t.disclaimer}</p>
      </main>
    </>
  );
}
