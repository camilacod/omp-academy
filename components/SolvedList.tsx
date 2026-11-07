"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Network } from "lucide-react";
import type { Difficulty } from "@/lib/types";
import { useHydrated, useProgress } from "@/lib/store";

interface Item { slug: string; title: string; source: string; topic: string; diff: Difficulty; hasDag: boolean }

const DIFF_LABEL: Record<Difficulty, string> = { facil: "Fácil", medio: "Medio", dificil: "Difícil" };
const DIFF_CLASS: Record<Difficulty, string> = { facil: "text-good bg-good/15", medio: "text-warn bg-warn/15", dificil: "text-bad bg-bad/15" };

export function SolvedList({ items, topics }: { items: Item[]; topics: { id: string; title: string; icon: string }[] }) {
  const hydrated = useHydrated();
  const read = useProgress((s) => s.solvedRead);
  const router = useRouter();
  const sp = useSearchParams();
  const tema = sp.get("tema") ?? "todos";
  const set = (v: string) => router.replace(v === "todos" ? "/resueltos" : `/resueltos?tema=${v}`, { scroll: false });
  const list = items.filter((i) => tema === "todos" || i.topic === tema);
  const used = Array.from(new Set(items.map((i) => i.topic)));
  const chip = (a: boolean) => `shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${a ? "bg-accent text-accent-fg" : "bg-panel2 text-muted hover:text-fg"}`;
  return (
    <>
      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button onClick={() => set("todos")} className={chip(tema === "todos")}>Todos</button>
        {topics.filter((t) => used.includes(t.id)).map((t) => <button key={t.id} onClick={() => set(t.id)} className={chip(tema === t.id)}>{t.icon} {t.title.split(":")[0]}</button>)}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {list.map((s) => {
          const t = topics.find((x) => x.id === s.topic);
          const done = hydrated && read[s.slug];
          return (
            <Link key={s.slug} href={`/resueltos/${s.slug}`} className="group rounded-2xl border border-line bg-panel p-4 transition hover:-translate-y-0.5 hover:border-accent/60">
              <div className="flex items-center gap-2 text-[11px] font-bold">
                <span className={`rounded-full px-2 py-0.5 ${DIFF_CLASS[s.diff]}`}>{DIFF_LABEL[s.diff]}</span>
                <span className="text-muted">{t?.icon} {t?.title.split(":")[0]}</span>
                {s.hasDag && <span className="flex items-center gap-1 text-teal"><Network size={12} /> DAG</span>}
                {done && <CheckCircle2 size={16} className="ml-auto text-good" />}
              </div>
              <div className="mt-2 font-bold leading-snug group-hover:text-accent">{s.title}</div>
              <div className="mt-1 text-xs text-muted">{s.source}</div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
