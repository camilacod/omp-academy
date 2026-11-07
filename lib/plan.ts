/** Plan de estudio diario del 6 al 17 de noviembre (examen el 18). Cada item enlaza a contenido real. */
export type PlanKind = "diapos" | "leccion" | "teoria" | "reto" | "resuelto" | "repaso";
export interface PlanItem { kind: PlanKind; label: string; href: string; id?: string }
export interface PlanDay { date: string; title: string; focus: string; items: PlanItem[] }

const D = (id: string, label: string): PlanItem => ({ kind: "diapos", label, href: `/diapos/${id}` });
const L = (id: string, label: string): PlanItem => ({ kind: "leccion", label, href: `/aprende/${id}`, id });
const T = (id: string, label: string): PlanItem => ({ kind: "teoria", label, href: `/teoria/${id}` });
const R = (slug: string, label: string): PlanItem => ({ kind: "reto", label, href: `/problemas/${slug}`, id: slug });
const S = (slug: string, label: string): PlanItem => ({ kind: "resuelto", label, href: `/resueltos/${slug}`, id: slug });

export const PLAN: PlanDay[] = [
  {
    date: "2026-11-06", title: "Fundamentos de OpenMP", focus: "fork-join, parallel, for",
    items: [D("u4-1", "Diapos U4.1"), L("parallel", "Regiones paralelas"), L("datos-privados", "Datos privados y compartidos"), L("omp-for", "El bucle for paralelo"), T("fundamentos", "Teoría: fundamentos"), R("matvec", "Reto: matriz × vector")],
  },
  {
    date: "2026-11-07", title: "Reparto de trabajo", focus: "schedule, sections, single",
    items: [L("schedule", "schedule"), L("sections-single", "sections y single"), T("worksharing", "Teoría: trabajo compartido"), R("schedule-costos", "Reto: costos de schedule"), R("amdahl-calc", "Reto: Amdahl")],
  },
  {
    date: "2026-11-08", title: "Sincronización y reducciones", focus: "critical, atomic, reduction",
    items: [D("u4-2", "Diapos U4.2"), L("sincronizacion", "Sincronización"), L("reduction", "reduction"), T("datos", "Teoría: alcance de datos"), T("sincronizacion", "Teoría: sincronización"), R("histograma", "Reto: histograma"), S("histograma-pram", "Resuelto: histograma")],
  },
  {
    date: "2026-11-09", title: "Locks y modelo de memoria", focus: "locks, ordered, happens-before",
    items: [D("u4-4", "Diapos U4.4"), L("locks", "Locks"), L("memoria-ordered", "Memoria y ordered"), T("memoria", "Teoría: memoria"), R("ordered-log", "Reto: orden en el log"), R("inventario", "Reto: inventario"), S("inventario-carrera", "Resuelto: carrera en inventario")],
  },
  {
    date: "2026-11-10", title: "Tareas y DAG", focus: "task, taskgroup, depend",
    items: [D("u4-3", "Diapos U4.3"), L("tareas", "Tareas"), L("taskgroup", "taskgroup"), L("depend-dag", "depend y DAG"), T("tareas", "Teoría: tareas"), R("postorden", "Reto: postorden"), R("sistema-dag", "Reto: sistema DAG"), S("sistema-depend", "Resuelto: sistema con depend")],
  },
  {
    date: "2026-11-11", title: "Métricas e híbrido", focus: "Ts, T∞, Tp, S, E, MPI+OpenMP",
    items: [D("u4-5", "Diapos U4.5"), L("metricas", "Métricas de rendimiento"), L("hibrido", "Paralelismo híbrido"), T("hibrido", "Teoría: híbrido"), R("energia-cluster", "Reto: energía del clúster"), R("hibrido-reparto", "Reto: reparto híbrido"), S("energia-escalabilidad", "Resuelto: energía y escalabilidad")],
  },
  {
    date: "2026-11-12", title: "Repaso de prácticas (PD04)", focus: "resolver como en el examen",
    items: [S("cartera-gradiente", "Resuelto: cartera y gradiente"), S("sensores-dag", "Resuelto: sensores y DAG"), S("tareas-dag-2026i", "Resuelto: DAG de tareas 2026-I"), S("oparr-dag", "Resuelto: DAG con arreglos"), S("tasks-vs-sections", "Resuelto: tasks vs sections"), R("cartera", "Reto: cartera"), R("triangulo-roto", "Reto: triángulo roto"), R("sensores", "Reto: sensores")],
  },
  {
    date: "2026-11-13", title: "EDP: calor y Laplace", focus: "Jacobi, halos, stencil",
    items: [D("u5-1", "Diapos U5.1"), L("montecarlo", "Monte Carlo"), L("edp-calor", "Ecuación del calor"), T("edp", "Teoría: EDP"), R("calor-fuente", "Reto: calor con fuente"), R("laplace-jacobi", "Reto: Laplace con Jacobi"), S("calor-optimizado", "Resuelto: calor optimizado")],
  },
  {
    date: "2026-11-14", title: "Ordenamiento paralelo", focus: "quicksort, mergesort, bitónico",
    items: [D("u5-2", "Diapos U5.2"), L("quicksort-tareas", "Quicksort con tareas"), L("ordenamiento", "Ordenamiento"), T("ordenamiento", "Teoría: ordenamiento"), R("ranking-sort", "Reto: ranking sort"), R("suma-prefijos", "Reto: suma de prefijos"), S("quicksort-escalabilidad", "Resuelto: quicksort"), S("mergesort-escalabilidad", "Resuelto: mergesort")],
  },
  {
    date: "2026-11-15", title: "Búsqueda y grafos", focus: "DFS, PWS/DTS, Prim, Floyd",
    items: [D("u5-3", "Diapos U5.3"), D("u5-4", "Diapos U5.4"), L("busqueda", "Búsqueda"), L("grafos", "Grafos"), T("busqueda", "Teoría: búsqueda"), T("grafos", "Teoría: grafos"), R("primer-indice", "Reto: primer índice"), R("bfs-niveles", "Reto: BFS por niveles"), R("dijkstra", "Reto: Dijkstra")],
  },
  {
    date: "2026-11-16", title: "Simulacro", focus: "difíciles + repaso espaciado",
    items: [S("bitonico-topologias", "Resuelto: bitónico y topologías"), S("hyksort-vs-ranking", "Resuelto: HykSort vs ranking"), S("knn-paralelo", "Resuelto: KNN"), S("promedio-atomic-capture", "Resuelto: atomic capture"), R("knn", "Reto: KNN"), R("gradiente-logistico", "Reto: gradiente logístico"), { kind: "repaso", label: "Flashcards y preguntas difíciles", href: "/teoria" }],
  },
  {
    date: "2026-11-17", title: "Último repaso", focus: "flashcards vencidas y descanso",
    items: [{ kind: "repaso", label: "Flashcards del día", href: "/teoria" }, D("u4-3", "Relee: tareas y depend"), D("u5-2", "Relee: tabla de ordenamiento"), D("u5-4", "Relee: Prim, Dijkstra y Floyd")],
  },
];

export function planIndex(now = new Date()): number {
  const k = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  if (k < PLAN[0].date) return 0;
  const i = PLAN.findIndex((d) => d.date === k);
  return i >= 0 ? i : PLAN.length - 1;
}
