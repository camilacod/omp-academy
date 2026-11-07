"use client";
import { useMemo, useState } from "react";

type Kind = "static" | "static,c" | "dynamic,c" | "guided";
type Load = "uniforme" | "creciente" | "aleatorio";

const COLORS = ["#ff8a3d", "#4fe0c8", "#a78bfa", "#fbbf24", "#f472b6", "#60a5fa", "#4ade80", "#f87171"];

function costs(n: number, load: Load) {
  return Array.from({ length: n }, (_, i) => {
    if (load === "uniforme") return 1;
    if (load === "creciente") return 1 + Math.floor((i * 6) / n);
    const x = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
    return 1 + Math.floor((x - Math.floor(x)) * 5);
  });
}

function simulate(n: number, p: number, kind: Kind, c: number, cost: number[]) {
  const owner = new Array<number>(n).fill(0);
  const finish = new Array<number>(p).fill(0);
  if (kind === "static" || kind === "static,c") {
    if (kind === "static") {
      const base = Math.floor(n / p);
      const extra = n % p;
      let idx = 0;
      for (let t = 0; t < p; t++) {
        const len = base + (t < extra ? 1 : 0);
        for (let k = 0; k < len; k++) owner[idx++] = t;
      }
    } else {
      for (let b = 0; b * c < n; b++) for (let i = b * c; i < Math.min(n, (b + 1) * c); i++) owner[i] = b % p;
    }
    owner.forEach((t, i) => (finish[t] += cost[i]));
    return { owner, finish };
  }
  // dynamic / guided: el hilo que queda libre antes toma el siguiente bloque
  let next = 0;
  let remaining = n;
  while (next < n) {
    let t = 0;
    for (let k = 1; k < p; k++) if (finish[k] < finish[t]) t = k;
    const size = kind === "dynamic,c" ? c : Math.max(c, Math.ceil(remaining / p));
    const end = Math.min(n, next + size);
    for (let i = next; i < end; i++) {
      owner[i] = t;
      finish[t] += cost[i];
    }
    remaining -= end - next;
    next = end;
  }
  return { owner, finish };
}

export function ScheduleViz() {
  const [n, setN] = useState(16);
  const [p, setP] = useState(4);
  const [kind, setKind] = useState<Kind>("static");
  const [c, setC] = useState(2);
  const [load, setLoad] = useState<Load>("uniforme");
  const cost = useMemo(() => costs(n, load), [n, load]);
  const { owner, finish } = useMemo(() => simulate(n, p, kind, c, cost), [n, p, kind, c, cost]);
  const total = cost.reduce((a, b) => a + b, 0);
  const tmax = Math.max(...finish);
  const ideal = total / p;
  const sel = "rounded-md border border-line bg-panel px-1.5 py-1 text-xs text-fg";

  return (
    <div className="my-4 rounded-2xl border border-line bg-panel2 p-4 not-prose">
      <div className="mb-3 text-sm font-bold">Visualizador de schedule</div>
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-muted sm:grid-cols-5">
        <label className="flex flex-col gap-1">Política
          <select className={sel} value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
            <option value="static">static</option><option value="static,c">static,c</option><option value="dynamic,c">dynamic,c</option><option value="guided">guided</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">chunk c = {c}
          <input type="range" min={1} max={8} value={c} onChange={(e) => setC(+e.target.value)} disabled={kind === "static"} />
        </label>
        <label className="flex flex-col gap-1">Iteraciones = {n}
          <input type="range" min={8} max={32} value={n} onChange={(e) => setN(+e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">Hilos = {p}
          <input type="range" min={2} max={8} value={p} onChange={(e) => setP(+e.target.value)} />
        </label>
        <label className="flex flex-col gap-1">Costo por iteración
          <select className={sel} value={load} onChange={(e) => setLoad(e.target.value as Load)}>
            <option value="uniforme">uniforme</option><option value="creciente">creciente</option><option value="aleatorio">aleatorio</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-1">
        {owner.map((t, i) => (
          <div key={i} title={`iteración ${i} · hilo ${t} · costo ${cost[i]}`} className="grid h-9 w-9 place-items-center rounded-md text-[11px] font-bold text-black" style={{ background: COLORS[t % 8] }}>
            <span className="leading-none">{i}</span>
            <span className="text-[8px] leading-none opacity-70">c{cost[i]}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 space-y-1">
        {finish.map((f, t) => (
          <div key={t} className="flex items-center gap-2 text-[11px]">
            <span className="w-10 text-muted">hilo {t}</span>
            <div className="h-3 flex-1 rounded bg-line">
              <div className="h-full rounded" style={{ width: `${(f / Math.max(tmax, 1)) * 100}%`, background: COLORS[t % 8] }} />
            </div>
            <span className="w-6 text-right font-mono text-muted">{f}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 text-xs text-muted">
        Tiempo total (hilo más lento): <b className="text-fg">{tmax}</b> · ideal {ideal.toFixed(1)} · desbalance{" "}
        <b className={tmax / ideal > 1.15 ? "text-bad" : "text-good"}>{((tmax / ideal - 1) * 100).toFixed(0)}%</b>.
        {load !== "uniforme" && kind === "static" && " Prueba dynamic o guided: con costos desiguales equilibran mejor."}
      </div>
    </div>
  );
}
