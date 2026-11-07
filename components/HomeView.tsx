"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { ArrowRight, Brain, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Code2, Flame, Presentation, Swords, Target, Zap } from "lucide-react";
import { computeStreak, todayKey, useHydrated, useProgress } from "@/lib/store";
import { levelInfo } from "@/lib/levels";
import { EXAM_DATE_ISO, EXAM_LABEL } from "@/lib/config";
import { PLAN, planIndex, type PlanItem } from "@/lib/plan";
import { ForkJoin } from "./widgets/ForkJoin";

export interface HomeData {
  lessons: { id: string; title: string; unit: string; minutes: number; cps: string[] }[];
  problemSlugs: string[];
  solvedSlugs: string[];
  questionIds: string[];
  cardIds: string[];
  decks: number;
  topics: number;
}

const subscribeSec = (cb: () => void) => {
  const t = setInterval(cb, 1000);
  return () => clearInterval(t);
};
const secNow = () => Math.floor(Date.now() / 1000);

function Countdown() {
  const sec = useSyncExternalStore(subscribeSec, secNow, () => 0);
  const target = Math.floor(new Date(EXAM_DATE_ISO).getTime() / 1000);
  const left = Math.max(0, target - sec);
  const parts = [
    { v: Math.floor(left / 86400), l: "días" },
    { v: Math.floor((left % 86400) / 3600), l: "horas" },
    { v: Math.floor((left % 3600) / 60), l: "min" },
    { v: left % 60, l: "seg" },
  ];
  const ready = sec > 0;
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3">
      {parts.map((p) => (
        <div key={p.l} className="rounded-2xl bg-bg/40 py-3 text-center ring-1 ring-white/10 sm:py-4">
          <div className="text-3xl font-extrabold tabular-nums sm:text-5xl">{ready ? String(p.v).padStart(2, "0") : "--"}</div>
          <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted sm:text-xs">{p.l}</div>
        </div>
      ))}
    </div>
  );
}

function DaysLeft() {
  const sec = useSyncExternalStore(subscribeSec, secNow, () => 0);
  if (!sec) return <>Pocos días</>;
  const d = Math.floor((new Date(EXAM_DATE_ISO).getTime() / 1000 - sec) / 86400);
  return <>{d < 0 ? "Examen en curso:" : d === 0 ? "Menos de 1 día" : d === 1 ? "1 día" : `${d} días`}</>;
}

const KIND_ICON = { diapos: Presentation, leccion: Code2, teoria: Brain, reto: Swords, resuelto: ClipboardCheck, repaso: Brain } as const;

export function HomeView({ data }: { data: HomeData }) {
  const hydrated = useHydrated();
  const s = useProgress();
  const [offset, setOffset] = useState(0);
  const idx = Math.max(0, Math.min(PLAN.length - 1, (hydrated ? planIndex() : 0) + offset));
  const day = PLAN[idx];
  const today = hydrated ? todayKey() : "";

  const xp = hydrated ? s.xp : 0;
  const lv = levelInfo(xp);
  const st = computeStreak(hydrated ? s.activity : {});

  const lessonDone = (id: string) => {
    const l = data.lessons.find((x) => x.id === id);
    return !!l && hydrated && l.cps.every((c) => s.cps[`${id}/${c}`]);
  };
  const lessonCp = (id: string) => {
    const l = data.lessons.find((x) => x.id === id)!;
    return l.cps.filter((c) => hydrated && s.cps[`${id}/${c}`]).length;
  };
  const isDone = (it: PlanItem) => {
    if (!hydrated || !it.id) return false;
    if (it.kind === "leccion") return lessonDone(it.id);
    if (it.kind === "reto") return s.problems[it.id] === "resuelto";
    if (it.kind === "resuelto") return !!s.solvedRead[it.id];
    return false;
  };
  const trackable = day.items.filter((i) => i.id);
  const doneN = trackable.filter(isDone).length;

  const nextLesson = data.lessons.find((l) => !lessonDone(l.id)) ?? data.lessons[data.lessons.length - 1];
  const nextProblem = data.problemSlugs.find((p) => !(hydrated && s.problems[p] === "resuelto"));

  const cpTotal = data.lessons.reduce((n, l) => n + l.cps.length, 0);
  const cpDone = data.lessons.reduce((n, l) => n + lessonCp(l.id), 0);
  const probDone = hydrated ? data.problemSlugs.filter((p) => s.problems[p] === "resuelto").length : 0;
  const solvedDone = hydrated ? data.solvedSlugs.filter((p) => s.solvedRead[p]).length : 0;
  const qDone = hydrated ? data.questionIds.filter((q) => s.questions[q]?.ok).length : 0;
  const total = cpTotal + data.problemSlugs.length + data.solvedSlugs.length + data.questionIds.length;
  const done = cpDone + probDone + solvedDone + qDone;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const due = hydrated ? data.cardIds.filter((c) => !s.cards[c] || s.cards[c].due <= today).length : 0;

  const bars = [
    { label: "Lecciones", n: cpDone, t: cpTotal, c: "bg-accent" },
    { label: "Retos", n: probDone, t: data.problemSlugs.length, c: "bg-teal" },
    { label: "Resueltos", n: solvedDone, t: data.solvedSlugs.length, c: "bg-warn" },
    { label: "Preguntas", n: qDone, t: data.questionIds.length, c: "bg-good" },
  ];

  const sections = [
    { href: "/aprende", icon: Code2, title: "Aprende", sub: `${data.lessons.length} lecciones con compilador`, tone: "text-accent" },
    { href: "/teoria", icon: Brain, title: "Teoría", sub: `${data.topics} temas · preguntas y flashcards`, tone: "text-teal" },
    { href: "/problemas", icon: Swords, title: "Retos", sub: `${data.problemSlugs.length} problemas con tests ocultos`, tone: "text-bad" },
    { href: "/resueltos", icon: ClipboardCheck, title: "Resueltos", sub: `${data.solvedSlugs.length} ejercicios paso a paso`, tone: "text-warn" },
    { href: "/diapos", icon: Presentation, title: "Diapos", sub: `${data.decks} resúmenes U4–U5`, tone: "text-good" },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-accent/25 via-panel to-teal/15 p-5 sm:p-7">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent"><CalendarDays size={14} /> Examen · {EXAM_LABEL}</div>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl"><DaysLeft /> para dominar OpenMP</h1>
          <p className="mt-1 text-sm text-muted">CS4052 · Computación Paralela y Distribuida. U4 (OpenMP + híbrido) y U5 (algoritmos).</p>
          <div className="mt-5"><Countdown /></div>
          <div className="mt-5">
            <div className="mb-1.5 flex justify-between text-xs font-bold"><span className="text-muted">Preparación total</span><span className="text-accent">{pct}%</span></div>
            <div className="h-2.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
          <Link href="/progreso" className="rounded-2xl border border-line bg-panel p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted"><Flame size={14} className="text-warn" /> Racha</div>
            <div className="mt-1 text-2xl font-extrabold sm:text-3xl">{st.streak} <span className="text-sm font-semibold text-muted">{st.streak === 1 ? "día" : "días"}</span></div>
            <div className="mt-2 hidden h-1.5 overflow-hidden rounded-full bg-line lg:block"><div className="h-full bg-warn" style={{ width: `${Math.min(100, (st.todayXp / st.goal) * 100)}%` }} /></div>
            <div className="mt-1 text-[11px] text-muted">Hoy {st.todayXp}/{st.goal} XP {st.doneToday && "✓"}</div>
          </Link>
          <Link href="/progreso" className="rounded-2xl border border-line bg-panel p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted"><Zap size={14} className="text-accent" /> XP</div>
            <div className="mt-1 text-2xl font-extrabold sm:text-3xl">{xp}</div>
            <div className="text-[11px] text-muted">{lv.next ? `${lv.toNext} para el nivel ${lv.level + 1}` : "Nivel máximo"}</div>
          </Link>
          <Link href="/progreso" className="rounded-2xl border border-line bg-panel p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase text-muted"><Target size={14} className="text-teal" /> Nivel {lv.level}</div>
            <div className="mt-1 text-sm font-extrabold leading-tight sm:text-lg">{lv.name}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full bg-teal" style={{ width: `${lv.pct}%` }} /></div>
          </Link>
        </div>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-line bg-panel p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold tracking-tight">{hydrated && offset === 0 ? "Hoy toca" : "Plan"}: {day.title}</h2>
            <div className="ml-auto flex items-center gap-1">
              <button aria-label="Día anterior" disabled={idx === 0} onClick={() => setOffset((o) => o - 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-panel2 disabled:opacity-30"><ChevronLeft size={16} /></button>
              <button aria-label="Día siguiente" disabled={idx === PLAN.length - 1} onClick={() => setOffset((o) => o + 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-panel2 disabled:opacity-30"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {new Date(day.date + "T12:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" })} · {day.focus}
            {trackable.length > 0 && <> · <b className="text-accent">{doneN}/{trackable.length}</b> completados</>}
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {day.items.map((it) => {
              const Icon = KIND_ICON[it.kind];
              const d = isDone(it);
              return (
                <li key={it.kind + it.href}>
                  <Link href={it.href} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition hover:border-accent/60 ${d ? "border-good/40 bg-good/10" : "border-line bg-panel2"}`}>
                    {d ? <CheckCircle2 size={18} className="shrink-0 text-good" /> : <Icon size={18} className="shrink-0 text-muted" />}
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-4">
          <Link href={`/aprende/${nextLesson.id}`} className="group block rounded-3xl border border-line bg-panel p-4 transition hover:border-accent/60 sm:p-5">
            <div className="text-[11px] font-bold uppercase tracking-wider text-accent">Continúa aprendiendo</div>
            <div className="mt-1 text-lg font-extrabold leading-snug group-hover:text-accent">{nextLesson.title}</div>
            <div className="mt-0.5 text-xs text-muted">{nextLesson.unit} · {nextLesson.minutes} min · {lessonCp(nextLesson.id)}/{nextLesson.cps.length} checkpoints</div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg">{lessonCp(nextLesson.id) ? "Retomar" : "Empezar"} <ArrowRight size={16} /></div>
          </Link>
          <div className="grid grid-cols-2 gap-3">
            {nextProblem && (
              <Link href={`/problemas/${nextProblem}`} className="rounded-2xl border border-line bg-panel p-3 text-sm transition hover:border-accent/60">
                <Swords size={18} className="text-bad" />
                <div className="mt-1 font-bold">Siguiente reto</div>
                <div className="truncate text-xs text-muted">{nextProblem}</div>
              </Link>
            )}
            <Link href="/teoria" className="rounded-2xl border border-line bg-panel p-3 text-sm transition hover:border-accent/60">
              <Brain size={18} className="text-teal" />
              <div className="mt-1 font-bold">Flashcards</div>
              <div className="text-xs text-muted">{due} por repasar hoy</div>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {sections.map((x) => (
          <Link key={x.href} href={x.href} className="group rounded-2xl border border-line bg-panel p-4 transition hover:-translate-y-0.5 hover:border-accent/60">
            <x.icon size={22} className={x.tone} />
            <div className="mt-2 font-extrabold group-hover:text-accent">{x.title}</div>
            <div className="text-xs text-muted">{x.sub}</div>
          </Link>
        ))}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-3xl border border-line bg-panel p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-muted">Tu avance</h2>
          <div className="space-y-2.5">
            {bars.map((b) => (
              <div key={b.label} className="flex items-center gap-3 text-xs font-semibold">
                <span className="w-20 text-muted">{b.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-line"><div className={`h-full ${b.c}`} style={{ width: `${b.t ? (b.n / b.t) * 100 : 0}%` }} /></div>
                <span className="w-14 text-right tabular-nums">{b.n}/{b.t}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <ForkJoin threads={4} compact />
          <p className="mt-2 text-center text-xs text-muted">Fork–join: el maestro crea hilos, trabajan en paralelo y se unen en la barrera.</p>
        </div>
      </section>
    </div>
  );
}
