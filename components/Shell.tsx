"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Brain, Code2, Flame, Home, Layers, Moon, Presentation, Sun, Swords, Zap, ClipboardCheck } from "lucide-react";
import { useEffect } from "react";
import { Toaster } from "sonner";
import { computeStreak, useHydrated, useProgress } from "@/lib/store";
import { levelInfo } from "@/lib/levels";
import { SITE } from "@/lib/config";

const NAV = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/aprende", label: "Aprende", icon: Code2 },
  { href: "/teoria", label: "Teoría", icon: Brain },
  { href: "/problemas", label: "Retos", icon: Swords },
  { href: "/resueltos", label: "Resueltos", icon: ClipboardCheck },
  { href: "/diapos", label: "Diapos", icon: Presentation },
];

function active(path: string, href: string) {
  return href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
}

function Stats({ compact = false }: { compact?: boolean }) {
  const hydrated = useHydrated();
  const xp = useProgress((s) => s.xp);
  const activity = useProgress((s) => s.activity);
  const st = computeStreak(hydrated ? activity : {});
  const lv = levelInfo(hydrated ? xp : 0);
  if (compact)
    return (
      <Link href="/progreso" className="flex items-center gap-2 text-xs font-semibold">
        <span className="flex items-center gap-1 rounded-full bg-panel2 px-2.5 py-1 text-warn">
          <Flame size={14} />
          {st.streak}
        </span>
        <span className="flex items-center gap-1 rounded-full bg-panel2 px-2.5 py-1 text-accent">
          <Zap size={14} />
          {hydrated ? xp : 0}
        </span>
      </Link>
    );
  return (
    <Link href="/progreso" className="block rounded-2xl border border-line bg-panel2 p-3 transition hover:border-accent/60">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-muted">Nivel {lv.level}</span>
        <span className="flex items-center gap-1 font-bold text-warn">
          <Flame size={14} /> {st.streak} {st.streak === 1 ? "día" : "días"}
        </span>
      </div>
      <div className="mt-1 text-sm font-bold">{lv.name}</div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${lv.pct}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-muted">
        <span className="flex items-center gap-1"><Zap size={11} className="text-accent" />{hydrated ? xp : 0} XP</span>
        <span>{lv.next ? `${lv.toNext} para nivel ${lv.level + 1}` : "Nivel máximo"}</span>
      </div>
      <div className="mt-2 text-[11px] text-muted">
        Hoy: <b className={st.doneToday ? "text-good" : "text-fg"}>{st.todayXp}/{st.goal} XP</b> {st.doneToday ? "· meta cumplida" : ""}
      </div>
    </Link>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const theme = useProgress((s) => s.theme);
  const toggle = useProgress((s) => s.toggleTheme);
  const hydrated = useHydrated();

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  return (
    <div className="min-h-dvh md:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-5 border-r border-line bg-panel/80 p-4 backdrop-blur md:flex">
        <Link href="/" className="flex items-center gap-2.5 px-1 pt-1">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg"><Layers size={20} /></span>
          <span className="leading-tight">
            <span className="block text-base font-extrabold tracking-tight">{SITE}</span>
            <span className="block text-[11px] text-muted">CS4052 · OpenMP + U5</span>
          </span>
        </Link>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active(path, href) ? "bg-accent text-accent-fg" : "text-muted hover:bg-panel2 hover:text-fg"
              }`}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <Stats />
          <button onClick={toggle} className="flex items-center justify-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted hover:text-fg">
            {hydrated && theme === "light" ? <Moon size={14} /> : <Sun size={14} />} Tema {hydrated && theme === "light" ? "oscuro" : "claro"}
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-accent-fg"><Layers size={16} /></span>
          {SITE}
        </Link>
        <div className="flex items-center gap-2">
          <Stats compact />
          <button onClick={toggle} aria-label="Cambiar tema" className="grid h-8 w-8 place-items-center rounded-full bg-panel2 text-muted">
            {hydrated && theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </header>

      <main>{children}</main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-line bg-panel/95 backdrop-blur md:hidden">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${active(path, href) ? "text-accent" : "text-muted"}`}>
            <Icon size={19} />
            {label}
          </Link>
        ))}
      </nav>
      <Toaster position="top-center" theme={theme} richColors toastOptions={{ style: { fontFamily: "var(--font-sans)" } }} />
    </div>
  );
}

export function PageWrap({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return <div className={`mx-auto w-full px-4 pb-28 pt-5 md:px-8 md:pb-12 md:pt-8 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>{children}</div>;
}

export function PageTitle({ icon, title, sub }: { icon?: React.ReactNode; title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight md:text-3xl">
        {icon && <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent">{icon}</span>}
        {title}
      </h1>
      {sub && <p className="mt-2 max-w-2xl text-sm text-muted md:text-base">{sub}</p>}
    </div>
  );
}

export { BookOpen };
