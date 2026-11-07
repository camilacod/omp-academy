"use client";

/** Animación del modelo fork-join: el maestro crea hilos, trabajan en paralelo y esperan en la barrera. */
export function ForkJoin({ threads = 4, compact = false }: { threads?: number; compact?: boolean }) {
  const lanes = Array.from({ length: threads }, (_, i) => i);
  const widths = [62, 78, 54, 70, 66, 58, 74, 60];
  return (
    <div className={`rounded-2xl border border-line bg-panel2 ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-2 flex justify-between text-[11px] font-semibold text-muted">
        <span>maestro</span>
        <span className="text-accent">fork</span>
        <span>región paralela</span>
        <span className="text-teal">join</span>
        <span>maestro</span>
      </div>
      <div className="relative flex items-stretch gap-0">
        <div className="flex w-[12%] items-center"><div className="h-2 w-full rounded bg-fg/70" /></div>
        <div className="relative flex w-[76%] flex-col justify-center gap-1.5 border-x-2 border-dashed border-line px-1 py-2">
          {lanes.map((i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[10px] font-bold text-muted">hilo {i}</span>
              <div className="relative h-3.5 flex-1">
                <div
                  className="absolute left-0 top-0 h-full origin-left rounded"
                  style={{
                    width: `${widths[i % widths.length]}%`,
                    background: `color-mix(in srgb, var(--accent) ${100 - i * 14}%, var(--teal))`,
                    animation: `lane 6s ease-in-out ${i * 0.12}s infinite`,
                  }}
                />
              </div>
            </div>
          ))}
          <div className="absolute inset-y-0 right-0 w-0.5 bg-teal/70" />
        </div>
        <div className="flex w-[12%] items-center"><div className="h-2 w-full rounded bg-fg/70" /></div>
      </div>
      <div className="mt-2 text-center text-[11px] text-muted">
        La <b className="text-teal">barrera implícita</b> espera al hilo más lento antes de que el maestro continúe.
      </div>
    </div>
  );
}
