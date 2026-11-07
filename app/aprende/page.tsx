import type { Metadata } from "next";
import { Code2 } from "lucide-react";
import { PageTitle, PageWrap } from "@/components/Shell";
import { LessonCards } from "@/components/LessonCards";
import { lessons } from "@/content/lessons";

export const metadata: Metadata = { title: "Aprende" };

export default function Page() {
  return (
    <PageWrap wide>
      <PageTitle icon={<Code2 />} title="Aprende" sub="Lecciones interactivas: teoría a la izquierda, compilador real (GCC + OpenMP) a la derecha. Completa los ejercicios para ganar XP." />
      <LessonCards lessons={lessons.map(({ id, title, unit, minutes, summary, checkpoints }) => ({ id, title, unit, minutes, summary, cps: checkpoints.map((c) => c.id) }))} />
    </PageWrap>
  );
}
