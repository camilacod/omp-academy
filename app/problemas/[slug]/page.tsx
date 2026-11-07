import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProblemView } from "@/components/ProblemView";
import { problems, problemBySlug } from "@/content/problems";

export function generateStaticParams() {
  return problems.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: problemBySlug(slug)?.title ?? "Reto" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = problemBySlug(slug);
  if (!p) notFound();
  const i = problems.findIndex((x) => x.slug === slug);
  const next = problems[i + 1];
  return <ProblemView problem={p} next={next ? { slug: next.slug, title: next.title } : undefined} />;
}
