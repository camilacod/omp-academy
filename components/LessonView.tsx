"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, ChevronLeft, Code2, Presentation, Terminal, Trophy } from "lucide-react";
import { toast } from "sonner";
import type { Lesson } from "@/lib/types";
import { useHydrated, useProgress } from "@/lib/store";
import { Markdown } from "./Markdown";
import { CodePanel } from "./CodePanel";
import { ForkJoin } from "./widgets/ForkJoin";
import { ScheduleViz } from "./widgets/ScheduleViz";

const CP_XP = 20;
const LESSON_BONUS = 15;

export function LessonView({ lesson, next }: { lesson: Lesson; next?: { id: string; title: string } }) {
  const hydrated = useHydrated();
  const cps = useProgress((s) => s.cps);
  const hintsUsed = useProgress((s) => s.hintsUsed);
  const complete = useProgress((s) => s.completeCheckpoint);
  const addXp = useProgress((s) => s.addXp);
  const doneFlags = lesson.checkpoints.map((c) => hydrated && !!cps[`${lesson.id}/${c.id}`]);
  const firstOpen = Math.max(0, doneFlags.findIndex((d) => !d));
  const allDone = hydrated && doneFlags.every(Boolean);

  const [step, setStep] = useState(0); // 0 = teoría, 1..n = ejercicios
  const [mobile, setMobile] = useState<"teoria" | "code" | "output">("teoria");
  const active = step >= 1 ? step - 1 : firstOpen;
  const cp = lesson.checkpoints[active];
  const key = `${lesson.id}/${cp.id}`;
  const passed = hydrated && !!cps[key];

  const onPass = useMemo(
    () => (info: { hints: number; solution: boolean }) => {
      const xp = info.solution ? 0 : Math.max(5, CP_XP - 5 * info.hints);
      const wasDone = !!useProgress.getState().cps[key];
      complete(key, xp, info.hints, info.solution);
      if (!wasDone) {
        toast.success(xp ? `+${xp} XP` : "Completado (sin XP: viste la solución)");
        const st = useProgress.getState().cps;
        if (lesson.checkpoints.every((c) => st[`${lesson.id}/${c.id}`]) && !st[`${lesson.id}/__bonus`]) {
          useProgress.setState({ cps: { ...st, [`${lesson.id}/__bonus`]: { xp: LESSON_BONUS, hints: 0, solution: false } } });
          addXp(LESSON_BONUS);
          setTimeout(() => toast.success(`¡Lección completada! +${LESSON_BONUS} XP`), 600);
        }
      }
    },
    [key, complete, addXp, lesson],
  );

  const left = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-line bg-panel px-4 py-3">
        <div className="mb-1 flex items-center justify-between gap-2">
          <Link href="/aprende" className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"><ChevronLeft size={14} /> Aprende · {lesson.unit}</Link>
          {lesson.slideDeck && <Link href={`/diapos/${lesson.slideDeck}`} className="flex items-center gap-1 rounded-full bg-panel2 px-2.5 py-1 text-[11px] font-bold text-muted hover:text-accent"><Presentation size={12} /> Diapos {lesson.slideDeck.toUpperCase().replace("-", ".")}</Link>}
        </div>
        <h1 className="text-lg font-extrabold leading-tight tracking-tight">{lesson.title}</h1>
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
          <button onClick={() => setStep(0)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${step === 0 ? "bg-accent text-accent-fg" : "bg-panel2 text-muted"}`}>
            <BookOpen size={13} /> Teoría
          </button>
          {lesson.checkpoints.map((c, i) => (
            <button key={c.id} onClick={() => { setStep(i + 1); setMobile("teoria"); }} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${step === i + 1 ? "bg-accent text-accent-fg" : "bg-panel2 text-muted"}`}>
              {doneFlags[i] ? <CheckCircle2 size={13} className={step === i + 1 ? "" : "text-good"} /> : <Code2 size={13} />} {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {step === 0 ? (
          <>
            <Markdown>{lesson.intro}</Markdown>
            {lesson.widget === "forkjoin" && <div className="mt-4"><ForkJoin /></div>}
            {lesson.widget === "schedule" && <ScheduleViz />}
            <button onClick={() => { setStep(firstOpen + 1); setMobile("code"); }} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-bold text-accent-fg hover:brightness-110">
              {allDone ? "Repasar ejercicios" : "Empezar ejercicios"} <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
              Ejercicio {active + 1} de {lesson.checkpoints.length}
              {passed && <span className="flex items-center gap-1 rounded-full bg-good/15 px-2 py-0.5 normal-case tracking-normal text-good"><CheckCircle2 size={12} /> completado</span>}
            </div>
            <h2 className="mb-3 text-xl font-extrabold tracking-tight">{cp.title}</h2>
            <Markdown>{cp.task}</Markdown>
            {hydrated && hintsUsed[key + ":sol"] ? <p className="mt-3 text-xs text-warn">Viste la solución: este ejercicio no da XP.</p> : null}
            {passed && (
              <div className="pop mt-5 rounded-2xl border border-good/40 bg-good/10 p-4">
                <div className="flex items-center gap-2 font-extrabold text-good"><Trophy size={18} /> ¡Ejercicio completado!</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {active < lesson.checkpoints.length - 1 ? (
                    <button onClick={() => setStep(active + 2)} className="flex items-center gap-2 rounded-xl bg-good px-4 py-2 text-sm font-bold text-black">Siguiente ejercicio <ArrowRight size={16} /></button>
                  ) : next ? (
                    <Link href={`/aprende/${next.id}`} className="flex items-center gap-2 rounded-xl bg-good px-4 py-2 text-sm font-bold text-black">Siguiente lección: {next.title} <ArrowRight size={16} /></Link>
                  ) : (
                    <Link href="/problemas" className="flex items-center gap-2 rounded-xl bg-good px-4 py-2 text-sm font-bold text-black">Ir a los retos <ArrowRight size={16} /></Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const showCode = mobile !== "teoria";
  return (
    <div className="fill-screen flex flex-col md:flex-row">
      {/* pestañas móviles */}
      <div className="grid shrink-0 grid-cols-3 border-b border-line bg-panel md:hidden">
        {([
          ["teoria", "Teoría", BookOpen],
          ["code", "Código", Code2],
          ["output", "Salida", Terminal],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setMobile(id)} className={`flex items-center justify-center gap-1.5 py-2.5 text-sm font-bold ${mobile === id ? "border-b-2 border-accent text-accent" : "text-muted"}`}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>
      <div className={`min-h-0 flex-1 md:flex-none md:basis-[44%] md:border-r md:border-line ${showCode ? "hidden md:block" : "block"}`}>{left}</div>
      <div className={`min-h-0 flex-1 md:basis-[56%] ${showCode ? "block" : "hidden md:block"}`}>
        <CodePanel
          key={key}
          storageKey={key}
          starter={cp.starter}
          solution={cp.solution}
          hints={cp.hints}
          tests={cp.tests}
          mobileView={mobile === "output" ? "output" : "code"}
          onPass={onPass}
          onRan={() => setMobile("output")}
        />
      </div>
    </div>
  );
}
