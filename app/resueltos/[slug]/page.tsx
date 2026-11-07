import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SolvedView } from "@/components/SolvedView";
import { solved, solvedBySlug } from "@/content/solved";

export function generateStaticParams() {
  return solved.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: solvedBySlug(slug)?.title ?? "Resuelto" };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = solvedBySlug(slug);
  if (!s) notFound();
  const i = solved.findIndex((x) => x.slug === slug);
  const next = solved[i + 1];
  return <SolvedView item={s} next={next ? { slug: next.slug, title: next.title } : undefined} />;
}
