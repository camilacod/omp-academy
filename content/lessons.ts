import type { Lesson } from "@/lib/types";
import { lessons1 } from "./lessons-1";
import { lessons2 } from "./lessons-2";
import { lessons3 } from "./lessons-3";

export const lessons: Lesson[] = [...lessons1, ...lessons2, ...lessons3];
export const lessonById = (id: string) => lessons.find((l) => l.id === id);
export const checkpointCount = lessons.reduce((n, l) => n + l.checkpoints.length, 0);
