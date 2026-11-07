import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { PageTitle, PageWrap } from "@/components/Shell";
import { TopicCards } from "@/components/TopicCards";
import { topics } from "@/content/theory";

export const metadata: Metadata = { title: "Teoría" };

export default function Page() {
  return (
    <PageWrap wide>
      <PageTitle icon={<Brain />} title="Teoría" sub="Lecturas cortas, preguntas con puntos (5/10/15 XP según dificultad) y flashcards con repetición espaciada." />
      <TopicCards
        topics={topics.map((t) => ({ id: t.id, title: t.title, icon: t.icon, blurb: t.blurb, q: t.questions.map((q) => q.id), c: t.cards.map((c) => c.id) }))}
      />
    </PageWrap>
  );
}
