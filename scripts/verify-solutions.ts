/**
 * Verifica que la solución de referencia de cada checkpoint y problema pasa sus tests.
 *   npx tsx scripts/verify-solutions.ts            # usa /lib/runner (Compiler Explorer / Wandbox)
 *   npx tsx scripts/verify-solutions.ts --local    # usa g++-16 local (rápido)
 *   npx tsx scripts/verify-solutions.ts --only=lesson-id/cp-id  --only=slug
 *   npx tsx scripts/verify-solutions.ts --starters # comprueba además que el código inicial NO pasa
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lessons } from "../content/lessons";
import { problems } from "../content/problems";
import { runCode, type RunResult } from "../lib/runner";
import { verify } from "../lib/verify";
import type { RunSpec, TestSpec } from "../lib/types";

const args = process.argv.slice(2);
const local = args.includes("--local");
const starters = args.includes("--starters");
const only = args.filter((a) => a.startsWith("--only=")).map((a) => a.slice(7));
const CXX = process.env.CXX ?? "g++-16";

function localRun(code: string, spec: RunSpec): RunResult {
  const dir = mkdtempSync(join(tmpdir(), "omp-"));
  const src = join(dir, "a.cpp");
  const bin = join(dir, "a.out");
  writeFileSync(src, code);
  const t0 = Date.now();
  try {
    execFileSync(CXX, ["-O2", "-std=c++17", "-fopenmp", src, "-o", bin], { stdio: "pipe" });
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    return { ok: false, stdout: "", stderr: "", compileError: String((e as { stderr?: Buffer }).stderr ?? e), exitCode: 1, timedOut: false, timeMs: 0, backend: "godbolt" };
  }
  const r = spawnSync(bin, spec.args ?? [], {
    input: spec.stdin ?? "",
    env: { ...process.env, OMP_NUM_THREADS: String(spec.threads ?? 4) },
    timeout: 12000,
    encoding: "utf8",
  });
  rmSync(dir, { recursive: true, force: true });
  return {
    ok: r.status === 0,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
    compileError: "",
    exitCode: r.status,
    timedOut: r.error?.message.includes("ETIMEDOUT") ?? false,
    timeMs: Date.now() - t0,
    backend: "godbolt",
  };
}

interface Item { id: string; code: string; starter: string; tests: TestSpec }
const items: Item[] = [
  ...lessons.flatMap((l) => l.checkpoints.map((c) => ({ id: `${l.id}/${c.id}`, code: c.solution, starter: c.starter, tests: c.tests }))),
  ...problems.map((p) => ({ id: p.slug, code: p.solution, starter: p.starter, tests: p.tests })),
].filter((i) => !only.length || only.some((o) => i.id === o || i.id.startsWith(o + "/")));

async function pool<T>(xs: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < xs.length) await fn(xs[i++]); }));
}

(async () => {
  let bad = 0;
  await pool(items, local ? 4 : 3, async (it) => {
    const runner = (code: string) => (spec: RunSpec) => (local ? Promise.resolve(localRun(code, spec)) : runCode({ code, threads: spec.threads ?? 4, stdin: spec.stdin, args: spec.args }));
    const v = await verify(it.code, it.tests, runner(it.code));
    if (v.pass) console.log(`ok    ${it.id}`);
    else {
      bad++;
      console.log(`FAIL  ${it.id}\n      static: ${v.staticFails.join("; ")}\n      ${v.runFails.map((f) => `#${f.idx}: ${f.reason.slice(0, 600)}`).join("\n      ")}`);
    }
    if (starters && !it.id.startsWith("__")) {
      const s = await verify(it.starter, it.tests, runner(it.starter));
      if (s.pass) { console.log(`WARN  ${it.id}: el código inicial YA pasa los tests`); bad++; }
    }
  });
  console.log(`\n${items.length - bad}/${items.length} correctos`);
  process.exit(bad ? 1 : 0);
})();
