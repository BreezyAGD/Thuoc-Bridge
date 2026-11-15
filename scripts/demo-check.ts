import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { cachedExtraction, demoEntries, demoScenarios, extractWithCache, imageHash } from "../lib/cache";
import { reconcile } from "../lib/reconcile";
import { ExtractResultSchema } from "../lib/schema";

async function main() {
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error("Network disabled by demo regression check"); };
  try {
    for (const entry of demoEntries) {
      const bytes = await readFile(`public${entry.photo}`);
      const base64 = bytes.toString("base64");
      assert.equal(await imageHash(base64), entry.hash);
      assert.deepEqual(ExtractResultSchema.parse(JSON.parse(await readFile(`demo-cache/${entry.hash}.json`, "utf8"))), cachedExtraction(entry.hash));
      const before = networkCalls;
      assert.deepEqual(await extractWithCache(base64, "image/jpeg", true), cachedExtraction(entry.hash));
      assert.equal(networkCalls, before, "demo extraction must not call API");
      assert.deepEqual(await extractWithCache(base64, "image/jpeg", false), cachedExtraction(entry.hash), "network failure must fall back only for matching bytes");
    }
    const unknown = Buffer.from("not a cached photo").toString("base64");
    const before = networkCalls;
    assert.equal((await extractWithCache(unknown, "image/jpeg", true)).status, "error");
    assert.equal(networkCalls, before);
    assert.equal((await extractWithCache(unknown, "image/jpeg", false)).status, "error");
    for (const scenario of demoScenarios) {
      const before = networkCalls;
      const result = await reconcile({
        products: scenario.hashes.map((hash, i) => {
          const result = cachedExtraction(hash)!;
          return { id: `p${i}`, extraction: result.status === "ok" ? result.extraction : null };
        }),
        usMeds: scenario.usMeds.map((text, i) => ({ id: `u${i}`, text })),
      });
      assert.deepEqual([...new Set(result.alerts.map((a) => a.rule_id))].sort(), [...scenario.expected].sort(), scenario.id);
      assert.equal(result.rxnav_unavailable, false, scenario.id);
      assert.equal(networkCalls, before, "demo normalization must be fully cached");
      if (scenario.id.startsWith("5-")) assert.equal(result.products[0].status, "unverified");
      console.log("PASS offline", scenario.id);
    }
    // A malformed/HTTP-error response cannot bypass the cache or become a result.
    globalThis.fetch = async () => new Response("not json", { status: 503 });
    const entry = demoEntries[0];
    assert.deepEqual(await extractWithCache("reencoded", "image/jpeg", false, entry.hash), cachedExtraction(entry.hash));
    globalThis.fetch = async () => Response.json({ status: "unverified", reason: "refusal", ms: 1 });
    assert.equal((await extractWithCache("reencoded", "image/jpeg", false, entry.hash)).status, "unverified", "do not override a model refusal");
    console.log("PASS exact-byte cache, fallback, refusal, and unknown-image checks");
  } finally { globalThis.fetch = originalFetch; }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
