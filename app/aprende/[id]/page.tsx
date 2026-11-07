import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LessonView } from "@/components/LessonView";
import { lessons, lessonById } from "@/content/lessons";

export function generateStaticParams() {
  return lessons.map((l) => ({ id: l.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: lessonById(id)?.title ?? "Lección" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = lessonById(id);
  if (!lesson) notFound();
  const idx = lessons.findIndex((l) => l.id === id);
  const nx = lessons[idx + 1];
  return <LessonView lesson={lesson} next={nx ? { id: nx.id, title: nx.title } : undefined} />;
}
