"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, CircleDashed, Circle } from "lucide-react";
import type { Difficulty } from "@/lib/types";
import { useHydrated, useProgress } from "@/lib/store";
import { PROBLEM_XP } from "@/content/problems";

interface Item { slug: string; title: string; topic: string; diff: Difficulty; source: string }
interface Topic { id: string; title: string; icon: string }

const DIFF_LABEL: Record<Difficulty, string> = { facil: "Fácil", medio: "Medio", dificil: "Difícil" };
const DIFF_CLASS: Record<Difficulty, string> = { facil: "text-good bg-good/15", medio: "text-warn bg-warn/15", dificil: "text-bad bg-bad/15" };

export function ProblemList({ problems, topics }: { problems: Item[]; topics: Topic[] }) {
  const hydrated = useHydrated();
  const status = useProgress((s) => s.problems);
  const router = useRouter();
  const sp = useSearchParams();
  const tema = sp.get("tema") ?? "todos";
  const diff = (sp.get("nivel") ?? "todos") as Difficulty | "todos";
  const est = sp.get("estado") ?? "todos";

  const set = (k: string, v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v === "todos") q.delete(k);
    else q.set(k, v);
    router.replace(`/problemas${q.toString() ? "?" + q : ""}`, { scroll: false });
  };

  const st = (slug: string) => (hydrated ? status[slug] : undefined);
  const list = problems.filter(
    (p) =>
      (tema === "todos" || p.topic === tema) &&
      (diff === "todos" || p.diff === diff) &&
      (est === "todos" || (est === "resuelto" ? st(p.slug) === "resuelto" : est === "pendiente" ? st(p.slug) !== "resuelto" : st(p.slug) === "intentado")),
  );
  const solved = problems.filter((p) => st(p.slug) === "resuelto").length;
  const chip = (active: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-accent text-accent-fg" : "bg-panel2 text-muted hover:text-fg"}`;

  return (
    <>
      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-panel p-4">
        <div className="text-sm font-bold">Resueltos {solved}/{problems.length}</div>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-good" style={{ width: `${(solved / problems.length) * 100}%` }} /></div>
      </div>

      <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button onClick={() => set("tema", "todos")} className={chip(tema === "todos")}>Todos los temas</button>
        {topics.map((t) => <button key={t.id} onClick={() => set("tema", t.id)} className={chip(tema === t.id)}>{t.icon} {t.title.split(":")[0]}</button>)}
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["todos", "facil", "medio", "dificil"] as const).map((d) => <button key={d} onClick={() => set("nivel", d)} className={chip(diff === d)}>{d === "todos" ? "Cualquier nivel" : DIFF_LABEL[d]}</button>)}
        <span className="mx-1 w-px bg-line" />
        {[["todos", "Todos"], ["pendiente", "Pendientes"], ["intentado", "Intentados"], ["resuelto", "Resueltos"]].map(([k, l]) => <button key={k} onClick={() => set("estado", k)} className={chip(est === k)}>{l}</button>)}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-panel">
        {list.length === 0 && <div className="p-8 text-center text-sm text-muted">No hay retos con esos filtros.</div>}
        {list.map((p, i) => {
          const s = st(p.slug);
          const t = topics.find((x) => x.id === p.topic);
          return (
            <Link key={p.slug} href={`/problemas/${p.slug}`} className={`flex items-center gap-3 px-4 py-3 transition hover:bg-panel2 ${i ? "border-t border-line" : ""}`}>
              {s === "resuelto" ? <CheckCircle2 size={20} className="shrink-0 text-good" /> : s === "intentado" ? <CircleDashed size={20} className="shrink-0 text-warn" /> : <Circle size={20} className="shrink-0 text-line" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold">{p.title}</div>
                <div className="truncate text-[11px] text-muted">{t?.icon} {t?.title} · {p.source}</div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${DIFF_CLASS[p.diff]}`}>{DIFF_LABEL[p.diff]}</span>
              <span className="hidden w-16 shrink-0 text-right text-xs font-bold text-accent sm:block">+{PROBLEM_XP[p.diff]} XP</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
