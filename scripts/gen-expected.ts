/**
 * Genera content/problems-expected.json con la salida de la solución de referencia ejecutada con 1 hilo
 * (el resultado secuencial). Luego verify-solutions.ts comprueba que con p hilos se obtiene lo mismo.
 *   npx tsx scripts/gen-expected.ts [--only=slug]
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { problems } from "../content/problems";

const CXX = process.env.CXX ?? "g++-16";
const only = process.argv.filter((a) => a.startsWith("--only=")).map((a) => a.slice(7));
const file = join(__dirname, "../content/problems-expected.json");
const out: Record<string, string> = JSON.parse(readFileSync(file, "utf8"));

for (const p of problems) {
  if (only.length && !only.includes(p.slug)) continue;
  const dir = mkdtempSync(join(tmpdir(), "omp-"));
  writeFileSync(join(dir, "a.cpp"), p.solution);
  execFileSync(CXX, ["-O2", "-std=c++17", "-fopenmp", join(dir, "a.cpp"), "-o", join(dir, "a.out")], { stdio: "pipe" });
  p.tests.runs.forEach((r, i) => {
    const res = spawnSync(join(dir, "a.out"), r.args ?? [], { input: r.stdin ?? "", env: { ...process.env, OMP_NUM_THREADS: "1", OMP_THREAD_LIMIT: "" }, encoding: "utf8", timeout: 60000 });
    if (res.status !== 0) console.log(`!! ${p.slug}#${i} status=${res.status} ${res.stderr}`);
    out[`${p.slug}#${i}`] = (res.stdout ?? "").trim();
    console.log(`${p.slug}#${i}: ${out[`${p.slug}#${i}`].slice(0, 120).replace(/\n/g, " | ")}`);
  });
  rmSync(dir, { recursive: true, force: true });
}
writeFileSync(file, JSON.stringify(out, null, 2) + "\n");
