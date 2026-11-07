import type { Metadata } from "next";
import { Suspense } from "react";
import { Swords } from "lucide-react";
import { PageTitle, PageWrap } from "@/components/Shell";
import { ProblemList } from "@/components/ProblemList";
import { problems } from "@/content/problems";
import { topics } from "@/content/theory";

export const metadata: Metadata = { title: "Retos" };

export default function Page() {
  return (
    <PageWrap wide>
      <PageTitle icon={<Swords />} title="Retos" sub="Problemas estilo LeetCode con tests ocultos, pistas y editorial con análisis de complejidad. 50 / 100 / 150 XP." />
      <Suspense>
        <ProblemList
          problems={problems.map((p) => ({ slug: p.slug, title: p.title, topic: p.topic, diff: p.diff, source: p.source }))}
          topics={topics.map((t) => ({ id: t.id, title: t.title, icon: t.icon }))}
        />
      </Suspense>
    </PageWrap>
  );
}
