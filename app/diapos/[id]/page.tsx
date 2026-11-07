import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DeckViewer } from "@/components/DeckViewer";
import { deckById, decks } from "@/content/slides";

export function generateStaticParams() {
  return decks.map((d) => ({ id: d.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const d = deckById(id);
  return { title: d ? `${d.unit} · ${d.title}` : "Diapos" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = deckById(id);
  if (!d) notFound();
  const i = decks.findIndex((x) => x.id === id);
  const p = decks[i - 1];
  const n = decks[i + 1];
  return <DeckViewer deck={d} prev={p && { id: p.id, unit: p.unit }} next={n && { id: n.id, unit: n.unit }} />;
}
