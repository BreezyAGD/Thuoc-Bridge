import { expect, test, type Page } from "@playwright/test";
import manifest from "../demo-cache/index.json";

const browserErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ context, page }) => {
  // A fresh browser context per test; no seeded consent or visit state.
  const errors: string[] = [];
  browserErrors.set(page, errors);
  page.on("pageerror", error => errors.push(error.message));
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    return url.origin === "http://127.0.0.1:3100" ? route.continue() : route.abort();
  });
});
test.afterEach(async ({ page }) => {
  expect(browserErrors.get(page), "Unexpected browser runtime errors").toEqual([]);
});
async function consent(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Trước khi bắt đầu" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Bắt đầu", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "English", exact: true }).click();
  await page.getByRole("checkbox", { name: "I understand and agree", exact: true }).check();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page).toHaveURL(/\/patient$/);
}
async function demo(page: Page, id?: string) {
  await page.goto("/clinician");
  await page.getByRole("checkbox", { name: "Demo mode (starts a new visit)", exact: true }).check();
  if (id) await page.getByRole("combobox", { name: "Choose demo scenario" }).selectOption(id);
  await expect(page.getByText("Synthetic samples, not real medicine box photos.", { exact: true })).toBeVisible();
  // Waiting on the HTTP response alone is insufficient: React must commit the table.
  await expect(page.getByText("Matching ingredients to RxNorm…", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Checked against 27 curated rules/)).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("consent, bilingual navigation, and patient-safe messages", async ({ page }) => {
  await page.goto("/patient");
  await expect(page.getByRole("link", { name: "Quay lại trang đầu" })).toBeVisible();
  await consent(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByRole("checkbox", { name: "Demo mode (starts a new visit)", exact: true }).check();
  await expect(page.getByText("Paracetamol", { exact: true })).toBeVisible();
  await expect(page.getByText("Two or more of your medicines contain the same active ingredient. Show all of them to your nurse or pharmacist.", { exact: true })).toBeVisible();
  await expect(page.getByText("High", { exact: true })).toHaveCount(0);
  await expect(page.getByText(/4,000 mg/)).toHaveCount(0);
  await page.getByRole("button", { name: "Tiếng Việt", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thuốc của bạn", exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "vi");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Thuốc của bạn", exact: true })).toBeVisible();
  await expect(page.getByText("Paracetamol", { exact: true })).toBeVisible();
});

test("empty summary cannot be printed", async ({ page }) => {
  await page.goto("/summary");
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeDisabled();
  await expect(page.getByRole("status")).toContainText("No current summary available");
});

for (const scenario of manifest.scenarios) {
  test(`demo, source provenance, and one-page PDF: ${scenario.id}`, async ({ page }, testInfo) => {
    let extractionCalls = 0;
    page.on("request", request => { if (new URL(request.url()).pathname === "/api/extract") extractionCalls++; });
    await page.setViewportSize({ width: 390, height: 844 });
    await demo(page, scenario.id);
    await noOverflow(page);
    const cards = page.locator("main > section").last().locator("li.rounded-xl");
    await expect(cards).toHaveCount(scenario.expected.length);
    await page.getByRole("button", { name: "View photo + transcript", exact: true }).first().click();
    await expect(page.getByRole("heading", { name: /Source check:/ })).toBeVisible();
    await expect(page.getByRole("img", { name: "Photo of the medicine package" })).toBeVisible();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.getByRole("link", { name: "Printable English summary" }).click();
    await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeEnabled();
    await expect(page.getByText("DEMO — synthetic samples", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: `Alerts requiring review (${scenario.expected.length})` })).toBeVisible();
    await noOverflow(page);
    await page.emulateMedia({ media: "print" });
    await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeHidden();
    const pdf = await page.pdf({ format: "Letter", preferCSSPageSize: true });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(1);
    await testInfo.attach(`${scenario.id}.pdf`, { body: pdf, contentType: "application/pdf" });
    expect(extractionCalls, "Demo must not send photos to the extraction API").toBe(0);
  });
}

for (const width of [320, 768]) {
  test(`patient, clinician, and summary fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await consent(page);
    await noOverflow(page);
    await demo(page);
    await noOverflow(page);
    await page.getByRole("link", { name: "Printable English summary" }).click();
    await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeEnabled();
    await noOverflow(page);
  });
}

test("reconciliation error disables stale summary and retry recovers", async ({ page }) => {
  await demo(page);
  await page.route("**/api/reconcile", route => route.fulfill({ status: 503, contentType: "application/json", body: "{}" }));
  await page.getByRole("combobox", { name: "Choose demo scenario" }).selectOption("5-herbal-no-ingredient-list");
  await expect(page.getByText("Reconciliation failed.", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Printable English summary" }).click();
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeDisabled();
  await page.getByRole("link", { name: "Back to clinician view" }).click();
  await page.unroute("**/api/reconcile");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.getByText(/Checked against 27 curated rules/)).toBeVisible();
  await page.getByRole("link", { name: "Printable English summary" }).click();
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeEnabled();
  await expect(page.getByRole("heading", { name: "Alerts requiring review (1)" })).toBeVisible();
});


test("real-photo amount/unit metric stays unmeasured without labels", async ({ page }) => {
  await page.goto("/about-metrics");
  const metric = page.locator("dl > div").filter({ has: page.locator("dt", { hasText: "Printed strength + unit correctness" }) });
  await expect(metric.locator("dd")).toHaveText("0/0 · Not measured");
  await expect(page.getByText("0 human-labeled photos", { exact: false })).toBeVisible();
});

async function confirmNewVisit(page: Page) {
  await page.getByRole("button", { name: "Start new visit", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Start a new visit?" })).toBeVisible();
  await page.getByRole("button", { name: "Clear visit and continue", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: /Before you start|Trước khi bắt đầu/ })).toBeVisible();
}

test("new visit can be canceled, then clears only app visit data and consent", async ({ page }) => {
  await consent(page);
  await page.getByRole("checkbox", { name: "Demo mode (starts a new visit)", exact: true }).check();
  await expect(page.getByText("Paracetamol", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    sessionStorage.setItem("tb.visit.v3", "old fixture");
    sessionStorage.setItem("unrelated.fixture", "keep");
  });
  await page.getByRole("button", { name: "Start new visit", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByText("Paracetamol", { exact: true })).toBeVisible();
  await confirmNewVisit(page);
  const saved = await page.evaluate(() => ({
    visits: Object.keys(sessionStorage).filter(k => k.startsWith("tb.visit.")),
    consent: sessionStorage.getItem("tb.consent"),
    unrelated: sessionStorage.getItem("unrelated.fixture"),
    lang: localStorage.getItem("tb.lang"),
  }));
  expect(saved).toEqual({ visits: [], consent: null, unrelated: "keep", lang: "en" });
  await page.reload();
  await expect(page.getByRole("button", { name: "Start", exact: true })).toBeDisabled();
  await page.goto("/patient");
  await expect(page.getByRole("link", { name: "Back to the first page" })).toBeVisible();
  await page.goto("/clinician");
  await expect(page.getByText("No photos yet.", { exact: false })).toBeVisible();
  await expect(page.getByText("Norco", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Printable English summary" }).click();
  await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeDisabled();
});

test("new visit cancels pending extraction without reviving an old product", async ({ page }) => {
  await consent(page);
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const finished = Promise.withResolvers<void>();
  await page.route("**/api/extract", async route => {
    started.resolve();
    await release.promise;
    try { await route.fulfill({ json: manifest.entries[0].result }); } catch { /* browser canceled */ }
    finished.resolve();
  });
  try {
    await page.locator('input[type="file"]').last().setInputFiles("public/demo-assets/1-paracetamol-duplication-0.jpg");
    await started.promise;
    const canceled = page.waitForEvent("requestfailed", { predicate: request => new URL(request.url()).pathname === "/api/extract" });
    await confirmNewVisit(page);
    await canceled;
    release.resolve();
    await finished.promise;
    await page.goto("/clinician");
    await expect(page.getByText("No photos yet.", { exact: false })).toBeVisible();
    await expect(page.getByText("Reading 1 photo(s)…", { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Printable English summary" }).click();
    await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeDisabled();
  } finally { release.resolve(); }
});

test("new visit cancels pending reconciliation before a different demo", async ({ page }) => {
  await demo(page);
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const finished = Promise.withResolvers<void>();
  await page.route("**/api/reconcile", async route => {
    const response = await route.fetch();
    started.resolve();
    await release.promise;
    try { await route.fulfill({ response }); } catch { /* browser canceled */ }
    finished.resolve();
  });
  try {
    await page.getByRole("textbox", { name: "Add a US medicine" }).fill("warfarin");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await started.promise;
    const canceled = page.waitForEvent("requestfailed", { predicate: request => new URL(request.url()).pathname === "/api/reconcile" });
    await confirmNewVisit(page);
    await canceled;
    release.resolve();
    await finished.promise;
    await page.unroute("**/api/reconcile");
    await demo(page, "5-herbal-no-ingredient-list");
    await expect(page.getByText("warfarin", { exact: true })).toHaveCount(0);
    await page.getByRole("link", { name: "Printable English summary" }).click();
    await expect(page.getByRole("heading", { name: "Alerts requiring review (1)" })).toBeVisible();
    await expect(page.getByText("ASSUMED paracetamol 650", { exact: true })).toHaveCount(0);
  } finally { release.resolve(); }
});

test("editing medicines invalidates printable results until matching finishes", async ({ page }) => {
  await demo(page);
  const started = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  await page.route("**/api/reconcile", async route => {
    const response = await route.fetch();
    started.resolve();
    await release.promise;
    await route.fulfill({ response });
  });
  try {
    await page.getByRole("textbox", { name: "Add a US medicine" }).fill("warfarin");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await started.promise;
    await page.getByRole("link", { name: "Printable English summary" }).click();
    await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeDisabled();
    release.resolve();
    await expect(page.getByRole("button", { name: "Print / Save PDF" })).toBeEnabled();
    await expect(page.getByText("warfarin", { exact: true })).toBeVisible();
  } finally { release.resolve(); }
});
