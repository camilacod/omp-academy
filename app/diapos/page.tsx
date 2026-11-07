import type { Metadata } from "next";
import Link from "next/link";
import { Presentation } from "lucide-react";
import { PageTitle, PageWrap } from "@/components/Shell";
import { decks } from "@/content/slides";

export const metadata: Metadata = { title: "Diapos" };

export default function Page() {
  const groups = [
    { name: "Unidad 4 · Comunicación y coordinación (OpenMP)", items: decks.filter((d) => d.id.startsWith("u4")) },
    { name: "Unidad 5 · Algoritmos paralelos", items: decks.filter((d) => d.id.startsWith("u5")) },
  ];
  return (
    <PageWrap wide>
      <PageTitle icon={<Presentation />} title="Diapos" sub="Resúmenes slide a slide de cada clase, con fórmulas, código y enlaces a la práctica. Navega con ← → o desliza." />
      {groups.map((g) => (
        <section key={g.name} className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">{g.name}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {g.items.map((d) => (
              <Link key={d.id} href={`/diapos/${d.id}`} className="group rounded-2xl border border-line bg-panel p-4 transition hover:-translate-y-0.5 hover:border-accent/60">
                <div className="flex items-center gap-2 text-[11px] font-bold">
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-accent">{d.unit}</span>
                  <span className="text-muted">{d.slides.length} diapositivas</span>
                </div>
                <div className="mt-2 font-bold leading-snug group-hover:text-accent">{d.title}</div>
                <div className="mt-1 line-clamp-2 text-xs text-muted">{d.slides.slice(0, 4).map((s) => s.title).join(" · ")}…</div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </PageWrap>
  );
}
