import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cachedExtraction, demoEntries, demoScenarios } from "../lib/cache";

/** HTTP acceptance check; uses only committed synthetic samples, never a real photo or key. */
async function main() {
  const base = new URL(process.argv[2] ?? "http://localhost:3000");
  assert(["http:", "https:"].includes(base.protocol), "Expected an HTTP(S) app URL");
  assert(!base.username && !base.password && !base.search && !base.hash, "Do not include credentials or tokens in the URL");
  const request = (path: string, init?: RequestInit) => fetch(new URL(path, base), { ...init, signal: AbortSignal.timeout(60_000) });
  for (const path of ["/", "/patient", "/clinician", "/summary", "/about-metrics"]) {
    const res = await request(path);
    assert.equal(res.status, 200, `${path}: expected 200; check deployment/protection settings`);
    assert((res.headers.get("content-type") ?? "").includes("text/html"), `${path}: expected HTML`);
    const body = await res.text();
    assert(body.includes("Thuốc Bridge"), `${path}: app content missing (possibly sign-in page)`);
    console.log("PASS page", path);
  }
  for (const entry of demoEntries) {
    const res = await request(entry.photo);
    assert.equal(res.status, 200, entry.photo);
    assert.equal(createHash("sha256").update(Buffer.from(await res.arrayBuffer())).digest("hex"), entry.hash, entry.photo);
  }
  console.log("PASS demo photo hashes");
  for (const scenario of demoScenarios) {
    const products = scenario.hashes.map((hash, i) => {
      const result = cachedExtraction(hash)!;
      return { id: `p${i}`, extraction: result.status === "ok" ? result.extraction : null };
    });
    const res = await request("/api/reconcile", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ products, usMeds: scenario.usMeds.map((text, i) => ({ id: `u${i}`, text })) }),
    });
    assert.equal(res.status, 200, scenario.id);
    const result = await res.json();
    assert.deepEqual([...new Set(result.alerts.map((a: { rule_id: string }) => a.rule_id))].sort(), [...scenario.expected].sort(), scenario.id);
    assert.equal(result.rxnav_unavailable, false, scenario.id);
    if (scenario.id.startsWith("5-")) assert.equal(result.products[0].status, "unverified");
    console.log("PASS HTTP scenario", scenario.id);
  }
  for (const path of ["/api/extract", "/api/reconcile"]) {
    const res = await request(path, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    assert.equal(res.status, 400, `${path}: invalid input`);
    console.log("PASS invalid input", path);
  }
  console.log("Release HTTP checks passed. Live vision, browser print, and wifi-off rehearsal require separate checks.");
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Release check failed"); process.exitCode = 1; });
