"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, List, X } from "lucide-react";
import type { Deck } from "@/lib/types";
import { Markdown } from "./Markdown";

export function DeckViewer({ deck, prev, next }: { deck: Deck; prev?: { id: string; unit: string }; next?: { id: string; unit: string } }) {
  const total = deck.slides.length;
  // índice 0 = portada; 1..total = diapositivas; total+1 = enlaces
  const last = total + 1;
  const [i, setI] = useState(0);
  const [menu, setMenu] = useState(false);
  const touch = useRef<number | null>(null);

  useEffect(() => {
    const n = parseInt(window.location.hash.slice(1), 10);
    if (!(n >= 0 && n <= last)) return;
    const t = setTimeout(() => setI(n), 0); // restaura la diapositiva desde #n
    return () => clearTimeout(t);
  }, [last]);

  const go = useCallback(
    (n: number) => {
      const v = Math.max(0, Math.min(last, n));
      setI(v);
      history.replaceState(null, "", v === 0 ? window.location.pathname : `#${v}`);
      window.scrollTo({ top: 0 });
    },
    [last],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(i + 1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(i - 1); }
      if (e.key === "Home") go(0);
      if (e.key === "End") go(last);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go, last]);

  const slide = i >= 1 && i <= total ? deck.slides[i - 1] : null;
  const pct = (i / last) * 100;

  return (
    <div
      className="mx-auto max-w-4xl px-4 pb-24 pt-5 md:px-6 md:pb-10"
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        touch.current = null;
        if (Math.abs(dx) > 70) go(i + (dx < 0 ? 1 : -1));
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <Link href="/diapos" className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg"><ChevronLeft size={14} /> Diapos</Link>
        <span className="ml-auto text-xs font-bold text-muted">{deck.unit} · {i === 0 ? "portada" : i === last ? "enlaces" : `${i}/${total}`}</span>
        <button onClick={() => setMenu(true)} aria-label="Índice" className="grid h-8 w-8 place-items-center rounded-lg bg-panel2 text-muted hover:text-fg"><List size={16} /></button>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} /></div>

      <article key={i} className="min-h-[55vh] animate-[fadeUp_.25s_ease] rounded-3xl border border-line bg-panel p-5 md:p-8">
        {i === 0 && (
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-accent">{deck.unit} · {total} diapositivas</div>
            <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight">{deck.title}</h1>
            <div className="mt-4"><Markdown>{deck.intro}</Markdown></div>
            <p className="mt-6 text-xs text-muted">Usa ← → (o desliza en el móvil). Resumen propio basado en «{deck.pdf}».</p>
            <button onClick={() => go(1)} className="mt-5 flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-accent-fg hover:brightness-110">Empezar <ChevronRight size={16} /></button>
          </div>
        )}
        {slide && (
          <div>
            {slide.note && <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{slide.note}</div>}
            <h2 className="mt-1 text-2xl font-extrabold leading-tight tracking-tight">{slide.title}</h2>
            <ul className="mt-4 space-y-3">
              {slide.bullets.map((b, k) => (
                <li key={k} className="flex gap-3 text-[15px] leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <Markdown inline className="min-w-0 flex-1">{b}</Markdown>
                </li>
              ))}
            </ul>
            {slide.formula && <div className="mt-4 overflow-x-auto rounded-xl bg-panel2 px-3 py-1"><Markdown>{`$$${slide.formula}$$`}</Markdown></div>}
            {slide.code && <div className="mt-4"><Markdown>{"```cpp\n" + slide.code.trim() + "\n```"}</Markdown></div>}
          </div>
        )}
        {i === last && (
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Practica este tema</h2>
            <p className="mt-1 text-sm text-muted">Ya revisaste {deck.unit}. Ahora llévalo a la práctica:</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {deck.links.map((l) => (
                <Link key={l.href} href={l.href} className="rounded-xl border border-line bg-panel2 px-4 py-3 text-sm font-bold hover:border-accent/60 hover:text-accent">{l.label}</Link>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {prev && <Link href={`/diapos/${prev.id}`} className="rounded-xl bg-panel2 px-4 py-2.5 text-sm font-bold">← {prev.unit}</Link>}
              {next && <Link href={`/diapos/${next.id}`} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg">Siguiente: {next.unit} →</Link>}
            </div>
          </div>
        )}
      </article>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-3 border-t border-line bg-bg/90 px-4 py-2.5 backdrop-blur md:static md:mt-4 md:border-0 md:bg-transparent md:px-0 md:py-0">
        <button onClick={() => go(i - 1)} disabled={i === 0} className="flex items-center gap-1 rounded-xl bg-panel2 px-4 py-2.5 text-sm font-bold disabled:opacity-40"><ChevronLeft size={16} /> Anterior</button>
        <button onClick={() => go(i + 1)} disabled={i === last} className="flex items-center gap-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-fg disabled:opacity-40">Siguiente <ChevronRight size={16} /></button>
      </div>

      {menu && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={() => setMenu(false)}>
          <div className="h-full w-80 max-w-[85vw] overflow-y-auto border-l border-line bg-panel p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between"><b>{deck.unit}</b><button onClick={() => setMenu(false)} aria-label="Cerrar"><X size={18} /></button></div>
            <button onClick={() => { go(0); setMenu(false); }} className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${i === 0 ? "bg-accent/15 font-bold text-accent" : "hover:bg-panel2"}`}>Portada</button>
            {deck.slides.map((s, k) => (
              <button key={k} onClick={() => { go(k + 1); setMenu(false); }} className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm ${i === k + 1 ? "bg-accent/15 font-bold text-accent" : "hover:bg-panel2"}`}>
                <span className="mr-2 text-muted">{k + 1}</span>{s.title}
              </button>
            ))}
            <button onClick={() => { go(last); setMenu(false); }} className={`mt-1 w-full rounded-lg px-3 py-2 text-left text-sm ${i === last ? "bg-accent/15 font-bold text-accent" : "hover:bg-panel2"}`}>Practicar este tema</button>
          </div>
        </div>
      )}
    </div>
  );
}
