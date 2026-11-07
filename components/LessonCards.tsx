"use client";
import Link from "next/link";
import { CheckCircle2, Clock } from "lucide-react";
import { useHydrated, useProgress } from "@/lib/store";

interface Item { id: string; title: string; unit: string; minutes: number; summary: string; cps: string[] }

export function LessonCards({ lessons }: { lessons: Item[] }) {
  const hydrated = useHydrated();
  const cps = useProgress((s) => s.cps);
  const total = lessons.reduce((n, l) => n + l.cps.length, 0);
  const done = lessons.reduce((n, l) => n + l.cps.filter((c) => hydrated && cps[`${l.id}/${c}`]).length, 0);
  return (
    <>
      <div className="mb-5 rounded-2xl border border-line bg-panel p-4">
        <div className="flex items-center justify-between text-sm font-bold">
          <span>Tu progreso en lecciones</span>
          <span className="text-accent">{done}/{total} ejercicios</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done / total) * 100}%` }} /></div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {lessons.map((l, i) => {
          const d = l.cps.filter((c) => hydrated && cps[`${l.id}/${c}`]).length;
          const full = d === l.cps.length;
          return (
            <Link key={l.id} href={`/aprende/${l.id}`} className="group flex gap-3 rounded-2xl border border-line bg-panel p-4 transition hover:-translate-y-0.5 hover:border-accent/60">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${full ? "bg-good/20 text-good" : "bg-accent/15 text-accent"}`}>
                {full ? <CheckCircle2 size={22} /> : i + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-muted">
                  <span className="rounded bg-panel2 px-1.5 py-0.5">{l.unit}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {l.minutes} min</span>
                </div>
                <div className="mt-1 font-bold leading-snug group-hover:text-accent">{l.title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{l.summary}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${(d / l.cps.length) * 100}%` }} /></div>
                  <span className="text-[11px] font-semibold text-muted">{d}/{l.cps.length}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
