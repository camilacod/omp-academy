"use client";
import Link from "next/link";
import { todayKey, useHydrated, useProgress } from "@/lib/store";

interface Item { id: string; title: string; icon: string; blurb: string; q: string[]; c: string[] }

export function TopicCards({ topics }: { topics: Item[] }) {
  const hydrated = useHydrated();
  const questions = useProgress((s) => s.questions);
  const cards = useProgress((s) => s.cards);
  const today = todayKey();
  const allDue = topics.reduce((n, t) => n + t.c.filter((id) => !cards[id] || cards[id].due <= today).length, 0);
  return (
    <>
      {hydrated && (
        <div className="mb-4 rounded-2xl border border-line bg-panel p-4 text-sm">
          🃏 Tienes <b className="text-accent">{allDue}</b> tarjetas por repasar hoy. Entra a un tema → pestaña <b>Tarjetas</b>.
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((t) => {
          const ok = hydrated ? t.q.filter((id) => questions[id]?.ok).length : 0;
          const known = hydrated ? t.c.filter((id) => (cards[id]?.box ?? 0) >= 3).length : 0;
          const due = hydrated ? t.c.filter((id) => !cards[id] || cards[id].due <= today).length : 0;
          return (
            <Link key={t.id} href={`/teoria/${t.id}`} className="group rounded-2xl border border-line bg-panel p-4 transition hover:-translate-y-0.5 hover:border-accent/60">
              <div className="text-3xl">{t.icon}</div>
              <div className="mt-2 font-bold group-hover:text-accent">{t.title}</div>
              <p className="mt-1 text-xs text-muted">{t.blurb}</p>
              <div className="mt-3 space-y-1.5 text-[11px] font-semibold text-muted">
                <div className="flex items-center gap-2"><span className="w-20">Preguntas</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-accent" style={{ width: `${(ok / t.q.length) * 100}%` }} /></div><span>{ok}/{t.q.length}</span></div>
                <div className="flex items-center gap-2"><span className="w-20">Tarjetas</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-teal" style={{ width: `${(known / t.c.length) * 100}%` }} /></div><span>{due} pend.</span></div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
