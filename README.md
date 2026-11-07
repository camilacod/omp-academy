# OMP Academy

Plataforma para estudiar **OpenMP y algoritmos paralelos** (CS4052 · Computación Paralela y Distribuida, UTEC) para el examen del 18 de noviembre.

- **Aprende**: 20 lecciones estilo Codecademy (teoría a la izquierda, compilador real a la derecha, pistas, checkpoints verificados con tests).
- **Teoría**: lecturas, preguntas con puntos y flashcards con repaso espaciado (Leitner).
- **Retos**: 24 problemas tipo LeetCode con tests ocultos, pistas y editorial con complejidad.
- **Resueltos**: 18 ejercicios de prácticas y parciales paso a paso, con DAG, Ts, T∞, Tp, S, E e isoeficiencia.
- **Diapos**: resúmenes propios de U4.1–U4.5 y U5.1–U5.4, con visor navegable.
- Inicio con cuenta regresiva, plan de estudio diario, racha, XP y niveles. El progreso se guarda en el navegador (exportable desde `/progreso`).

## Desarrollo

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
```

El código se compila en servidor con Godbolt (g++ `-O2 -std=c++17 -fopenmp`) y Wandbox como respaldo (`/api/run`).

## Verificación del contenido

```bash
npx tsx scripts/verify-solutions.ts            # todas las soluciones contra Godbolt
npx tsx scripts/verify-solutions.ts --local    # con g++ local
npx tsx scripts/verify-solutions.ts --starters # los códigos iniciales NO deben pasar
npx tsx scripts/check-links.ts                 # enlaces internos del contenido
```

## Notas

- Stack: Next.js (App Router), React 19, Tailwind v4, Zustand, CodeMirror 6, KaTeX.
- Los PDFs del curso **no** están en el repositorio; las diapos son resúmenes propios.
