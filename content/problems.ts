import type { Problem } from "@/lib/types";
import { problems1 } from "./problems-1";
import { problems2 } from "./problems-2";
import { problems3 } from "./problems-3";


/** Orden de presentación: por dificultad y luego por aparición */
const order = { facil: 0, medio: 1, dificil: 2 } as const;

export const problems: Problem[] = [...problems1, ...problems2, ...problems3]
  .sort((a, b) => order[a.diff] - order[b.diff]);

export const problemBySlug = (slug: string) => problems.find((p) => p.slug === slug);
export const PROBLEM_XP = { facil: 50, medio: 100, dificil: 150 } as const;
