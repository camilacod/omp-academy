import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { PageTitle, PageWrap } from "@/components/Shell";
import { ProgressView } from "@/components/ProgressView";

export const metadata: Metadata = { title: "Progreso" };

export default function Page() {
  return (
    <PageWrap>
      <PageTitle icon={<BarChart3 />} title="Tu progreso" sub="XP, nivel, racha y actividad. Todo se guarda en este navegador; exporta un respaldo si cambias de dispositivo." />
      <ProgressView />
    </PageWrap>
  );
}
