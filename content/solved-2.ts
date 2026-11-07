import { md, code } from "@/lib/md";
import type { Solved } from "@/lib/types";

export const solved2: Solved[] = [
  {
    slug: "histograma-pram",
    title: "Histograma: reduction, atomic y PRAM",
    source: "PD04 2025-II (S2) · Ejercicio 1",
    topic: "sincronizacion",
    diff: "facil",
    statement: md`
Dado un arreglo de $N$ muestras $x_i\in[0,B-1]$, calcula el histograma $H[0..B-1]$. 1.1 Con §reduction§. 1.2 Con §atomic§. 1.3 Escribe un algoritmo **PRAM** para uno de los casos.`,
    steps: [
      {
        title: "1.1 Con reduction",
        body: "Cada hilo trabaja con su propio histograma (copia privada inicializada en 0) y al final se suman. Sin contención en el bucle caliente.",
        code: code`
long H[B] = {0};
#pragma omp parallel for reduction(+:H[:B])
for (long i = 0; i < N; i++)
    H[x[i]]++;
`,
      },
      {
        title: "1.2 Con atomic",
        body: md`
Un único histograma compartido; cada incremento es atómico. Es correcto pero con **pocos bins** hay mucha contención (muchos hilos pelean por las mismas direcciones y por las mismas líneas de caché).`,
        code: code`
long H[B] = {0};
#pragma omp parallel for
for (long i = 0; i < N; i++) {
    #pragma omp atomic
    H[x[i]]++;
}
`,
      },
      {
        title: "1.3 PRAM (caso reduction)",
        body: md`
Se usan $P$ procesadores y un histograma local por procesador. Fase de conteo: cada uno recorre $N/P$ elementos. Fase de combinación: por cada bin, una suma en árbol.`,
        code: code`
Algoritmo Histograma-PRAM(x[0..N-1], B, P)           // EREW
1. for p = 0 to P-1 pardo
2.     Hloc[p][b] <- 0  para b = 0..B-1
3.     for i = p*N/P to (p+1)*N/P - 1
4.         Hloc[p][ x[i] ] <- Hloc[p][ x[i] ] + 1      // sin conflicto: Hloc es privado
5. for b = 0 to B-1 pardo                              // un grupo de P procesadores por bin
6.     H[b] <- SUMA-ARBOL( Hloc[0..P-1][b] )           // log P pasos
7. verificación: sum_b H[b] = N
`,
      },
      {
        title: "Análisis",
        body: md`
- Conteo: $O(N/P)$. Combinación: $O(\log P)$ con $BP$ procesadores (o $O(B\log P/p)$ con $p$ reales).
- $T_p=O\!\left(\dfrac{N}{P}+\log P\right)$ y $T_s=\Theta(N)$ ⇒ $S\approx P$ si $N\gg P\log P$.
- Memoria extra $O(PB)$.
- Con **atomic** el costo es $O(N/P)$ más la serialización de los conflictos: si hay $B$ bins y $P$ hilos, en cada bin llegan $\approx N/B$ incrementos que se serializan → $T_p\ge N/B$ en el peor caso: **no escala** cuando $B$ es pequeño.
- **Isoeficiencia (reduction):** $T_o=pT_p-T_s=P\log P$ ⇒ $N=\Theta(P\log P)$.`,
      },
    ],
    complexity: [
      { label: "Ts", value: "Θ(N)" },
      { label: "Tp (reduction)", value: "Θ(N/P + log P)" },
      { label: "Tp (atomic)", value: "Θ(N/P) + serialización por bin" },
      { label: "Isoeficiencia", value: "N = Θ(P log P)" },
    ],
    result: "Reduction de arreglo (o histogramas locales en PRAM); atomic sufre contención con pocos bins.",
  },
  {
    slug: "gradiente-logistica",
    title: "Gradiente logístico: reduction vs critical vs atomic",
    source: "PD04 2025-II (S1) · Ejercicio 1",
    topic: "sincronizacion",
    diff: "medio",
    statement: md`
Regresión logística con $n$ muestras y $d$ características ($n\gg d$): $z=w^\top x_i$, $p=\sigma(z)$, $err=p-y_i$, $loss$ acumulada y gradiente $\nabla_j=\frac1n\sum_i err\cdot X_{ij}$. Paraleliza con (1.1) **reduction**, (1.2) **critical**, (1.3) **atomic**; compara rendimiento y valida con el secuencial.`,
    steps: [
      {
        title: "Decisión: qué bucle paralelizar",
        body: md`
Se paraleliza el bucle de **muestras** ($n$): trabajo $O(nd)$ repartible y hay más iteraciones que hilos. El bucle de características ($d$ pequeño) tendría un overhead de fork/join por muestra mayor que el trabajo útil. El **gradiente y la pérdida** son acumuladores compartidos → hay que sincronizar o reducir.`,
      },
      {
        title: "1.1 reduction (la mejor)",
        body: "Cada hilo acumula en copias privadas de §loss§ y §grad§; se combinan al final en $O(d\\log p)$.",
        code: code`
#pragma omp parallel for reduction(+:loss, grad[:d])
for (int i = 0; i < n; i++) {
    double z = 0;
    for (int j = 0; j < d; j++) z += w[j] * X[i][j];
    double p = 1.0 / (1.0 + exp(-z)), err = p - y[i];
    loss -= y[i]*log(p+eps) + (1-y[i])*log(1-p+eps);
    for (int j = 0; j < d; j++) grad[j] += err * X[i][j];
}
`,
      },
      {
        title: "1.2 critical",
        body: md`
Cada hilo calcula su aporte a un arreglo local y entra a la sección crítica **una vez por muestra** (o por bloque) para sumarlo al global. Correcto, pero la sección es **serial**: $n$ entradas de costo $O(d)$.`,
        code: code`
#pragma omp parallel for
for (int i = 0; i < n; i++) {
    double loc[D]; double err = ...;          // trabajo privado
    #pragma omp critical
    { for (int j = 0; j < d; j++) grad[j] += err * X[i][j]; loss += ...; }
}
`,
      },
      {
        title: "1.3 atomic",
        body: md`
Cada §grad[j] +=§ es una actualización atómica. Menos bloqueo que critical (sólo se serializan accesos al *mismo* $j$), pero hay $nd$ operaciones atómicas con **contención** (los $d$ componentes son pocos y compartidos). Además §atomic§ no puede proteger varias variables como una unidad.`,
        code: code`
#pragma omp parallel for
for (int i = 0; i < n; i++) {
    double err = ...;
    for (int j = 0; j < d; j++) {
        #pragma omp atomic
        grad[j] += err * X[i][j];
    }
    #pragma omp atomic
    loss += ...;
}
`,
      },
      {
        title: "Comparación",
        body: md`
| Versión | Costo paralelo | Observaciones |
|---|---|---|
| reduction | $\Theta(nd/p+d\log p)$ | Casi lineal. Memoria $O(pd)$. |
| critical | $\Theta(nd/p + n\,d)$ | Serial en la sección crítica: $S\to$ constante. |
| atomic | $\Theta(nd/p + \text{contención})$ | Intermedia; depende de $d$ y $p$. |

**Validez:** la suma en coma flotante **no es asociativa**: los resultados paralelos pueden diferir del secuencial en los últimos dígitos (≈ $10^{-12}$ relativo). Se valida con una tolerancia, no con igualdad exacta.`,
      },
    ],
    complexity: [
      { label: "Ts", value: "Θ(n·d)" },
      { label: "Tp (reduction)", value: "Θ(n·d/p + d·log p)" },
      { label: "Tp (critical)", value: "≈ Ts (serial)" },
      { label: "Validación", value: "|res_par − res_sec| < ε (no asociatividad FP)" },
    ],
    result: "reduction ≫ atomic > critical; validar con tolerancia por la no asociatividad de la suma en FP.",
  },
  {
    slug: "triangulo-roto",
    title: "Triángulo roto (Monte Carlo en paralelo)",
    source: "PD04 2025-II · Ejercicio 2",
    topic: "datos",
    diff: "medio",
    statement: md`
Dos puntos aleatorios en $[0,1]$ dividen el intervalo en tres segmentos. a) ¿Probabilidad de que formen triángulo? b) ¿Y de que sea obtuso? Resuelve con Monte Carlo paralelo; explica cómo garantizas números aleatorios distintos por hilo y describe el overhead.`,
    steps: [
      {
        title: "Resultados teóricos",
        body: md`
Triángulo si $\max(s_1,s_2,s_3)<0.5$: $P=1/4$. Obtuso si $2s_{max}^2>s_1^2+s_2^2+s_3^2$. Condicionado al triángulo: $P(\text{acutángulo})=4(3\ln2-2)\approx0.318$, luego **$P(\text{obtuso}\mid\text{triángulo})\approx0.682$** (≈ 0.17 sobre el total).`,
      },
      {
        title: "Código paralelo",
        body: "Región paralela con semilla privada (§rand_r§) y reducción de contadores.",
        code: code`
#pragma omp parallel reduction(+:tri, obt)
{
    unsigned seed = 12345u + 7919u * omp_get_thread_num();
    #pragma omp for
    for (long k = 0; k < n; k++) {
        double u = rand_r(&seed) / (double)RAND_MAX;
        double v = rand_r(&seed) / (double)RAND_MAX;
        double s1 = fmin(u, v), s2 = fabs(u - v), s3 = 1 - fmax(u, v);
        double m = fmax(s1, fmax(s2, s3));
        if (m < 0.5) { tri++; if (2*m*m > s1*s1 + s2*s2 + s3*s3) obt++; }
    }
}
`,
      },
      {
        title: "Números aleatorios distintos por hilo",
        body: md`
§rand()§ comparte un estado global: con varios hilos hay **carrera** (o un lock interno que serializa) y la secuencia resultante está correlacionada. Se usa **un generador por hilo** con semilla distinta (§rand_r(&seed)§, semilla = f(id del hilo)). En rigor, semillas "cercanas" pueden dar flujos correlacionados: la solución robusta es un PRNG con **salto (jump-ahead / leapfrog)** o generadores como *xoshiro* con semillas decorrelacionadas.`,
      },
      {
        title: "Overhead y mejoras",
        body: md`
- Creación/destrucción del equipo de hilos: una sola vez ($O(p)$).
- Reducción de 2 contadores: $O(\log p)$.
- El resto es trabajo útil: *embarrassingly parallel*. $T_p=\Theta(n/p+\log p)$, $E\approx1$ para $n\gg p\log p$.
- Los resultados paralelo/secuencial coinciden **estadísticamente** (error $\propto 1/\sqrt n$), no bit a bit, porque el flujo de números cambia con $p$.
- **Optimizable:** (i) evitar §fmin§/§fmax§ y comparar con cuadrados; (ii) usar PRNG vectorizable; (iii) estimar con **varianza reducida** (muestreo estratificado) para necesitar menos muestras.`,
      },
    ],
    complexity: [
      { label: "P(triángulo)", value: "1/4" },
      { label: "P(obtuso | triángulo)", value: "9 − 12 ln 2 ≈ 0.682" },
      { label: "Tp", value: "Θ(n/p + log p)" },
      { label: "Error estadístico", value: "∝ 1/√n (independiente de p)" },
    ],
    result: "P(triángulo) = 0.25, P(obtuso|triángulo) ≈ 0.682; semilla privada por hilo + reduction.",
  },
  {
    slug: "sistema-depend",
    title: "sistema(): DAG y tareas con depend",
    source: "PD04 2025-II (S1) · Ejercicio 3",
    topic: "tareas",
    diff: "medio",
    statement: md`
§§§
double sistema() {
    double A[n][n], B[n][n], a, b, x, y, z;
    ini(A, B);
    a  = tarea_1(A);
    b  = tarea_2(B);
    s1 = suma_prefijos1(B, a);
    s2 = suma_prefijos2(B, a, b);
    z  = s1 + s2;
    return z;
}
§§§
Genera un código OpenMP con **tasks y depend** y dibuja el DAG.`,
    steps: [
      {
        title: "DAG",
        body: md`
- §ini§ escribe $A$ y $B$ ⇒ todo depende de él.
- §tarea_1§ lee $A$, §tarea_2§ lee $B$: **independientes** entre sí.
- §s1§ necesita $B$ y $a$ (no necesita $b$ ⇒ puede empezar sin esperar a tarea_2).
- §s2§ necesita $B$, $a$ y $b$.
- §z§ necesita §s1§ y §s2§.`,
        dag: {
          nodes: [
            { id: "ini", label: "ini(A,B)", cost: 1 },
            { id: "t1", label: "tarea_1 → a", cost: 1 },
            { id: "t2", label: "tarea_2 → b", cost: 1 },
            { id: "s1", label: "prefijos1 → s1", cost: 1 },
            { id: "s2", label: "prefijos2 → s2", cost: 1 },
            { id: "z", label: "z = s1+s2", cost: 0 },
          ],
          edges: [["ini", "t1"], ["ini", "t2"], ["t1", "s1"], ["t1", "s2"], ["t2", "s2"], ["s1", "z"], ["s2", "z"]],
          critical: ["ini", "t1", "s2", "z"],
          caption: "Con costos unitarios: T1 = 5, T∞ = 3 (+ z) ⇒ Smax ≈ 5/3",
        },
      },
      {
        title: "Código con depend",
        body: "Un hilo crea todas las tareas; las dependencias se expresan sobre las variables que se escriben/leen.",
        code: code`
#pragma omp parallel
#pragma omp single
{
    #pragma omp task depend(out: A[0][0], B[0][0])
    ini(A, B);
    #pragma omp task depend(in: A[0][0]) depend(out: a)
    a = tarea_1(A);
    #pragma omp task depend(in: B[0][0]) depend(out: b)
    b = tarea_2(B);
    #pragma omp task depend(in: B[0][0], a) depend(out: s1)
    s1 = suma_prefijos1(B, a);
    #pragma omp task depend(in: B[0][0], a, b) depend(out: s2)
    s2 = suma_prefijos2(B, a, b);
    #pragma omp task depend(in: s1, s2) depend(out: z)
    z = s1 + s2;
    #pragma omp taskwait
}
`,
      },
      {
        title: "Métricas",
        body: md`
Con costos unitarios (ini = t1 = t2 = s1 = s2 = 1, z ≈ 0): $T_1=5$; caminos: ini→t1→s1→z = 3; ini→t1→s2→z = 3; ini→t2→s2→z = 3 ⇒ $T_\infty=3$, $S_{max}=5/3\approx1.67$ con 2 hilos (ini, {t1,t2}, {s1,s2}). **Más de 2 hilos no ayudan** (anchura máxima del DAG = 2).`,
      },
    ],
    complexity: [
      { label: "T1", value: "5 unidades" },
      { label: "T∞", value: "3 unidades" },
      { label: "Smax", value: "5/3 ≈ 1.67" },
      { label: "Anchura del DAG", value: "2 (hilos útiles)" },
    ],
    result: "5 tareas con depend; speedup máximo 5/3 con 2 hilos.",
  },
  {
    slug: "oparr-dag",
    title: "OpArr(): DAG con quicksort, scan y bucles anidados",
    source: "PD04 2025-II (S2) · Ejercicio 3",
    topic: "tareas",
    diff: "dificil",
    statement: md`
§§§
double OpArr(double A[], double B[], double C[], int n) {
    suma_de_prefijos(A, n);          // t1
    quicksort(B, n);                  // t2
    scan_left(C + x, n);              // t3
    for i<n { s1=0; for j: s1 += A[j]*B[j]; for j: A[j] *= s1; }   // t4
    for i<n { s2=0; for j: s2 += B[j]*C[j]; for j: C[j] *= s2; }   // t5
    a = s1 / s2; res = 0;
    for i<n: res += a * C[i];                                       // t6
    return res;
}
§§§
Genera un código OMP con tasks y depend y su DAG.`,
    steps: [
      {
        title: "Análisis de datos",
        body: md`
| Tarea | Lee | Escribe |
|---|---|---|
| t1 prefijos | A | A |
| t2 quicksort | B | B |
| t3 scan_left | C | C |
| t4 | A, B | A, s1 |
| t5 | B, C | C, s2 |
| t6 final | s1, s2, C | res |

t1, t2 y t3 son **independientes**; t4 necesita t1 y t2; t5 necesita t2 y t3; t6 necesita t4 y t5.`,
        dag: {
          nodes: [
            { id: "t1", label: "t1 prefijos(A)", cost: 1 },
            { id: "t2", label: "t2 quicksort(B)", cost: 3 },
            { id: "t3", label: "t3 scan(C)", cost: 1 },
            { id: "t4", label: "t4 (A,B) → s1", cost: 5 },
            { id: "t5", label: "t5 (B,C) → s2", cost: 5 },
            { id: "t6", label: "t6 final", cost: 1 },
          ],
          edges: [["t1", "t4"], ["t2", "t4"], ["t2", "t5"], ["t3", "t5"], ["t4", "t6"], ["t5", "t6"]],
          critical: ["t2", "t4", "t6"],
          caption: "Costos ilustrativos (t2 ≈ n log n, t4, t5 ≈ n²): la ruta crítica pasa por quicksort y t4/t5.",
        },
      },
      {
        title: "Código",
        body: "§t4§ y §t5§ **modifican** A y C respectivamente: usan §inout§. §s1§ y §s2§ son escalares escritos por t4 y t5.",
        code: code`
#pragma omp parallel
#pragma omp single
{
    #pragma omp task depend(inout: A[0])
    suma_de_prefijos(A, n);
    #pragma omp task depend(inout: B[0])
    quicksort(B, n);
    #pragma omp task depend(inout: C[0])
    scan_left(C + x, n);

    #pragma omp task depend(in: B[0]) depend(inout: A[0]) depend(out: s1)
    tarea4(A, B, n, &s1);
    #pragma omp task depend(in: B[0]) depend(inout: C[0]) depend(out: s2)
    tarea5(B, C, n, &s2);

    #pragma omp task depend(in: s1, s2, C[0]) depend(out: res)
    res = final(s1, s2, C, n);
    #pragma omp taskwait
}
`,
      },
      {
        title: "Métricas",
        body: md`
Costos: $T_{qs}=n\log n$, $T_4=T_5=2n^2$ (dos bucles de $n$ por iteración), $T_{prefijos}=T_{scan}=n$, $T_6=n$.

- $T_1=2n+n\log n+4n^2+n$.
- $T_\infty=T_{qs}+T_4+T_6=n\log n+2n^2+n$ (t4 y t5 corren en paralelo).
- Paralelismo $\frac{T_1}{T_\infty}\to 2$ (≈ dos hilos útiles: t4 ∥ t5).

**Mejora:** los bucles de t4 y t5 pueden paralelizarse **internamente** (reducciones para $s_1,s_2$) y bajar $T_\infty$; el DAG de tareas sólo ofrece paralelismo de grano grueso.`,
      },
    ],
    complexity: [
      { label: "T1", value: "O(n² + n log n)" },
      { label: "T∞", value: "O(n log n + n²) ≈ T1/2" },
      { label: "Paralelismo", value: "≈ 2 (t4 ∥ t5)" },
      { label: "Dependencias", value: "inout sobre A y C (t4, t5); in sobre B" },
    ],
    result: "Tareas de grano grueso: speedup ≈ 2; para más, paralelizar dentro de t4 y t5.",
  },
  {
    slug: "tasks-vs-sections",
    title: "sections vs tasks: min, max, z, y, x, v",
    source: "PD04 2025-I · Ejercicio 2 / PD05 2026-I · Ejercicio 2",
    topic: "tareas",
    diff: "medio",
    statement: md`
§§§
min_x = minimo(x, n);        max_x = maximo(x, n);
calculo_z(z, min_x, max_x, n);
calculo_y(y, x, n);
calculo_x(x, y, n);
calculo_v(v, z, x);
§§§
Sólo el primer argumento de las funciones §calculo§ se modifica. Dibuja el DAG y paraleliza con **sections** y con **tasks**; compara.`,
    steps: [
      {
        title: "DAG",
        body: md`
- §z§ necesita §min_x§ y §max_x§.
- §y§ lee §x§ (original).
- §calculo_x§ **modifica** §x§: debe esperar a que §min_x§, §max_x§ y §calculo_y§ terminen de **leer** el $x$ original (dependencia WAR/anti), y necesita $y$.
- §v§ necesita §z§ y el nuevo §x§.`,
        dag: {
          nodes: [
            { id: "min", label: "min_x" },
            { id: "max", label: "max_x" },
            { id: "y", label: "calculo_y" },
            { id: "z", label: "calculo_z" },
            { id: "x", label: "calculo_x" },
            { id: "v", label: "calculo_v" },
          ],
          edges: [["min", "z"], ["max", "z"], ["min", "x"], ["max", "x"], ["y", "x"], ["z", "v"], ["x", "v"]],
        },
      },
      {
        title: "Con sections",
        body: md`
Las secciones no expresan dependencias: hay que **agrupar por niveles** y cada §parallel sections§ termina en una **barrera implícita**.`,
        code: code`
#pragma omp parallel sections
{
    #pragma omp section
    min_x = minimo(x, n);
    #pragma omp section
    max_x = maximo(x, n);
    #pragma omp section
    calculo_y(y, x, n);
}                                  // barrera: espera a las tres
#pragma omp parallel sections
{
    #pragma omp section
    calculo_z(z, min_x, max_x, n);
    #pragma omp section
    calculo_x(x, y, n);
}                                  // barrera
calculo_v(v, z, x);
`,
      },
      {
        title: "Con tasks y depend",
        body: "Cada tarea declara lo que lee y escribe; el runtime construye el DAG exacto.",
        code: code`
#pragma omp parallel
#pragma omp single
{
    #pragma omp task depend(out: min_x)
    min_x = minimo(x, n);
    #pragma omp task depend(out: max_x)
    max_x = maximo(x, n);
    #pragma omp task depend(in: x[0]) depend(out: y[0])
    calculo_y(y, x, n);
    #pragma omp task depend(in: min_x, max_x) depend(out: z[0])
    calculo_z(z, min_x, max_x, n);
    #pragma omp task depend(in: min_x, max_x, y[0]) depend(inout: x[0])
    calculo_x(x, y, n);
    #pragma omp task depend(in: z[0], x[0])
    calculo_v(v, z, x);
}
`,
      },
      {
        title: "Comparación",
        body: md`
| Aspecto | sections | tasks |
|---|---|---|
| Programación | Más simple | Más declarativa (listas de variables) |
| Dependencias | Sólo por barreras de bloque | Exactas (depend) |
| Sincronización | Barrera implícita: **todas** esperan a la más lenta del bloque aunque la siguiente no dependa de ella | Cada tarea arranca en cuanto sus dependencias se cumplen |
| Número de tareas | Fijo por código | Dinámico (recursión, bucles) |
| Overhead | Bajo | Algo mayor (cola de tareas, grafo) |

**Ejemplo:** calculo_z podría empezar en cuanto terminen min/max, aunque calculo_y siga corriendo; en sections tiene que esperar a la barrera. En este caso (pocas tareas) los tiempos son comparables.`,
      },
    ],
    complexity: [
      { label: "Paralelismo máx.", value: "3 tareas simultáneas (min, max, y)" },
      { label: "Sections", value: "2 barreras → T = max(nivel1) + max(nivel2) + v" },
      { label: "Tasks", value: "T = longitud del camino crítico del DAG" },
    ],
    result: "Tasks respeta el DAG exacto; sections impone barreras que pueden sobre-sincronizar.",
  },
  {
    slug: "quicksort-escalabilidad",
    title: "Escalabilidad de Quicksort con tareas",
    source: "PD04 2025-I · Ej. 1 / PD05 2025-II (S1) · Ej. 1",
    topic: "ordenamiento",
    diff: "dificil",
    statement: md`
Paraleliza §qs()§ con OpenMP tasks para $N=10^6$ valores en $[0,99]$ y compara teoría con experimento. Deriva $S(n,p)$ y $E(n,p)$ y responde: ¿Quicksort es escalable?`,
    steps: [
      {
        title: "Paralelización",
        body: "La partición es secuencial; las dos mitades son independientes y se ejecutan como tareas. Umbral para no crear tareas pequeñas.",
        code: code`
void qs(int *a, int lo, int hi) {
    if (lo >= hi) return;
    int p = partir(a, lo, hi);                 // O(hi-lo), secuencial
    #pragma omp task if(hi - lo > 10000)
    qs(a, lo, p);
    #pragma omp task if(hi - lo > 10000)
    qs(a, p + 1, hi);
    #pragma omp taskwait
}
// main: #pragma omp parallel / #pragma omp single / qs(a, 0, n-1);
`,
      },
      {
        title: "Modelo teórico",
        body: md`
Caso esperado (pivote razonable): árbol de recursión de $\log n$ niveles; trabajo por nivel $\Theta(n)$ ⇒ $T_s=\Theta(n\log n)$.

El **camino crítico** pasa por las particiones secuenciales de las ramas más largas: $n+n/2+n/4+\dots=2n$ ⇒ $T_\infty=\Theta(n)$.
$$T_p=\Theta\!\left(\frac{n\log n}{p}+n\right).$$
Para ajustar con el experimento: $T_p\approx a\,\dfrac{n\log n}{p}+b\,n$; $a$ y $b$ se obtienen por mínimos cuadrados con las mediciones $p=1,2,4,\dots$`,
      },
      {
        title: "Speedup, eficiencia y escalabilidad",
        body: md`
$$S=\frac{n\log n}{\frac{n\log n}{p}+n}=\frac{p\log n}{\log n+p},\qquad E=\frac{S}{p}=\frac{\log n}{\log n+p}=\frac{1}{1+\frac{p}{\log n}}.$$

- $S\to\log n$ cuando $p\to\infty$: el speedup **no puede superar $\log n$** (≈ 20 para $n=10^6$), aunque se agreguen procesadores.
- **Isoeficiencia:** $T_o=pT_p-T_s=pn$; $W=n\log n=K\,pn\Rightarrow\log n=Kp\Rightarrow n=2^{Kp}$: el tamaño debe crecer **exponencialmente** con $p$ ⇒ **Quicksort con partición secuencial NO es escalable**.

**Diferencias teoría/experimento:** caché y ancho de banda, pivotes que desbalancean (el caso esperado no es el medio), el overhead de las tareas, y con valores en $[0,99]$ hay **muchas repeticiones** ⇒ particiones degeneradas.

**Cómo mejorarlo:** partición paralela (prefijos) ⇒ $T_\infty=\Theta(\log^2n)$, $T_p=\Theta(n\log n/p+\log^2n)$, $T_o=p\log^2n$, $n\log n=Kp\log^2n\Rightarrow n=\Theta(p\log p)$.`,
      },
    ],
    complexity: [
      { label: "Ts", value: "Θ(n log n)" },
      { label: "T∞ (partición serial)", value: "Θ(n)" },
      { label: "Tp", value: "Θ(n log n / p + n)" },
      { label: "S", value: "p·log n / (log n + p)  (≤ log n)" },
      { label: "E", value: "log n / (log n + p)" },
      { label: "Isoeficiencia", value: "n = 2^(Θ(p))  → no escalable" },
      { label: "Con partición paralela", value: "n = Θ(p log p)" },
    ],
    result: "No es escalable con partición secuencial: S ≤ log n; isoeficiencia exponencial.",
  },
  {
    slug: "mergesort-escalabilidad",
    title: "Mergesort con OpenMP: complejidad y escalabilidad",
    source: "PD05 2026-II · Ejercicio 2",
    topic: "ordenamiento",
    diff: "dificil",
    statement: md`
2.1 Paraleliza §ejercicio02-sec.cpp§ (mergesort) describiendo los constructores. 2.3 Deriva la complejidad y compara con el experimento. 2.4 Analiza la escalabilidad (condición de eficiencia constante).`,
    steps: [
      {
        title: "2.1 Constructores usados",
        body: md`
- §#pragma omp parallel§ + §#pragma omp single§: un hilo inicia la recursión; el equipo ejecuta las tareas.
- §#pragma omp task§ en cada mitad: las dos subproblemas son independientes.
- §#pragma omp taskwait§: el merge necesita **ambas mitades ordenadas**.
- **Umbral** (§if(n > U)§ / ordenar secuencial bajo $U$): evita millones de tareas diminutas.`,
        code: code`
void msort(int *a, int *tmp, int lo, int hi) {
    if (hi - lo < 2) return;
    int mid = (lo + hi) / 2;
    #pragma omp task if(hi - lo > 20000)
    msort(a, tmp, lo, mid);
    #pragma omp task if(hi - lo > 20000)
    msort(a, tmp, mid, hi);
    #pragma omp taskwait
    merge(a, tmp, lo, mid, hi);        // O(hi-lo), secuencial
}
`,
      },
      {
        title: "2.3 Complejidad",
        body: md`
**Trabajo:** $T(n)=2T(n/2)+\Theta(n)\Rightarrow T_s=\Theta(n\log n)$.

**Camino crítico** con merge secuencial: $T_\infty(n)=T_\infty(n/2)+\Theta(n)=\Theta(n)$.

**Tiempo con $p$ hilos (Brent):**
$$T_p=\Theta\!\left(\frac{n\log n}{p}+n\right)+O(\text{overhead de tareas}).$$
Experimento: se ajusta $T_p\approx a\,n\log n/p+b\,n+c$; si $b$ resulta grande el **merge secuencial** domina (sat. del speedup). El overhead de tareas es $O(n/U)$ tareas × costo por tarea.

**Con merge paralelo** (partir por búsqueda binaria): $T_\infty=\Theta(\log^2n)$ y $T_p=\Theta(n\log n/p+\log^2n)$.`,
      },
      {
        title: "2.4 Escalabilidad",
        body: md`
Con merge secuencial: $E=\dfrac{n\log n}{p\,T_p}=\dfrac{\log n}{\log n+p}$. Mantener $E$ constante exige $\log n=\Theta(p)\Rightarrow n=2^{\Theta(p)}$ (**exponencial**). En un experimento típico, con $n$ fijo la eficiencia cae rápido al subir $p=2,4,8$ y sólo se recupera si $n$ crece muy rápido: contrasta esa tendencia con tus mediciones para **comprobar** la condición teórica.

Con merge paralelo: $T_o=p\log^2 n$, $n\log n=Kp\log^2 n\Rightarrow n=\Theta(p\log p)$: **escalable** (crecimiento casi lineal).`,
      },
    ],
    complexity: [
      { label: "Ts", value: "Θ(n log n)" },
      { label: "Tp (merge secuencial)", value: "Θ(n log n / p + n)" },
      { label: "Isoeficiencia (merge secuencial)", value: "n = 2^(Θ(p))" },
      { label: "Tp (merge paralelo)", value: "Θ(n log n / p + log² n)" },
      { label: "Isoeficiencia (merge paralelo)", value: "n = Θ(p log p)" },
    ],
    result: "Con merge secuencial el speedup se satura (≤ log n); el merge paralelo recupera la escalabilidad.",
  },
  {
    slug: "calor-optimizado",
    title: "Difusión de calor con perturbación: optimizada vs no optimizada",
    source: "PD05 2026-II · Ejercicio 1",
    topic: "edp",
    diff: "medio",
    statement: md`
Barra de longitud $L$ con una fuente externa en el centro; temperatura inicial 20 °C. 1.1 Paraleliza en forma optimizada y fundamenta. 1.3 Compara secuencial y paralelo para $F=0,1,5,10$: ¿hay error? 1.4 Complejidad de los casos optimizado y no optimizado, y mejora lograda.`,
    steps: [
      {
        title: "1.1 Paralelización optimizada",
        body: md`
1. El bucle de **tiempo** es secuencial (cada paso necesita el anterior); el bucle **espacial** es paralelo (cada $u_i^{t+1}$ sólo usa el paso $t$) ⇒ §parallel for§ con **dos buffers**.
2. **Optimización:** la fuente $s_i=F e^{-(i-c)^2/2\sigma^2}$ no depende de $t$ ⇒ se **precalcula una vez** (en paralelo) fuera del bucle de tiempo. El código no optimizado evalúa la exponencial en cada punto y cada paso.
3. Una sola región paralela con §omp for§ interno evita crear/destruir el equipo en cada paso.`,
        code: code`
#pragma omp parallel for
for (int i = 0; i < n; i++) src[i] = dt * F * exp(-(i-c)*(i-c) / (2*sigma*sigma));

for (int t = 0; t < pasos; t++) {
    #pragma omp parallel for
    for (int i = 1; i < n - 1; i++)
        v[i] = u[i] + r * (u[i-1] - 2*u[i] + u[i+1]) + src[i];
    std::swap(u, v);
}
`,
      },
      {
        title: "1.3 ¿Hay error paralelo vs secuencial?",
        body: md`
Con doble buffer y **sin reducciones** en el cálculo, cada celda se calcula con la misma expresión en el mismo orden ⇒ el resultado paralelo es **idéntico bit a bit** al secuencial (error $L_\infty=0$). Una diferencia sólo aparecería si:
- se actualiza **en sitio** (un solo buffer): carrera y error visible;
- se compila con reordenamientos de coma flotante distintos (FMA, §-ffast-math§): error $\sim10^{-14}$.
Se compara con $\|u_{seq}-u_{par}\|_\infty$ para cada $F$.`,
      },
      {
        title: "1.4 Complejidad y mejora",
        body: md`
Sea $c_e$ el costo de una evaluación de $e^{x}$ y $c_s$ el de la actualización del stencil.

| Caso | $T_s$ | $T_p$ |
|---|---|---|
| No optimizado | $nT(c_s+c_e)$ | $\dfrac{nT(c_s+c_e)}{p}+T\log p$ |
| Optimizado | $nc_e+nTc_s$ | $\dfrac{nc_e+nTc_s}{p}+T\log p$ |

**Mejora:** $\displaystyle \frac{nT(c_s+c_e)}{nc_e+nTc_s}\xrightarrow{T\to\infty}1+\frac{c_e}{c_s}$. Con $c_e\approx3c_s$ (exponencial ≈ 3× el costo del stencil) la mejora es ≈ **4×** (y en la práctica ≈ 4.1× al precalcular la fuente).

**Escalabilidad:** $T_o=pT_p-T_s=pT\log p$ (barrera por paso) ⇒ para $E$ constante $n=\Theta(p\log p)$.`,
      },
    ],
    complexity: [
      { label: "Ts (no opt.)", value: "n·T·(c_s + c_e)" },
      { label: "Ts (opt.)", value: "n·c_e + n·T·c_s" },
      { label: "Mejora (T→∞)", value: "1 + c_e/c_s ≈ 4×" },
      { label: "Tp", value: "(trabajo)/p + T·log p" },
      { label: "Isoeficiencia", value: "n = Θ(p log p)" },
    ],
    result: "Precalcular la fuente: ≈ 4× menos trabajo; paralelo = secuencial bit a bit con doble buffer.",
  },
  {
    slug: "bitonico-topologias",
    title: "Ordenamiento bitónico: malla vs hipercubo e Hyksort",
    source: "PD05 2025-I y 2026-I · Ejercicio 3",
    topic: "ordenamiento",
    diff: "dificil",
    statement: md`
La red bitónica es sensible a la topología. Cómputo: $O\!\left(\frac np\log n\right)$. Comunicación: $O\!\left(\frac{n}{\sqrt p}\right)$ en **malla** y $O\!\left(\frac np\log^2p\right)$ en **hipercubo**.
a) Deriva la condición de escalabilidad y decide qué modelo escala mejor. b) Hyksort: $T_p=O\!\left(\frac np(\log n+\log p)+\log^2p\right)$ ¿escala mejor?`,
    steps: [
      {
        title: "Malla",
        body: md`
Eficiencia constante ⇔ el cómputo domina de forma proporcional a la comunicación:
$$\frac np\log n\ \propto\ \frac{n}{\sqrt p}\ \Longrightarrow\ \log n\propto\sqrt p\ \Longrightarrow\ n\propto 2^{\sqrt p}.$$`,
      },
      {
        title: "Hipercubo",
        body: md`
$$\frac np\log n\ \propto\ \frac np\log^2p\ \Longrightarrow\ \log n\propto\log^2p\ \Longrightarrow\ n\propto 2^{\log^2 p}=p^{\log p}.$$

Comparación asintótica: $2^{\log^2 p}=p^{\log p}$ crece **mucho más lento** que $2^{\sqrt p}$ para $p$ grande.

> **Nota de estudio.** Las soluciones publicadas de la PD escriben $n\propto2^{\sqrt p}$ para la malla y $n\propto2^{\log_2p}$ para el hipercubo y concluyen que «la malla escala mejor porque necesita menos trabajo para mantener $E$ constante». Si tu criterio es *qué topología requiere que $n$ crezca menos*, de las expresiones anteriores es el hipercubo. En el examen **declara el criterio** (tamaño de problema requerido vs. trabajo $W$) y muestra la igualdad que usas.`,
      },
      {
        title: "b) Hyksort",
        body: md`
$$T_p=O\!\left(\frac np(\log n+\log p)+\log^2p\right)\ \Rightarrow\ \text{condición: } n\log n\propto p\log^2p.$$
El trabajo $W=n\log n$ crece **polinomialmente** (casi lineal en $p$, con factor $\log^2p$) frente al crecimiento *exponencial en $\sqrt p$* de la malla ⇒ **Hyksort escala mejor** que ambas redes bitónicas.`,
      },
    ],
    complexity: [
      { label: "Malla", value: "n ∝ 2^√p" },
      { label: "Hipercubo", value: "n ∝ 2^(log² p) = p^(log p)" },
      { label: "Hyksort", value: "n log n ∝ p log² p" },
      { label: "Conclusión", value: "Hyksort > hipercubo > malla (en crecimiento de n requerido)" },
    ],
    result: "Hyksort escala mejor; declara siempre el criterio de comparación (n requerido o W).",
  },
  {
    slug: "hyksort-vs-ranking",
    title: "Hyksort vs ranking sort: isoeficiencia y granularidad",
    source: "PD05 2024-II · Ejercicio 2",
    topic: "ordenamiento",
    diff: "dificil",
    statement: md`
Tiempos optimizados:
$$\text{Hyksort: } T_p=t_c\frac np\log n+\beta\log p\,\frac np+\alpha\log^2p,\qquad \text{Ranking: } T_p=t_c\frac{n}{\sqrt p}\log n+\beta\log p\,\frac{n}{\sqrt p}+\alpha\log p.$$
Determina la condición de isoeficiencia en ambos, cómo depende de $\alpha,\beta$; analiza la granularidad y recomienda un rango de $n,p$.`,
    steps: [
      {
        title: "Isoeficiencia de Hyksort",
        body: md`
$$E=\frac{t_c\frac np\log n}{T_p}=\frac{1}{1+\dfrac{\beta\log p}{t_c\log n}+\dfrac{\alpha\,p\log^2p}{t_c\,n\log n}}.$$
Eficiencia constante exige que ambos sumandos del denominador sean $O(1)$:
- $t_c\log n\ \propto\ \beta\log p$ (dominante, depende de $\beta$: ancho de banda),
- $t_c\,n\log n\ \propto\ \alpha\,p\log^2p$ (depende de $\alpha$: latencia).`,
      },
      {
        title: "Isoeficiencia de ranking",
        body: md`
$$E=\frac{1}{1+\dfrac{\beta\sqrt p\log p}{t_c\log n}+\dfrac{\alpha\,p\log p}{t_c\,n\log n}}.$$
Condiciones: $t_c\log n\propto\beta\sqrt p\log p$ (dominante) y $t_c\,n\log n\propto\alpha\,p\log p$.`,
      },
      {
        title: "Granularidad",
        body: md`
$G=\dfrac{\text{cómputo}}{\text{comunicación}}$. Con $n$ constante:
- Hyksort: $G\propto\dfrac{1}{p\log^2p}$,
- Ranking: $G\propto\dfrac{1}{\sqrt p\log p}$.
La granularidad depende de $p$ pero se puede analizar independientemente de $n$; cada algoritmo se comporta distinto según $p$.`,
      },
      {
        title: "Recomendación",
        body: md`
Según la solución de la PD (curvas de $G$ vs $p$ normalizadas): si se prioriza **menor tiempo de cómputo** con $G>1$ (grano grueso, pocos procesos) conviene **ranking**; con $G<1$ (grano fino, muchos procesos) conviene **Hyksort**. Si se prioriza **menor comunicación**, la preferencia se invierte para cada régimen. El valor de $p$ de cruce es referencial (está normalizado).`,
      },
    ],
    complexity: [
      { label: "Hyksort E", value: "1 / (1 + β log p / (tc log n) + α p log²p / (tc n log n))" },
      { label: "Ranking E", value: "1 / (1 + β √p log p / (tc log n) + α p log p / (tc n log n))" },
      { label: "G Hyksort", value: "∝ 1 / (p log² p)" },
      { label: "G Ranking", value: "∝ 1 / (√p log p)" },
    ],
    result: "El término de ancho de banda (β) domina en ambos; Hyksort para grano fino, ranking para grano grueso.",
  },
  {
    slug: "energia-escalabilidad",
    title: "Escalabilidad fuerte/débil y costo energético",
    source: "Parcial 2026-I · Pregunta 2",
    topic: "fundamentos",
    diff: "medio",
    statement: md`
Una empresa de streaming ejecuta un modelo de recomendación. Se conoce $T_s=1000$ s, $f=0.95$ (fracción paralelizable), $p=10$ y $p=100$. Energía $E_{kWh}=pP_{nodo}T_p$ (con $T_p$ en horas), $P_{nodo}=0.3$ kW y $c_e=0.15$ USD/kWh.
(2.1) Speedup, eficiencia, energía y costo (problema fijo). (2.2) Crece de 100k a 500k usuarios con $T_p(n,p)=W/p+\gamma p$, $\gamma=10$, $W(n)=n$.`,
    steps: [
      {
        title: "2.1 Escalabilidad fuerte (Amdahl)",
        body: md`
$$S=\frac{1}{(1-f)+f/p}:\quad S_{10}=\frac{1}{0.05+0.095}=6.9,\quad S_{100}=\frac{1}{0.05+0.0095}=16.8.$$
$$E_{10}=0.69,\qquad E_{100}=0.17.$$
$T_p=T_s(1-f+f/p)$: $T_{10}=145$ s, $T_{100}=59.5$ s.
$$E_{kWh,10}=10\cdot0.3\cdot\frac{145}{3600}=0.121,\quad E_{kWh,100}=100\cdot0.3\cdot\frac{59.5}{3600}=0.496.$$
Costo: $C_{10}=0.121\cdot0.15=\mathbf{0.018}$ USD; $C_{100}=0.496\cdot0.15=\mathbf{0.074}$ USD.

**Interpretación:** 10× más procesos sólo dan $S$ ×2.4 (tope $1/(1-f)=20$); la eficiencia cae > 3× y el costo energético **se cuadruplica**. Observa que $E_{kWh}=P_{nodo}T_s/(E\cdot3600)$: **inversamente proporcional a la eficiencia**.`,
      },
      {
        title: "2.2 Escalabilidad débil",
        body: md`
Con $n=10^5$ y $p=10$: $T_p=\dfrac{10^5}{10}+10\cdot10=10100$; $S=\dfrac{10^5}{10100}=9.9$; $E=0.99$.
Con $n=5\cdot10^5$ y $p=100$: $T_p=\dfrac{5\cdot10^5}{100}+10\cdot100=6000$; $S=\dfrac{5\cdot10^5}{6000}=83.3$; $E=0.83$.

Energía: $E_{kWh,10}=10\cdot0.3\cdot\dfrac{10100}{3600}=8.4$ kWh ⇒ **1.26 USD**; $E_{kWh,100}=100\cdot0.3\cdot\dfrac{6000}{3600}=50$ kWh ⇒ **7.5 USD**.

**Interpretación:** al crecer el problema con $p$ (escalabilidad débil) la eficiencia sólo cae de 0.99 a 0.83 (≈ 10 %): casi 10× más rápido... pero el costo se multiplica por ≈ 6, porque se usan 10× más nodos durante un tiempo comparable.`,
      },
    ],
    complexity: [
      { label: "Fuerte p=10", value: "S = 6.9, E = 0.69, 0.121 kWh, 0.018 USD" },
      { label: "Fuerte p=100", value: "S = 16.8, E = 0.17, 0.496 kWh, 0.074 USD" },
      { label: "Débil p=10", value: "S = 9.9, E = 0.99, 8.4 kWh, 1.26 USD" },
      { label: "Débil p=100", value: "S = 83.3, E = 0.83, 50 kWh, 7.5 USD" },
    ],
    result: "Fuerte: más rápido pero 4× más caro. Débil: casi 10× más rápido, eficiencia 0.83, costo ×6.",
  },
];
