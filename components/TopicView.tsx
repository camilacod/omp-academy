"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Difficulty, Question, Topic } from "@/lib/types";
import { todayKey, useHydrated, useProgress } from "@/lib/store";
import { QUESTION_XP } from "@/content/theory";
import { Markdown } from "./Markdown";

type Tab = "leer" | "preguntas" | "tarjetas";
const DIFF_LABEL: Record<Difficulty, string> = { facil: "Fácil", medio: "Medio", dificil: "Difícil" };
const DIFF_CLASS: Record<Difficulty, string> = { facil: "bg-good/15 text-good", medio: "bg-warn/15 text-warn", dificil: "bg-bad/15 text-bad" };
const norm = (s: string) => s.toLowerCase().replace(/[\s$`*·]/g, "");

export function TopicView({ topic, lessons }: { topic: Topic; lessons: { id: string; title: string }[] }) {
  const [tab, setTab] = useState<Tab>("leer");
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-5 md:px-6">
      <Link href="/teoria" className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"><ChevronLeft size={14} /> Teoría</Link>
      <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight"><span className="text-3xl">{topic.icon}</span> {topic.title}</h1>
      <div className="sticky top-0 z-10 -mx-4 mt-4 flex gap-1 border-b border-line bg-bg/90 px-4 backdrop-blur md:static md:mx-0 md:px-0">
        {(["leer", "preguntas", "tarjetas"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-bold capitalize ${tab === t ? "border-b-2 border-accent text-accent" : "text-muted hover:text-fg"}`}>{t}</button>
        ))}
      </div>
      <div className="mt-5">
        {tab === "leer" && (
          <>
            <Markdown>{topic.reading}</Markdown>
            {lessons.length > 0 && (
              <div className="mt-6 rounded-2xl border border-line bg-panel p-4">
                <div className="mb-2 text-sm font-bold">Practica este tema</div>
                <div className="flex flex-wrap gap-2">
                  {lessons.map((l) => <Link key={l.id} href={`/aprende/${l.id}`} className="rounded-full bg-panel2 px-3 py-1.5 text-xs font-semibold hover:text-accent">🧪 {l.title}</Link>)}
                  <Link href={`/problemas?tema=${topic.id}`} className="rounded-full bg-panel2 px-3 py-1.5 text-xs font-semibold hover:text-accent">🧩 Retos del tema</Link>
                </div>
              </div>
            )}
            <div className="mt-5 flex gap-2">
              <button onClick={() => setTab("preguntas")} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg">Ir a las preguntas →</button>
              <button onClick={() => setTab("tarjetas")} className="rounded-xl bg-panel2 px-4 py-2.5 text-sm font-bold">Flashcards</button>
            </div>
          </>
        )}
        {tab === "preguntas" && <Quiz topic={topic} />}
        {tab === "tarjetas" && <Flashcards topic={topic} />}
      </div>
    </div>
  );
}

function Quiz({ topic }: { topic: Topic }) {
  const hydrated = useHydrated();
  const questions = useProgress((s) => s.questions);
  const [filter, setFilter] = useState<Difficulty | "todas">("todas");
  const list = topic.questions.filter((q) => filter === "todas" || q.diff === filter);
  const ok = topic.questions.filter((q) => hydrated && questions[q.id]?.ok).length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["todas", "facil", "medio", "dificil"] as const).map((d) => (
          <button key={d} onClick={() => setFilter(d)} className={`rounded-full px-3 py-1 text-xs font-bold ${filter === d ? "bg-accent text-accent-fg" : "bg-panel2 text-muted"}`}>
            {d === "todas" ? "Todas" : DIFF_LABEL[d]}{d !== "todas" && ` · +${QUESTION_XP[d]}`}
          </button>
        ))}
        <span className="ml-auto text-xs font-semibold text-muted">{ok}/{topic.questions.length} correctas</span>
      </div>
      <div className="space-y-4">{list.map((q) => <QuestionCard key={q.id} q={q} />)}</div>
    </div>
  );
}

function QuestionCard({ q }: { q: Question }) {
  const hydrated = useHydrated();
  const answer = useProgress((s) => s.answerQuestion);
  const done = useProgress((s) => s.questions[q.id]);
  const [pick, setPick] = useState<number | boolean | string | null>(null);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<boolean | null>(null);
  const xp = QUESTION_XP[q.diff];

  const submit = (v: number | boolean | string) => {
    let ok: boolean;
    if (q.type === "fill") ok = (q.answer as string[]).some((a) => norm(a) === norm(String(v)));
    else ok = v === q.answer;
    setPick(v);
    setResult(ok);
    const gain = answer(q.id, ok, xp);
    if (gain) toast.success(`+${gain} XP`);
  };
  const retry = () => { setPick(null); setResult(null); setInput(""); };
  const opts = q.type === "tf" ? ["Verdadero", "Falso"] : q.options ?? [];

  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold">
        <span className={`rounded-full px-2 py-0.5 ${DIFF_CLASS[q.diff]}`}>{DIFF_LABEL[q.diff]}</span>
        <span className="text-muted">+{xp} XP</span>
        {hydrated && done?.ok && <span className="ml-auto flex items-center gap-1 text-good"><CheckCircle2 size={13} /> resuelta</span>}
      </div>
      <Markdown>{q.q}</Markdown>
      {q.type === "fill" ? (
        <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (input.trim() && result === null) submit(input); }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} disabled={result !== null} placeholder="Tu respuesta" className="min-w-0 flex-1 rounded-xl border border-line bg-panel2 px-3 py-2 text-sm outline-none focus:border-accent" />
          <button disabled={result !== null || !input.trim()} className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-accent-fg disabled:opacity-40">Comprobar</button>
        </form>
      ) : (
        <div className="mt-3 grid gap-2">
          {opts.map((o, i) => {
            const val = q.type === "tf" ? i === 0 : i;
            const chosen = pick === val;
            const isRight = result !== null && val === q.answer;
            return (
              <button key={i} disabled={result !== null} onClick={() => submit(val)}
                className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${isRight ? "border-good bg-good/15" : chosen && result === false ? "border-bad bg-bad/15" : "border-line bg-panel2 hover:border-accent/60"}`}>
                <Markdown inline>{o}</Markdown>
              </button>
            );
          })}
        </div>
      )}
      {result !== null && (
        <div className={`pop mt-3 rounded-xl p-3 text-sm ${result ? "bg-good/10" : "bg-bad/10"}`}>
          <div className={`mb-1 flex items-center gap-1.5 font-bold ${result ? "text-good" : "text-bad"}`}>
            {result ? <CheckCircle2 size={16} /> : <XCircle size={16} />} {result ? "¡Correcto!" : "Todavía no"}
          </div>
          <Markdown>{q.explain}</Markdown>
          {!result && <button onClick={retry} className="mt-2 flex items-center gap-1 text-xs font-bold text-accent"><RotateCcw size={12} /> Reintentar</button>}
        </div>
      )}
    </div>
  );
}

function Flashcards({ topic }: { topic: Topic }) {
  const hydrated = useHydrated();
  const cards = useProgress((s) => s.cards);
  const review = useProgress((s) => s.reviewCard);
  const [flip, setFlip] = useState(false);
  const [seen, setSeen] = useState<string[]>([]);
  const today = todayKey();
  const queue = useMemo(
    () => topic.cards.filter((c) => !seen.includes(c.id) && (!cards[c.id] || cards[c.id].due <= today)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [topic.cards, seen, today, hydrated],
  );
  const card = queue[0];
  const act = (known: boolean) => {
    if (!card) return;
    const g = review(card.id, known);
    if (g) toast.success(`+${g} XP`);
    setSeen((s) => [...s, card.id]);
    setFlip(false);
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === " ") { e.preventDefault(); setFlip((f) => !f); }
      if (flip && e.key === "1") act(false);
      if (flip && e.key === "2") act(true);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  if (!hydrated) return null;
  const boxes = [1, 2, 3, 4, 5].map((b) => topic.cards.filter((c) => (cards[c.id]?.box ?? 0) === b).length);

  return (
    <div>
      <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold text-muted">
        {boxes.map((n, i) => <span key={i} className="rounded bg-panel2 px-2 py-1">Caja {i + 1}: {n}</span>)}
        <span className="ml-auto">{topic.cards.length - boxes.reduce((a, b) => a + b, 0)} nuevas</span>
      </div>
      {card ? (
        <>
          <button onClick={() => setFlip(!flip)} className="grid min-h-56 w-full place-items-center rounded-3xl border border-line bg-panel p-6 text-center transition hover:border-accent/60">
            <div>
              <div className="mb-3 text-[11px] font-bold uppercase tracking-widest text-accent">{flip ? "Respuesta" : "Concepto"}</div>
              <div className="text-lg"><Markdown>{flip ? card.back : card.front}</Markdown></div>
              {!flip && <div className="mt-4 text-xs text-muted">Toca para voltear (espacio)</div>}
            </div>
          </button>
          <div className={`mt-4 grid grid-cols-2 gap-3 transition ${flip ? "opacity-100" : "pointer-events-none opacity-30"}`}>
            <button onClick={() => act(false)} className="rounded-xl bg-bad/15 py-3 font-bold text-bad">Otra vez (1)</button>
            <button onClick={() => act(true)} className="rounded-xl bg-good/15 py-3 font-bold text-good">La sabía (2)</button>
          </div>
          <div className="mt-2 text-center text-xs text-muted">{queue.length} por repasar en esta sesión</div>
        </>
      ) : (
        <div className="rounded-3xl border border-line bg-panel p-8 text-center">
          <div className="text-4xl">🎉</div>
          <div className="mt-2 font-bold">¡Todo repasado por hoy!</div>
          <div className="mt-1 text-sm text-muted">Las tarjetas que fallaste vuelven en la caja 1; las que sabes se espacian (1, 2, 4, 8 días).</div>
          <button onClick={() => setSeen([])} className="mt-4 rounded-xl bg-panel2 px-4 py-2 text-sm font-bold">Reiniciar sesión</button>
        </div>
      )}
    </div>
  );
}
