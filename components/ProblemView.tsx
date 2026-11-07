"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ChevronLeft, Code2, Lock, Terminal, Trophy } from "lucide-react";
import { toast } from "sonner";
import type { Difficulty, Problem } from "@/lib/types";
import { useHydrated, useProgress } from "@/lib/store";
import { PROBLEM_XP } from "@/content/problems";
import { topicById } from "@/content/theory";
import { Markdown } from "./Markdown";
import { CodePanel } from "./CodePanel";

const DIFF_LABEL: Record<Difficulty, string> = { facil: "Fácil", medio: "Medio", dificil: "Difícil" };
const DIFF_CLASS: Record<Difficulty, string> = { facil: "text-good bg-good/15", medio: "text-warn bg-warn/15", dificil: "text-bad bg-bad/15" };

export function ProblemView({ problem, next }: { problem: Problem; next?: { slug: string; title: string } }) {
  const hydrated = useHydrated();
  const status = useProgress((s) => s.problems[problem.slug]);
  const xpEarned = useProgress((s) => s.problemXp[problem.slug]);
  const solViewed = useProgress((s) => (s.hintsUsed[problem.slug + ":sol"] ?? 0) > 0);
  const mark = useProgress((s) => s.markProblem);
  const [tab, setTab] = useState<"enunciado" | "editorial">("enunciado");
  const [mobile, setMobile] = useState<"problema" | "code" | "output">("problema");
  const solved = hydrated && status === "resuelto";
  const canEditorial = solved || (hydrated && solViewed);
  const topic = topicById(problem.topic);
  const base = PROBLEM_XP[problem.diff];

  const first = problem.tests.runs[0];
  const ex = first.expect[0];
  const example = ex?.kind === "exact" && ex.value.length < 400 ? ex.value : null;

  const onPass = useMemo(
    () => (info: { hints: number; solution: boolean }) => {
      const xp = info.solution ? 0 : Math.max(Math.round(base * 0.3), base - 10 * info.hints);
      const gain = mark(problem.slug, "resuelto", xp);
      if (gain || info.solution) toast.success(info.solution ? "Resuelto (sin XP: viste la solución)" : `¡Reto resuelto! +${gain} XP`);
      setTab("editorial");
    },
    [mark, problem.slug, base],
  );
  const onRan = useMemo(() => () => { mark(problem.slug, "intentado"); setMobile("output"); }, [mark, problem.slug]);

  const left = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line bg-panel px-4 py-3">
        <Link href="/problemas" className="mb-1 flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"><ChevronLeft size={14} /> Retos</Link>
        <h1 className="text-lg font-extrabold leading-tight tracking-tight">{problem.title}</h1>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className={`rounded-full px-2 py-0.5 ${DIFF_CLASS[problem.diff]}`}>{DIFF_LABEL[problem.diff]}</span>
          <span className="rounded-full bg-panel2 px-2 py-0.5 text-muted">{topic?.icon} {topic?.title}</span>
          <span className="text-muted">{problem.source}</span>
          <span className="ml-auto text-accent">{solved ? `+${xpEarned ?? 0} XP ganados` : `hasta +${base} XP`}</span>
        </div>
        <div className="mt-2 flex gap-1.5">
          <button onClick={() => setTab("enunciado")} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tab === "enunciado" ? "bg-accent text-accent-fg" : "bg-panel2 text-muted"}`}><BookOpen size={13} /> Enunciado</button>
          <button onClick={() => canEditorial ? setTab("editorial") : toast("Resuelve el reto (o revisa la solución) para ver el editorial")} className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${tab === "editorial" ? "bg-accent text-accent-fg" : "bg-panel2 text-muted"}`}>
            {canEditorial ? <Trophy size={13} /> : <Lock size={13} />} Editorial
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {tab === "enunciado" ? (
          <>
            <Markdown>{problem.statement}</Markdown>
            {first.stdin && (
              <div className="mt-4 grid gap-3 text-xs">
                <div>
                  <div className="mb-1 font-bold uppercase tracking-wider text-muted">Ejemplo de entrada</div>
                  <pre className="overflow-x-auto rounded-xl bg-panel2 p-3 font-mono">{first.stdin.trim()}</pre>
                </div>
                {example && (
                  <div>
                    <div className="mb-1 font-bold uppercase tracking-wider text-muted">Salida esperada</div>
                    <pre className="overflow-x-auto rounded-xl bg-panel2 p-3 font-mono">{example}</pre>
                  </div>
                )}
              </div>
            )}
            <p className="mt-4 text-xs text-muted">«Verificar» ejecuta {problem.tests.runs.length} casos ocultos ({problem.tests.runs.map((r) => r.label).filter(Boolean).join(", ") || "varios tamaños"}) además de revisar la estructura de tu solución. Pistas: cuestan 10 XP cada una; ver la solución anula el XP.</p>
          </>
        ) : (
          <>
            <Markdown>{problem.editorial}</Markdown>
            <div className="mt-6 flex flex-wrap gap-2">
              {next && <Link href={`/problemas/${next.slug}`} className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg">Siguiente: {next.title} <ArrowRight size={16} /></Link>}
              <Link href={`/teoria/${problem.topic}`} className="rounded-xl bg-panel2 px-4 py-2.5 text-sm font-bold">Repasar teoría del tema</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );

  const showCode = mobile !== "problema";
  return (
    <div className="fill-screen flex flex-col md:flex-row">
      <div className="grid shrink-0 grid-cols-3 border-b border-line bg-panel md:hidden">
        {([["problema", "Problema", BookOpen], ["code", "Código", Code2], ["output", "Salida", Terminal]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setMobile(id)} className={`flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold ${mobile === id ? "border-b-2 border-accent text-accent" : "text-muted"}`}><Icon size={15} /> {label}</button>
        ))}
      </div>
      <div className={`min-h-0 flex-1 md:flex-none md:basis-[42%] md:border-r md:border-line ${showCode ? "hidden md:block" : "block"}`}>{left}</div>
      <div className={`min-h-0 flex-1 md:basis-[58%] ${showCode ? "block" : "hidden md:block"}`}>
        <CodePanel
          key={problem.slug}
          storageKey={problem.slug}
          starter={problem.starter}
          solution={problem.solution}
          hints={problem.hints}
          tests={problem.tests}
          mobileView={mobile === "output" ? "output" : "code"}
          stdinPreview={first.stdin}
          defaultThreads={first.threads ?? 4}
          onPass={onPass}
          onRan={onRan}
          submitLabel="Verificar"
        />
      </div>
    </div>
  );
}
