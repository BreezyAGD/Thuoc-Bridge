import { runScenarios } from "../eval/scenario-runner";
import { flushRecordedCache } from "../lib/rxnav";
async function main() {
  const rows = await runScenarios();
  for (const r of rows) console.log(r.passed ? 'PASS' : 'FAIL', r.id, r.actual.join(', '));
  await flushRecordedCache();
  console.log(rows.filter(r => r.passed).length + '/' + rows.length + ' scenarios pass');
  if (rows.some(r => !r.passed)) process.exitCode = 1;
}
main().catch(() => { console.error('Scenario check failed'); process.exitCode = 1; });
