import { HomeView, type HomeData } from "@/components/HomeView";
import { lessons } from "@/content/lessons";
import { problems } from "@/content/problems";
import { solved } from "@/content/solved";
import { topics } from "@/content/theory";
import { decks } from "@/content/slides";

export default function Home() {
  const data: HomeData = {
    lessons: lessons.map((l) => ({ id: l.id, title: l.title, unit: l.unit, minutes: l.minutes, cps: l.checkpoints.map((c) => c.id) })),
    problemSlugs: problems.map((p) => p.slug),
    solvedSlugs: solved.map((s) => s.slug),
    questionIds: topics.flatMap((t) => t.questions.map((q) => q.id)),
    cardIds: topics.flatMap((t) => t.cards.map((c) => c.id)),
    decks: decks.length,
    topics: topics.length,
  };
  return <HomeView data={data} />;
}
