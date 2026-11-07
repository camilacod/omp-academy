import type { Metadata } from "next";
import { Suspense } from "react";
import { ClipboardCheck } from "lucide-react";
import { PageTitle, PageWrap } from "@/components/Shell";
import { SolvedList } from "@/components/SolvedList";
import { solved } from "@/content/solved";
import { topics } from "@/content/theory";

export const metadata: Metadata = { title: "Resueltos" };

export default function Page() {
  return (
    <PageWrap wide>
      <PageTitle icon={<ClipboardCheck />} title="Ejercicios resueltos" sub="Prácticas dirigidas y parcial resueltos paso a paso, con DAG, código y métricas (Ts, T∞, Tp, S, E, isoeficiencia). +10 XP por cada uno que leas." />
      <Suspense>
        <SolvedList
          items={solved.map((s) => ({ slug: s.slug, title: s.title, source: s.source, topic: s.topic, diff: s.diff, hasDag: s.steps.some((x) => x.dag) }))}
          topics={topics.map((t) => ({ id: t.id, title: t.title, icon: t.icon }))}
        />
      </Suspense>
    </PageWrap>
  );
}
