"use client";
import { useRef } from "react";
import { Download, Flame, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { computeStreak, todayKey, useHydrated, useProgress } from "@/lib/store";
import { LEVELS, levelInfo } from "@/lib/levels";
import { DAILY_GOAL_XP } from "@/lib/config";

export function ProgressView() {
  const hydrated = useHydrated();
  const s = useProgress();
  const file = useRef<HTMLInputElement>(null);
  if (!hydrated) return <div className="h-64 animate-pulse rounded-2xl bg-panel" />;

  const lv = levelInfo(s.xp);
  const st = computeStreak(s.activity);
  const days: { key: string; xp: number; label: string }[] = [];
  for (let i = 34; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({ key: todayKey(d), xp: s.activity[todayKey(d)] ?? 0, label: `${d.getDate()}/${d.getMonth() + 1}` });
  }
  const cpDone = Object.keys(s.cps).filter((k) => !k.endsWith("/__bonus")).length;
  const probDone = Object.values(s.problems).filter((v) => v === "resuelto").length;
  const qOk = Object.values(s.questions).filter((q) => q.ok).length;
  const cardsKnown = Object.values(s.cards).filter((c) => c.box >= 3).length;
  const solvedN = Object.keys(s.solvedRead).length;

  const cell = (xp: number) =>
    xp === 0 ? "bg-panel2" : xp < DAILY_GOAL_XP / 2 ? "bg-accent/30" : xp < DAILY_GOAL_XP ? "bg-accent/60" : "bg-accent";

  const exportJson = () => {
    const blob = new Blob([s.exportData()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `omp-academy-${todayKey()}.json`;
    a.click();
  };
  const importJson = async (f?: File) => {
    if (!f) return;
    const ok = s.importData(await f.text());
    if (ok) toast.success("Progreso importado");
    else toast.error("Archivo inválido");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted"><Star size={14} className="text-accent" /> Nivel {lv.level}</div>
          <div className="mt-1 text-xl font-extrabold">{lv.name}</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-accent" style={{ width: `${lv.pct}%` }} /></div>
          <div className="mt-1 text-xs text-muted">{s.xp} XP{lv.next ? ` · faltan ${lv.toNext} para «${lv.next.name}»` : " · nivel máximo"}</div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase text-muted"><Flame size={14} className="text-accent" /> Racha</div>
          <div className="mt-1 text-xl font-extrabold">{st.streak} {st.streak === 1 ? "día" : "días"}</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className="h-full rounded-full bg-teal" style={{ width: `${Math.min(100, (st.todayXp / st.goal) * 100)}%` }} /></div>
          <div className="mt-1 text-xs text-muted">Hoy: {st.todayXp}/{st.goal} XP {st.doneToday ? "· ¡meta cumplida!" : "· cumple la meta para mantener la racha"}</div>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-4">
          <div className="text-xs font-bold uppercase text-muted">Completado</div>
          <ul className="mt-1 space-y-0.5 text-sm">
            <li>🧪 {cpDone} ejercicios de lecciones</li>
            <li>🧩 {probDone} retos resueltos</li>
            <li>❓ {qOk} preguntas correctas</li>
            <li>🃏 {cardsKnown} tarjetas dominadas</li>
            <li>📘 {solvedN} resueltos leídos</li>
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-4">
        <div className="mb-3 text-sm font-bold">Últimos 35 días</div>
        <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-[repeat(35,minmax(0,1fr))]">
          {days.map((d) => (
            <div key={d.key} title={`${d.label}: ${d.xp} XP`} className={`aspect-square rounded ${cell(d.xp)} ${d.key === todayKey() ? "ring-2 ring-teal" : ""}`} />
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">Menos <span className="h-3 w-3 rounded bg-panel2" /><span className="h-3 w-3 rounded bg-accent/30" /><span className="h-3 w-3 rounded bg-accent/60" /><span className="h-3 w-3 rounded bg-accent" /> Más (meta = {DAILY_GOAL_XP} XP)</div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-4">
        <div className="mb-3 text-sm font-bold">Niveles</div>
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {LEVELS.map((l, i) => (
            <li key={l.name} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${i + 1 === lv.level ? "bg-accent/15 font-bold text-accent" : i + 1 < lv.level ? "text-fg" : "text-muted"}`}>
              <span>{i + 1}. {l.name}</span><span className="font-mono text-xs">{l.xp} XP</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-4">
        <div className="mb-3 text-sm font-bold">Datos</div>
        <div className="flex flex-wrap gap-2">
          <button onClick={exportJson} className="flex items-center gap-2 rounded-xl bg-panel2 px-3 py-2 text-sm font-semibold hover:text-accent"><Download size={15} /> Exportar JSON</button>
          <button onClick={() => file.current?.click()} className="flex items-center gap-2 rounded-xl bg-panel2 px-3 py-2 text-sm font-semibold hover:text-accent"><Upload size={15} /> Importar</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => importJson(e.target.files?.[0])} />
          <button onClick={() => { if (confirm("¿Borrar todo tu progreso?")) { s.reset(); toast("Progreso reiniciado"); } }} className="flex items-center gap-2 rounded-xl bg-bad/15 px-3 py-2 text-sm font-semibold text-bad"><Trash2 size={15} /> Reiniciar</button>
        </div>
      </div>
    </div>
  );
}
