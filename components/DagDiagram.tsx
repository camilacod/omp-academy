import type { DagData } from "@/lib/types";

const W = 158;
const H = 40;
const GX = 52;
const GY = 18;

/** Diagrama de DAG por capas (izquierda → derecha) con ruta crítica resaltada. */
export function DagDiagram({ dag }: { dag: DagData }) {
  const level: Record<string, number> = {};
  const incoming: Record<string, string[]> = {};
  dag.nodes.forEach((n) => (incoming[n.id] = []));
  dag.edges.forEach(([a, b]) => incoming[b].push(a));
  const lv = (id: string): number => {
    if (level[id] !== undefined) return level[id];
    level[id] = incoming[id].length ? Math.max(...incoming[id].map(lv)) + 1 : 0;
    return level[id];
  };
  dag.nodes.forEach((n) => lv(n.id));
  const cols = Math.max(...Object.values(level)) + 1;
  const byCol: string[][] = Array.from({ length: cols }, () => []);
  dag.nodes.forEach((n) => byCol[level[n.id]].push(n.id));
  const rows = Math.max(...byCol.map((c) => c.length));
  const width = cols * W + (cols - 1) * GX + 16;
  const height = rows * H + (rows - 1) * GY + 16;
  const pos: Record<string, { x: number; y: number }> = {};
  byCol.forEach((ids, c) => {
    const colH = ids.length * H + (ids.length - 1) * GY;
    ids.forEach((id, r) => {
      pos[id] = { x: 8 + c * (W + GX), y: 8 + (height - 16 - colH) / 2 + r * (H + GY) };
    });
  });
  const crit = dag.critical ?? [];
  const isCritEdge = (a: string, b: string) => {
    const i = crit.indexOf(a);
    return i >= 0 && crit[i + 1] === b;
  };
  const total = dag.nodes.reduce((s, n) => s + (n.cost ?? 0), 0);
  const label = (s: string) => (s.length > 22 ? s.slice(0, 21) + "…" : s);

  return (
    <figure className="my-4 overflow-x-auto rounded-2xl border border-line bg-panel2 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="mx-auto block max-w-none" role="img" aria-label="Grafo de dependencias">
        <defs>
          <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="var(--muted)" />
          </marker>
          <marker id="arrc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0L10 5L0 10z" fill="var(--accent)" />
          </marker>
        </defs>
        {dag.edges.map(([a, b]) => {
          const p = pos[a];
          const q = pos[b];
          const x1 = p.x + W;
          const y1 = p.y + H / 2;
          const x2 = q.x;
          const y2 = q.y + H / 2;
          const c = isCritEdge(a, b);
          const dx = (x2 - x1) / 2;
          return <path key={a + b} d={`M${x1} ${y1} C${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2 - 2} ${y2}`} fill="none" stroke={c ? "var(--accent)" : "var(--muted)"} strokeWidth={c ? 2.5 : 1.4} opacity={c ? 1 : 0.7} markerEnd={`url(#${c ? "arrc" : "arr"})`} />;
        })}
        {dag.nodes.map((n) => {
          const p = pos[n.id];
          const c = crit.includes(n.id);
          return (
            <g key={n.id} transform={`translate(${p.x} ${p.y})`}>
              <rect width={W} height={H} rx={10} fill="var(--panel)" stroke={c ? "var(--accent)" : "var(--line)"} strokeWidth={c ? 2.5 : 1.5} />
              <text x={W / 2} y={n.cost !== undefined ? 17 : 24} textAnchor="middle" fontSize="11.5" fontWeight="700" fill="var(--fg)">{label(n.label)}</text>
              {n.cost !== undefined && <text x={W / 2} y={32} textAnchor="middle" fontSize="10.5" fill={c ? "var(--accent)" : "var(--muted)"}>costo {n.cost}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 text-center text-xs text-muted">
        {dag.caption ?? (crit.length ? `Ruta crítica resaltada: ${crit.join(" → ")}` : "Las flechas indican dependencias de datos")}
        {total > 0 && crit.length > 0 && (() => {
          const tinf = crit.reduce((s, id) => s + (dag.nodes.find((n) => n.id === id)?.cost ?? 0), 0);
          return <> · T₁ = {total}, T∞ = {tinf}, S<sub>max</sub> = {(total / tinf).toFixed(2)}</>;
        })()}
      </figcaption>
    </figure>
  );
}
