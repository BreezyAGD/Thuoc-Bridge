import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
  return address.port;
}
async function exitCode(child: ChildProcess) {
  return (await once(child, "exit"))[0];
}
async function main() {
  await readFile(".next/BUILD_ID"); // Require a completed production build.
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    ANTHROPIC_API_KEY: "", // Also prevents Next from loading a key from .env.local.
    ANTHROPIC_AUTH_TOKEN: "",
  };
  const preload = resolve("scripts/offline-network.mjs");
  // Verify the block before launching the app. No request leaves the process.
  const probe = spawn(process.execPath, ["--import", preload, "-e", `
    fetch('https://example.invalid').then(() => process.exit(1)).catch(error => {
      process.exit(error.cause?.code === 'OFFLINE_BLOCKED' ? 0 : 1);
    });
  `], { env, stdio: "inherit" });
  assert.equal(await exitCode(probe), 0, "Offline network block failed its probe");
  console.log("PASS external TCP blocked; child environment excludes credentials");
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ["--import", preload, "node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: ["ignore", "inherit", "inherit"] });
  // Observe early startup errors so they cannot become unhandled events.
  let startupError: Error | undefined;
  server.on("error", error => { startupError = error; });
  try {
    let ready = false;
    for (let n = 0; n < 100; n++) {
      if (startupError) throw startupError;
      if (server.exitCode !== null) throw new Error("Production server exited before readiness");
      try { ready = (await fetch(base, { signal: AbortSignal.timeout(1000) })).ok; } catch { /* starting */ }
      if (ready) break;
      await new Promise(done => setTimeout(done, 200));
    }
    assert(ready, "Production server did not become ready");
    const check = spawn(process.execPath, ["--import", preload, "--import", "tsx", "scripts/release-check.ts", base], { env, stdio: "inherit" });
    assert.equal(await exitCode(check), 0, "HTTP acceptance checks failed offline");
    const image = (await readFile("public/demo-assets/1-paracetamol-duplication-0.jpg")).toString("base64");
    const res = await fetch(`${base}/api/extract`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image, mediaType: "image/jpeg" }), signal: AbortSignal.timeout(5000) });
    assert.equal(res.status, 500);
    assert.equal((await res.json()).code, "no_api_key", "Offline rehearsal must have no usable Anthropic credentials");
    console.log("PASS missing-key extraction fails safely; all demo variants work through production HTTP offline");
  } finally {
    if (server.exitCode === null) {
      const stopped = once(server, "exit");
      server.kill("SIGTERM");
      const timer = setTimeout(() => server.kill("SIGKILL"), 5000);
      try { await stopped; } finally { clearTimeout(timer); }
    }
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Offline production rehearsal failed"); process.exitCode = 1; });
