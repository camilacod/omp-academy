"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DAILY_GOAL_XP } from "./config";

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const DAY_MS = 86400000;
const LEITNER_DAYS = [0, 0, 1, 2, 4, 8]; // caja 1..5

export interface CardState {
  box: number; // 1..5
  due: string; // yyyy-mm-dd
}

interface ProgressState {
  xp: number;
  activity: Record<string, number>; // xp ganado por día
  cps: Record<string, { xp: number; hints: number; solution: boolean }>; // `${lesson}/${cp}`
  problems: Record<string, "intentado" | "resuelto">;
  problemXp: Record<string, number>;
  solvedRead: Record<string, boolean>;
  questions: Record<string, { ok: boolean; tries: number }>;
  cards: Record<string, CardState>;
  hintsUsed: Record<string, number>; // por cp/problema
  drafts: Record<string, string>;
  theme: "dark" | "light";
  addXp: (n: number) => void;
  completeCheckpoint: (key: string, xp: number, hints: number, solution: boolean) => number;
  setHints: (key: string, n: number) => void;
  markProblem: (slug: string, st: "intentado" | "resuelto", xp?: number) => number;
  markSolvedRead: (slug: string) => void;
  answerQuestion: (id: string, ok: boolean, xp: number) => number;
  reviewCard: (id: string, known: boolean) => number;
  setDraft: (key: string, code: string) => void;
  clearDraft: (key: string) => void;
  toggleTheme: () => void;
  exportData: () => string;
  importData: (json: string) => boolean;
  reset: () => void;
}

const initial = {
  xp: 0,
  activity: {} as Record<string, number>,
  cps: {},
  problems: {},
  problemXp: {},
  solvedRead: {},
  questions: {},
  cards: {},
  hintsUsed: {},
  drafts: {},
  theme: "dark" as const,
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initial,
      addXp: (n) =>
        set((s) => {
          const k = todayKey();
          return { xp: s.xp + n, activity: { ...s.activity, [k]: (s.activity[k] ?? 0) + n } };
        }),
      completeCheckpoint: (key, xp, hints, solution) => {
        const s = get();
        if (s.cps[key]) return 0;
        set({ cps: { ...s.cps, [key]: { xp, hints, solution } } });
        get().addXp(xp);
        return xp;
      },
      setHints: (key, n) => set((s) => ({ hintsUsed: { ...s.hintsUsed, [key]: n } })),
      markProblem: (slug, st, xp = 0) => {
        const s = get();
        if (s.problems[slug] === "resuelto") return 0;
        set({
          problems: { ...s.problems, [slug]: st },
          problemXp: st === "resuelto" ? { ...s.problemXp, [slug]: xp } : s.problemXp,
        });
        if (st === "resuelto" && xp) get().addXp(xp);
        return st === "resuelto" ? xp : 0;
      },
      markSolvedRead: (slug) => {
        const s = get();
        if (s.solvedRead[slug]) return;
        set({ solvedRead: { ...s.solvedRead, [slug]: true } });
        get().addXp(10);
      },
      answerQuestion: (id, ok, xp) => {
        const s = get();
        const prev = s.questions[id];
        const tries = (prev?.tries ?? 0) + 1;
        const gain = ok && !prev?.ok ? xp : 0;
        set({ questions: { ...s.questions, [id]: { ok: prev?.ok || ok, tries } } });
        if (gain) get().addXp(gain);
        return gain;
      },
      reviewCard: (id, known) => {
        const s = get();
        const prev = s.cards[id];
        const box = known ? Math.min(5, (prev?.box ?? 1) + 1) : 1;
        const due = todayKey(new Date(Date.now() + LEITNER_DAYS[box] * DAY_MS));
        set({ cards: { ...s.cards, [id]: { box, due } } });
        const gain = known && !prev ? 2 : known ? 1 : 0;
        if (gain) get().addXp(gain);
        return gain;
      },
      setDraft: (key, code) => set((s) => ({ drafts: { ...s.drafts, [key]: code } })),
      clearDraft: (key) =>
        set((s) => {
          const d = { ...s.drafts };
          delete d[key];
          return { drafts: d };
        }),
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      exportData: () => {
        const { xp, activity, cps, problems, problemXp, solvedRead, questions, cards, hintsUsed, drafts, theme } = get();
        return JSON.stringify({ v: 1, xp, activity, cps, problems, problemXp, solvedRead, questions, cards, hintsUsed, drafts, theme }, null, 2);
      },
      importData: (json) => {
        try {
          const d = JSON.parse(json);
          if (typeof d !== "object" || d === null || typeof d.xp !== "number") return false;
          set({ ...initial, ...d });
          return true;
        } catch {
          return false;
        }
      },
      reset: () => set({ ...initial }),
    }),
    {
      name: "omp-academy-v1",
      storage: createJSONStorage(() => localStorage),
      skipHydration: false,
    },
  ),
);

export function computeStreak(activity: Record<string, number>) {
  const goal = DAILY_GOAL_XP;
  let streak = 0;
  const d = new Date();
  // si hoy aún no cumple la meta, la racha cuenta desde ayer
  if ((activity[todayKey(d)] ?? 0) < goal) d.setDate(d.getDate() - 1);
  while ((activity[todayKey(d)] ?? 0) >= goal) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  const todayXp = activity[todayKey()] ?? 0;
  return { streak, todayXp, goal, doneToday: todayXp >= goal };
}

/** Evita desajuste de hidratación: devuelve false en servidor y primer render */
import { useSyncExternalStore } from "react";
const subscribe = () => () => {};
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
