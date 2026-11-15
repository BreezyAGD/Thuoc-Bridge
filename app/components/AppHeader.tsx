"use client";

import Link from "next/link";
import { setLang, useLang } from "@/lib/client-store";
import { DemoControls } from "./DemoControls";

export function AppHeader() {
  const { lang, t } = useLang();
  return (
    <header className="bg-teal-700 text-white">
      <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-xl font-bold tracking-tight">
          {t.appName}
        </Link>
        <Link href="/about-metrics" className="text-sm underline">{lang === "vi" ? "Số liệu" : "Metrics"}</Link>
        <button
          type="button"
          lang={lang === "vi" ? "en" : "vi"}
          onClick={() => setLang(lang === "vi" ? "en" : "vi")}
          className="min-h-12 rounded-full border border-white/60 px-4 text-base font-medium active:bg-teal-800"
        >
          {t.langToggle}
        </button>
      </div>
      <DemoControls />
    </header>
  );
}
