import type { Expect } from "@/lib/types";
import expected from "./problems-expected.json";

const E = expected as Record<string, string>;
/** Salida esperada exacta (generada con la solución de referencia con 1 hilo; ver scripts/gen-expected.ts) */
export const X = (slug: string, i: number): Expect => ({ kind: "exact", value: E[`${slug}#${i}`] ?? "" });

/** Compara cada par clave=valor numérico con tolerancia (para resultados con coma flotante) */
export const N = (slug: string, i: number, tol: number): Expect[] => {
  const out = E[`${slug}#${i}`] ?? "";
  const res: Expect[] = [];
  for (const m of out.matchAll(/([A-Za-z_][\w.]*)=(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)/g)) {
    res.push({ kind: "num", re: `${m[1].replace(/\./g, "\\.")}=(-?[0-9.eE+-]+)`, value: parseFloat(m[2]), tol });
  }
  return res;
};
