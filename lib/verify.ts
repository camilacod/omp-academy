import type { Expect, RunSpec, StaticRule, TestSpec } from "./types";
import type { RunResult } from "./runner";

export function stripComments(code: string) {
  return code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

export function checkStatic(code: string, rules: StaticRule[] = []): string[] {
  const clean = stripComments(code);
  const fails: string[] = [];
  for (const r of rules) {
    const has = new RegExp(r.re, r.flags ?? "").test(clean);
    if (has !== r.want) fails.push(r.msg);
  }
  return fails;
}

const norm = (s: string) => s.replace(/\r/g, "").trim();
const lines = (s: string) => norm(s).split("\n").map((l) => l.trim()).filter(Boolean);

export function checkExpect(e: Expect, stdout: string): string | null {
  switch (e.kind) {
    case "exact":
      return norm(stdout) === norm(e.value) ? null : `Salida distinta de la esperada.\nEsperado:\n${norm(e.value)}\nObtenido:\n${norm(stdout)}`;
    case "sorted": {
      const a = lines(stdout).sort().join("\n");
      const b = lines(e.value).sort().join("\n");
      return a === b ? null : `Las líneas (sin importar el orden) no coinciden.\nEsperado:\n${b}\nObtenido:\n${a}`;
    }
    case "contains":
      return stdout.includes(e.value) ? null : `Falta en la salida: "${e.value}"`;
    case "notContains":
      return !stdout.includes(e.value) ? null : `No debería aparecer en la salida: "${e.value}"`;
    case "regex":
      return new RegExp(e.value, e.flags ?? "m").test(stdout) ? null : `La salida no cumple el patrón /${e.value}/`;
    case "num": {
      const m = new RegExp(e.re, "m").exec(stdout);
      if (!m) return `No encontré el número esperado en la salida (patrón /${e.re}/).`;
      const v = parseFloat(m[1]);
      return Math.abs(v - e.value) <= e.tol ? null : `Obtuve ${v}, esperaba ${e.value} (±${e.tol}).`;
    }
  }
}

export interface Verdict {
  pass: boolean;
  staticFails: string[];
  runFails: { idx: number; label?: string; reason: string }[];
  passed: number;
  total: number;
}

export function evaluateRun(spec: RunSpec, res: RunResult): string | null {
  if (res.compileError) return "Error de compilación.";
  if (res.timedOut) return "Tiempo de ejecución agotado (¿bucle infinito o interbloqueo?).";
  if (!res.ok) return `El programa terminó con error (código ${res.exitCode}).`;
  for (const e of spec.expect) {
    const r = checkExpect(e, res.stdout);
    if (r) return r;
  }
  return null;
}

export async function verify(
  code: string,
  tests: TestSpec,
  run: (spec: RunSpec) => Promise<RunResult>,
  onProgress?: (done: number, total: number) => void,
): Promise<Verdict> {
  const staticFails = checkStatic(code, tests.static);
  const v: Verdict = { pass: false, staticFails, runFails: [], passed: 0, total: tests.runs.length };
  if (staticFails.length) return v;
  for (let i = 0; i < tests.runs.length; i++) {
    const spec = tests.runs[i];
    const res = await run(spec);
    const bad = evaluateRun(spec, res);
    if (bad) {
      v.runFails.push({ idx: i, label: spec.label, reason: res.compileError ? res.compileError.slice(0, 1500) : bad });
      if (res.compileError) break;
    } else v.passed++;
    onProgress?.(i + 1, tests.runs.length);
  }
  v.pass = v.runFails.length === 0;
  return v;
}
