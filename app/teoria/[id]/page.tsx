import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TopicView } from "@/components/TopicView";
import { topics, topicById } from "@/content/theory";
import { lessons } from "@/content/lessons";

export function generateStaticParams() {
  return topics.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: topicById(id)?.title ?? "Teoría" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const topic = topicById(id);
  if (!topic) notFound();
  const related = lessons.filter((l) => l.topic === id).map((l) => ({ id: l.id, title: l.title }));
  return <TopicView topic={topic} lessons={related} />;
}
