// Ejecución remota de C++ con OpenMP: Compiler Explorer (principal) y Wandbox (respaldo).
export interface RunRequest {
  code: string;
  threads?: number;
  stdin?: string;
  args?: string[];
}
export interface RunResult {
  ok: boolean; // compiló y terminó con código 0
  stdout: string;
  stderr: string;
  compileError: string;
  exitCode: number | null;
  timedOut: boolean;
  timeMs: number;
  backend: "godbolt" | "wandbox";
}

const GODBOLT = "https://godbolt.org/api/compiler/g142/compile";
const WANDBOX = "https://wandbox.org/api/compile.json";

interface GodboltLine {
  text: string;
}

async function runGodbolt(req: RunRequest, signal: AbortSignal): Promise<RunResult> {
  const threads = Math.max(1, Math.min(32, req.threads ?? 4));
  const body = {
    source: req.code,
    lang: "c++",
    options: {
      userArguments: "-O2 -std=c++17 -fopenmp",
      executeParameters: {
        args: req.args ?? [],
        stdin: req.stdin ?? "",
        runtimeTools: [
          { name: "env", options: [{ name: "OMP_NUM_THREADS", value: String(threads) }] },
        ],
      },
      compilerOptions: { executorRequest: true, skipAsm: true },
      filters: { execute: true },
      tools: [],
      libraries: [],
    },
    allowStoreCodeDebug: false,
  };
  const t0 = Date.now();
  const r = await fetch(GODBOLT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) throw new Error(`godbolt ${r.status}`);
  const d = await r.json();
  const join = (a?: GodboltLine[]) => (a ?? []).map((x) => x.text).join("\n");
  const build = d.buildResult ?? {};
  const buildFailed = typeof build.code === "number" && build.code !== 0;
  const compileError = buildFailed ? join(build.stderr) || join(build.stdout) : "";
  return {
    ok: !buildFailed && d.didExecute === true && d.code === 0,
    stdout: join(d.stdout),
    stderr: join(d.stderr),
    compileError,
    exitCode: typeof d.code === "number" ? d.code : null,
    timedOut: !!d.timedOut,
    timeMs: Date.now() - t0,
    backend: "godbolt",
  };
}

async function runWandbox(req: RunRequest, signal: AbortSignal): Promise<RunResult> {
  const threads = Math.max(1, Math.min(32, req.threads ?? 4));
  // Wandbox no permite fijar variables de entorno: se inyecta omp_set_num_threads al inicio de main
  const code = req.code.replace(/int\s+main\s*\(([^)]*)\)\s*\{/, (m) => `${m}\n  omp_set_num_threads(${threads});`);
  const withHeader = /#include\s*<omp\.h>/.test(code) ? code : `#include <omp.h>\n${code}`;
  const body = {
    compiler: "gcc-head",
    code: withHeader,
    stdin: req.stdin ?? "",
    options: "warning,gnu++17",
    "compiler-option-raw": "-fopenmp\n-O2",
    "runtime-option-raw": (req.args ?? []).join("\n"),
    save: false,
  };
  const t0 = Date.now();
  const r = await fetch(WANDBOX, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!r.ok) throw new Error(`wandbox ${r.status}`);
  const d = await r.json();
  const compileFailed = d.status !== undefined && d.compiler_error && d.status !== "0" && !d.program_output && !d.program_error && !!d.compiler_error;
  return {
    ok: String(d.status) === "0" && !d.signal,
    stdout: String(d.program_output ?? ""),
    stderr: String(d.program_error ?? ""),
    compileError: compileFailed ? String(d.compiler_error) : "",
    exitCode: Number(d.status ?? 0),
    timedOut: /timed? ?out|killed/i.test(String(d.signal ?? "")),
    timeMs: Date.now() - t0,
    backend: "wandbox",
  };
}

export async function runCode(req: RunRequest): Promise<RunResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25000);
  try {
    try {
      return await runGodbolt(req, ctl.signal);
    } catch {
      return await runWandbox(req, ctl.signal);
    }
  } finally {
    clearTimeout(timer);
  }
}
