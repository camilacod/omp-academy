export const LEVELS = [
  { xp: 0, name: "Hilo nuevo" },
  { xp: 100, name: "Fork inicial" },
  { xp: 250, name: "Región paralela" },
  { xp: 450, name: "Dueño del schedule" },
  { xp: 700, name: "Cazador de carreras" },
  { xp: 1000, name: "Crítico atómico" },
  { xp: 1400, name: "Domador de tareas" },
  { xp: 1900, name: "Arquitecto de DAGs" },
  { xp: 2500, name: "Señor del speedup" },
  { xp: 3200, name: "Maestro del fork-join" },
];

export function levelInfo(xp: number) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].xp) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1];
  const pct = next ? ((xp - cur.xp) / (next.xp - cur.xp)) * 100 : 100;
  return { level: idx + 1, name: cur.name, next, pct, toNext: next ? next.xp - xp : 0 };
}
