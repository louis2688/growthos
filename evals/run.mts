/**
 * Guardrail evals. Run with `npm run evals`.
 *
 * NOT part of `npm test`: every case makes real, paid API calls, and the agents are
 * non-deterministic, so this can't gate CI without being flaky and expensive. Run it before
 * shipping a change to any agent prompt — that's the moment a guardrail silently regresses.
 *
 * A failure here is a real gap in what the product will publish on a user's behalf. Fix the
 * prompt, not the eval.
 */
import { CASES } from "./cases";

const only = process.argv[2];
const cases = only ? CASES.filter((c) => c.name.includes(only)) : CASES;

if (cases.length === 0) {
  console.error(`No eval matches "${only}". Available:\n${CASES.map((c) => `  ${c.name}`).join("\n")}`);
  process.exit(1);
}

// Agents run on their own backends now (Cloudflare Workers AI + Haiku for the search agents);
// the judge stays on Opus so the strongest model audits the cheaper ones' output.
console.log(`Running ${cases.length} guardrail eval${cases.length === 1 ? "" : "s"}, judged by claude-opus-4-8\n`);

let failed = 0;

for (const c of cases) {
  const started = Date.now();
  try {
    const { artifact, checks } = await c.run();
    const bad = checks.filter((r) => !r.pass);
    const secs = ((Date.now() - started) / 1000).toFixed(0);

    if (bad.length === 0) {
      console.log(`PASS  ${c.name}  (${secs}s)`);
    } else {
      failed++;
      console.log(`FAIL  ${c.name}  (${secs}s)`);
      console.log(`      guards: ${c.guards}`);
      for (const b of bad) console.log(`      → ${b.detail}`);
      // The artifact is the evidence; without it you can't tell a real gap from a bad judge.
      console.log(`      ---- artifact ----`);
      console.log(
        artifact
          .split("\n")
          .map((l) => `      ${l}`)
          .join("\n"),
      );
      console.log(`      ------------------`);
    }
  } catch (err) {
    failed++;
    console.log(`ERROR ${c.name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

console.log(`\n${cases.length - failed}/${cases.length} passed`);
process.exit(failed > 0 ? 1 : 0);
