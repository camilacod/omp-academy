import type { Solved } from "@/lib/types";
import { solved1 } from "./solved-1";
import { solved2 } from "./solved-2";

export const solved: Solved[] = [...solved1, ...solved2];
export const solvedBySlug = (slug: string) => solved.find((s) => s.slug === slug);
