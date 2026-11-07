"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Lightbulb, Loader2, Play, RotateCcw, Send, Eye, XCircle, Terminal } from "lucide-react";
import { toast } from "sonner";
import type { RunSpec, TestSpec } from "@/lib/types";
import type { RunResult } from "@/lib/runner";
import { verify, type Verdict } from "@/lib/verify";
import { useHydrated, useProgress } from "@/lib/store";

const CodeEditor = dynamic(() => import("./CodeEditor"), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-muted">Cargando editor…</div>,
});

type Out = { kind: "run"; res: RunResult } | { kind: "verdict"; v: Verdict } | { kind: "error"; msg: string } | null;

async function callRun(code: string, spec: { threads?: number; stdin?: string; args?: string[] }): Promise<RunResult> {
  const r = await fetch("/api/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, ...spec }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Error del servidor");
  return d as RunResult;
}

export interface CodePanelProps {
  storageKey: string;
  starter: string;
  solution: string;
  hints: string[];
  tests: TestSpec;
  mobileView: "code" | "output";
  defaultThreads?: number;
  onPass: (info: { hints: number; solution: boolean }) => void;
  onRan?: () => void;
  stdinPreview?: string; // stdin que usa el botón Ejecutar
  submitLabel?: string;
}

export function CodePanel(p: CodePanelProps) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="grid h-full place-items-center text-sm text-muted">Cargando…</div>;
  return <Inner {...p} />;
}

function Inner({ storageKey, starter, solution, hints, tests, mobileView, defaultThreads = 4, onPass, onRan, stdinPreview, submitLabel = "Verificar" }: CodePanelProps) {
  const draft = useProgress((s) => s.drafts[storageKey]);
  const setDraft = useProgress((s) => s.setDraft);
  const clearDraft = useProgress((s) => s.clearDraft);
  const hintsShown = useProgress((s) => s.hintsUsed[storageKey] ?? 0);
  const setHints = useProgress((s) => s.setHints);
  const usedSolution = useProgress((s) => (s.hintsUsed[storageKey + ":sol"] ?? 0) > 0);

  const [code, setCode] = useState(draft ?? starter);
  const [threads, setThreads] = useState(defaultThreads);
  const [out, setOut] = useState<Out>(null);
  const [busy, setBusy] = useState<"run" | "verify" | null>(null);
  const [progress, setProgress] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDraft(storageKey, code), 500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [code, storageKey, setDraft]);

  const run = useCallback(async () => {
    setBusy("run");
    setOut(null);
    try {
      const res = await callRun(code, { threads, stdin: stdinPreview });
      setOut({ kind: "run", res });
    } catch (e) {
      setOut({ kind: "error", msg: String((e as Error).message) });
    } finally {
      setBusy(null);
      onRan?.();
    }
  }, [code, threads, stdinPreview, onRan]);

  const submit = useCallback(async () => {
    setBusy("verify");
    setOut(null);
    setProgress("");
    try {
      const v = await verify(
        code,
        tests,
        (spec: RunSpec) => callRun(code, { threads: spec.threads ?? threads, stdin: spec.stdin, args: spec.args }),
        (d, t) => setProgress(`Probando ${d}/${t}`),
      );
      setOut({ kind: "verdict", v });
      if (v.pass) {
        toast.success("¡Correcto!");
        onPass({ hints: hintsShown, solution: usedSolution });
      } else toast.error("Todavía no pasa todas las pruebas");
    } catch (e) {
      setOut({ kind: "error", msg: String((e as Error).message) });
    } finally {
      setBusy(null);
      onRan?.();
    }
  }, [code, tests, threads, onPass, hintsShown, usedSolution, onRan]);

  const showSolution = () => {
    if (!usedSolution && !confirm("Ver la solución te quita el XP de este ejercicio. ¿Continuar?")) return;
    setHints(storageKey + ":sol", 1);
    setCode(solution);
  };

  const reset = () => {
    if (!confirm("¿Volver al código inicial?")) return;
    setCode(starter);
    clearDraft(storageKey);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* barra de herramientas */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2">
        <button onClick={run} disabled={!!busy} className="flex items-center gap-1.5 rounded-lg bg-panel2 px-3 py-1.5 text-sm font-bold hover:bg-line disabled:opacity-50">
          {busy === "run" ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} className="text-good" />} Ejecutar
        </button>
        <button onClick={submit} disabled={!!busy} className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-accent-fg hover:brightness-110 disabled:opacity-50">
          {busy === "verify" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {busy === "verify" && progress ? progress : submitLabel}
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-xs text-muted">
          Hilos
          <select value={threads} onChange={(e) => setThreads(+e.target.value)} className="rounded-md border border-line bg-panel2 px-1.5 py-1 text-fg">
            {[1, 2, 4, 8].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        <button onClick={reset} title="Reiniciar código" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-panel2 hover:text-fg"><RotateCcw size={15} /></button>
      </div>

      {/* editor */}
      <div className={`min-h-0 flex-1 overflow-hidden bg-[#0d0e12] ${mobileView === "code" ? "block" : "hidden md:block"} md:flex-[3]`}>
        <div className="h-full overflow-auto">
          <CodeEditor value={code} onChange={setCode} />
        </div>
      </div>

      {/* pistas + salida */}
      <div className={`min-h-0 flex-1 flex-col border-t border-line bg-panel ${mobileView === "output" ? "flex" : "hidden md:flex"} md:flex-[2]`}>
        <div className="flex shrink-0 items-center gap-2 border-b border-line px-3 py-1.5 text-xs">
          <Terminal size={13} className="text-muted" />
          <span className="font-semibold text-muted">Salida</span>
          <span className="ml-auto flex items-center gap-2">
            <button
              onClick={() => hintsShown < hints.length && setHints(storageKey, hintsShown + 1)}
              disabled={hintsShown >= hints.length}
              className="flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-warn hover:bg-panel2 disabled:opacity-40"
            >
              <Lightbulb size={13} /> Pista {hintsShown}/{hints.length}
            </button>
            <button onClick={showSolution} className="flex items-center gap-1 rounded-md px-2 py-1 font-semibold text-muted hover:bg-panel2 hover:text-fg">
              <Eye size={13} /> Solución
            </button>
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-relaxed">
          {hintsShown > 0 && (
            <div className="mb-3 space-y-1.5 font-sans">
              {hints.slice(0, hintsShown).map((h, i) => (
                <div key={i} className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-[13px] text-fg">
                  <b className="text-warn">Pista {i + 1}:</b> {h}
                </div>
              ))}
            </div>
          )}
          {!out && !busy && <div className="font-sans text-muted">Pulsa <b>Ejecutar</b> para ver la salida de tu programa, o <b>{submitLabel}</b> para comprobar el ejercicio.</div>}
          {busy && <div className="flex items-center gap-2 font-sans text-muted"><Loader2 size={14} className="animate-spin" /> Compilando y ejecutando con GCC + OpenMP…</div>}
          {out?.kind === "error" && <div className="text-bad">{out.msg}</div>}
          {out?.kind === "run" && <RunView res={out.res} />}
          {out?.kind === "verdict" && <VerdictView v={out.v} />}
        </div>
      </div>
    </div>
  );
}

function RunView({ res }: { res: RunResult }) {
  return (
    <div>
      {res.compileError && (
        <>
          <div className="mb-1 font-sans font-bold text-bad">Error de compilación</div>
          <pre className="whitespace-pre-wrap text-bad/90">{res.compileError}</pre>
        </>
      )}
      {!res.compileError && (
        <>
          {res.stdout ? <pre className="whitespace-pre-wrap">{res.stdout}</pre> : <div className="text-muted">(sin salida)</div>}
          {res.stderr && <pre className="mt-2 whitespace-pre-wrap text-warn">{res.stderr}</pre>}
          {res.timedOut && <div className="mt-2 font-sans font-bold text-bad">Tiempo agotado: ¿bucle infinito o interbloqueo?</div>}
          {!res.ok && !res.timedOut && <div className="mt-2 font-sans text-bad">Terminó con código {res.exitCode}.</div>}
          <div className="mt-3 border-t border-line pt-2 font-sans text-[11px] text-muted">
            {res.backend === "godbolt" ? "Compiler Explorer · GCC 14" : "Wandbox · GCC"} · {res.timeMs} ms (orientativo, servidor compartido)
          </div>
        </>
      )}
    </div>
  );
}

function VerdictView({ v }: { v: Verdict }) {
  return (
    <div className="font-sans">
      <div className={`mb-3 flex items-center gap-2 text-base font-extrabold ${v.pass ? "text-good" : "text-bad"}`}>
        {v.pass ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
        {v.pass ? "¡Todas las pruebas pasaron!" : v.staticFails.length ? "Falta algo en tu código" : `${v.passed}/${v.total} pruebas pasaron`}
      </div>
      {v.staticFails.map((m, i) => (
        <div key={i} className="mb-2 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-[13px]">{m}</div>
      ))}
      {v.runFails.map((f, i) => (
        <div key={i} className="mb-2 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2">
          <div className="mb-1 text-[13px] font-bold text-bad">Prueba {f.idx + 1}{f.label ? ` · ${f.label}` : ""}</div>
          <pre className="whitespace-pre-wrap font-mono text-[12px] text-fg/90">{f.reason}</pre>
        </div>
      ))}
    </div>
  );
}
