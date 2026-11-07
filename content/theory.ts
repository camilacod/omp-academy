import type { Topic } from "@/lib/types";
import { theory1 } from "./theory-1";
import { theory2 } from "./theory-2";
import { theory3 } from "./theory-3";

// En las preguntas/tarjetas (strings normales) § se usa como atajo de ` (backtick)
const fix = (s: string) => s.replaceAll("§", "`");

export const topics: Topic[] = [...theory1, ...theory2, ...theory3].map((t) => ({
  ...t,
  questions: t.questions.map((q) => ({
    ...q,
    q: fix(q.q),
    options: q.options?.map(fix),
    explain: fix(q.explain),
  })),
  cards: t.cards.map((c) => ({ ...c, front: fix(c.front), back: fix(c.back) })),
}));

export const topicById = (id: string) => topics.find((t) => t.id === id);
export const QUESTION_XP = { facil: 5, medio: 10, dificil: 15 } as const;
