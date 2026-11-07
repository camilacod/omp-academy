"use client";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import type { Solved } from "@/lib/types";
import { useHydrated, useProgress } from "@/lib/store";
import { Markdown } from "./Markdown";
import { DagDiagram } from "./DagDiagram";

export function SolvedView({ item, next }: { item: Solved; next?: { slug: string; title: string } }) {
  const hydrated = useHydrated();
  const read = useProgress((s) => s.solvedRead[item.slug]);
  const mark = useProgress((s) => s.markSolvedRead);
  const done = hydrated && !!read;
  return (
    <div className="mx-auto max-w-3xl px-4 pb-12 pt-5 md:px-6">
      <Link href="/resueltos" className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"><ChevronLeft size={14} /> Resueltos</Link>
      <div className="text-[11px] font-bold uppercase tracking-wider text-accent">{item.source}</div>
      <h1 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">{item.title}</h1>

      <section className="mt-5 rounded-2xl border border-line bg-panel p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Enunciado</div>
        <Markdown>{item.statement}</Markdown>
      </section>

      <ol className="mt-6 space-y-6">
        {item.steps.map((s, i) => (
          <li key={i} className="relative border-l-2 border-line pl-5">
            <span className="absolute -left-[11px] top-0 grid h-5 w-5 place-items-center rounded-full bg-accent text-[10px] font-extrabold text-accent-fg">{i + 1}</span>
            <h2 className="text-lg font-extrabold tracking-tight">{s.title}</h2>
            <Markdown>{s.body}</Markdown>
            {s.dag && <DagDiagram dag={s.dag} />}
            {s.code && <Markdown>{"```cpp\n" + s.code.trim() + "\n```"}</Markdown>}
          </li>
        ))}
      </ol>

      <section className="mt-8 rounded-2xl border border-line bg-panel p-4">
        <div className="mb-3 text-sm font-bold">Resumen de complejidad y métricas</div>
        <dl className="grid gap-x-4 gap-y-2 sm:grid-cols-[auto_1fr]">
          {item.complexity.map((c) => (
            <div key={c.label} className="contents">
              <dt className="text-xs font-bold text-muted">{c.label}</dt>
              <dd className="font-mono text-xs">{c.value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 rounded-xl bg-accent/10 p-3 text-sm"><b className="text-accent">Resultado:</b> {item.result}</div>
      </section>

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          disabled={done}
          onClick={() => { mark(item.slug); toast.success("+10 XP"); }}
          className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${done ? "bg-good/15 text-good" : "bg-accent text-accent-fg hover:brightness-110"}`}
        >
          <CheckCircle2 size={18} /> {done ? "Leído" : "Lo entendí · +10 XP"}
        </button>
        {next && <Link href={`/resueltos/${next.slug}`} className="flex items-center gap-2 rounded-xl bg-panel2 px-4 py-3 text-sm font-bold">Siguiente: {next.title.slice(0, 40)}… <ArrowRight size={16} /></Link>}
      </div>
    </div>
  );
}
