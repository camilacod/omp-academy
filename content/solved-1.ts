import { md, code } from "@/lib/md";
import type { Solved } from "@/lib/types";

export const solved1: Solved[] = [
  {
    slug: "cartera-gradiente",
    title: "Optimización de una cartera financiera (gradiente)",
    source: "PD04 2026-II · Ejercicio 1",
    topic: "sincronizacion",
    diff: "medio",
    statement: md`
Una entidad evalúa una cartera de $M$ activos bajo $N$ escenarios. $L_i$ es la pérdida del escenario $i$ y $X_{ij}$ la sensibilidad del activo $j$. El gradiente es
$$G_j=\frac1N\sum_{i=0}^{N-1}L_i\,X_{ij},\qquad j=0,\dots,M-1.$$

1. Describe ventajas/desventajas de tres estrategias (critical, atomic, acumuladores privados, reduction).
2. Elige una y paraleliza.
3. Analiza la escalabilidad asintótica en $N$, $M$ y $p$.`,
    steps: [
      {
        title: "1. Qué bucle paralelizar",
        body: md`
Hay $N$ escenarios y $M$ activos; típicamente $N\gg M$. El bucle de **escenarios** ($i$) tiene mucho más trabajo, pero **todos los hilos escriben en el mismo $G_j$** → carrera de datos. El bucle de activos ($j$) no tiene carreras (cada hilo escribe un $G_j$ distinto) pero sólo reparte $M$ tareas y pierde el paralelismo disponible.`,
        code: code`
for (int i = 0; i < N; i++) {          // ← bucle a paralelizar
    for (int j = 0; j < M; j++)
        G[j] += L[i] * X[i][j];        // ← carrera: todos escriben G[j]
}
`,
      },
      {
        title: "2. Comparación de estrategias",
        body: md`
| Estrategia | Ventajas | Desventajas |
|---|---|---|
| §critical§ sobre §G[j] +=§ | Trivial | **Serializa** las $NM$ actualizaciones: $T_p\approx T_s$ |
| §atomic§ por componente | Granular; instrucción atómica | $NM$ operaciones atómicas; **contención** en los mismos $M$ lugares |
| Acumuladores privados por hilo + combinación | Sin contención en el bucle caliente | Memoria $O(pM)$; hay que combinar a mano |
| §reduction(+:G[:M])§ | Lo anterior, pero el compilador lo hace por ti | Memoria $O(pM)$; el paso de combinación cuesta $O(M\log p)$ |

Con $N\gg M$ la mejor es **reducción de arreglo**: el trabajo $NM/p$ domina sobre la combinación.`,
      },
      {
        title: "3. Código paralelo",
        body: "La cláusula crea una copia privada de §G§ por hilo (inicializada en 0) y suma todas al final.",
        code: code`
#pragma omp parallel for reduction(+:G[:M])
for (int i = 0; i < N; i++)
    for (int j = 0; j < M; j++)
        G[j] += L[i] * X[i][j];

for (int j = 0; j < M; j++) G[j] /= N;
`,
      },
      {
        title: "4. Escalabilidad asintótica",
        body: md`
- $T_s=\Theta(NM)$.
- Cada hilo procesa $N/p$ escenarios: $\Theta(NM/p)$.
- Combinar $p$ arreglos de $M$ elementos en árbol: $\Theta(M\log p)$.
$$T_p=\Theta\!\left(\frac{NM}{p}+M\log p\right),\quad S=\frac{NM}{NM/p+M\log p},\quad E=\frac{1}{1+\frac{p\log p}{N}}.$$

**Isoeficiencia:** $T_o=pT_p-T_s=pM\log p$. Con $W=NM$: $NM=K\,pM\log p\Rightarrow N=\Theta(p\log p)$, o $W=\Theta(Mp\log p)$. Para mantener $E$ constante, el número de escenarios debe crecer un poco más que linealmente con $p$.`,
      },
    ],
    complexity: [
      { label: "Ts", value: "Θ(N·M)" },
      { label: "Tp (reduction)", value: "Θ(N·M/p + M·log p)" },
      { label: "Speedup", value: "NM / (NM/p + M log p)" },
      { label: "Eficiencia", value: "1 / (1 + p·log p / N)" },
      { label: "Isoeficiencia", value: "N = Θ(p log p)" },
    ],
    result: "Reduction de arreglo; E ≈ 1 mientras N ≫ p·log p.",
  },
  {
    slug: "sensores-dag",
    title: "Datos de sensores: DAG, ruta crítica y speedup máximo",
    source: "PD04 2026-II · Ejercicio 2",
    topic: "tareas",
    diff: "medio",
    statement: md`
Se calcula $C=A_0B_0+A_1B_1$ y el indicador $E=\frac1N\sum|A_{0,i}-A_{1,i}|$. Luego se registra el resultado.

§multiplicar(A0,B0,P)§, §multiplicar(A1,B1,Q)§, §sumar(P,Q,C)§, §calidad(A0,A1,E)§, §registrar(C,E)§.

Tiempos: productos 15 y 9 ms, suma 4 ms, calidad 12 ms, registro 2 ms.
2.1 DAG. 2.2 Código OpenMP maximizando el paralelismo. 2.3 $T_s$, ruta crítica, $T_\infty$, $S_{max}$; ¿alcanzan 2 hilos $T_\infty$?`,
    steps: [
      {
        title: "2.1 DAG",
        body: md`
Dependencias por datos:
- **mult1** y **mult2** sólo leen sus entradas: independientes.
- **sumar** necesita $P$ y $Q$.
- **calidad** sólo lee $A_0$, $A_1$: independiente de todo lo anterior.
- **registrar** necesita $C$ (de sumar) y $E$ (de calidad).`,
        dag: {
          nodes: [
            { id: "m1", label: "mult1", cost: 15 },
            { id: "m2", label: "mult2", cost: 9 },
            { id: "su", label: "sumar", cost: 4 },
            { id: "ca", label: "calidad", cost: 12 },
            { id: "re", label: "registrar", cost: 2 },
          ],
          edges: [["m1", "su"], ["m2", "su"], ["su", "re"], ["ca", "re"]],
          critical: ["m1", "su", "re"],
          caption: "Ruta crítica: mult1 → sumar → registrar = 21 ms",
        },
      },
      {
        title: "2.2 Código OpenMP",
        body: "Un único hilo crea las tareas; el runtime las ejecuta en cuanto sus dependencias se cumplen.",
        code: code`
#pragma omp parallel
#pragma omp single
{
    #pragma omp task depend(out: P[0])
    multiplicar(A0, B0, P);
    #pragma omp task depend(out: Q[0])
    multiplicar(A1, B1, Q);
    #pragma omp task depend(in: P[0], Q[0]) depend(out: C[0])
    sumar(P, Q, C);
    #pragma omp task depend(out: E)
    calidad(A0, A1, &E);
    #pragma omp task depend(in: C[0], E)
    registrar(C, E);
}
`,
      },
      {
        title: "2.3 Ts, ruta crítica, T∞ y Smax",
        body: md`
$T_s=15+9+4+12+2=42$ ms.

Caminos del inicio al fin:
| Camino | Duración |
|---|---|
| mult1 → sumar → registrar | 15 + 4 + 2 = **21** |
| mult2 → sumar → registrar | 9 + 4 + 2 = 15 |
| calidad → registrar | 12 + 2 = 14 |

**Ruta crítica:** mult1 → sumar → registrar, $T_\infty=21$ ms.

$$S_{max}=\frac{T_s}{T_\infty}=\frac{42}{21}=2.$$

**¿Alcanzan 2 hilos $T_\infty$?** La cota $T_p\ge\max(T_s/p,\,T_\infty)=\max(21,21)=21$ no es alcanzable con 2 hilos, porque las tareas son indivisibles y *registrar* debe esperar a *calidad*:

- H0: mult1 (0–15) → sumar (15–19) → *registrar* necesita $E$.
- H1: mult2 (0–9) → calidad (9–21).
- *registrar* sólo puede empezar en $t=21$ y termina en **23 ms**.

(Cualquier otro orden es peor: p. ej. calidad primero retrasa a mult2 y por tanto a sumar.) Con 2 hilos: $S=42/23\approx1.83$, $E\approx0.91$.

Con **3 hilos**: H0 mult1→sumar→registrar (0–21), H1 mult2, H2 calidad (0–12): *registrar* empieza en $t=19$ y termina en **21 ms** $=T_\infty$, $S=2$, $E=0.67$.`,
      },
    ],
    complexity: [
      { label: "Ts", value: "42 ms" },
      { label: "Ruta crítica", value: "mult1 → sumar → registrar" },
      { label: "T∞", value: "21 ms" },
      { label: "Smax", value: "42 / 21 = 2" },
      { label: "Tp con 2 hilos", value: "23 ms (S ≈ 1.83, E ≈ 0.91)" },
      { label: "Tp con 3 hilos", value: "21 ms (S = 2, E = 0.67)" },
    ],
    result: "T∞ = 21 ms, Smax = 2; con sólo 2 hilos el mejor planning da 23 ms (T∞ requiere 3 hilos).",
  },
  {
    slug: "inventario-carrera",
    title: "Inventario: condición de carrera y sincronización",
    source: "PD04 2026-II · Ejercicio 3",
    topic: "sincronizacion",
    diff: "medio",
    statement: md`
Un almacén tiene 10 000 unidades. Cada despacho hace §disponibles--§ y §despachados++§. Un hilo procesa despachos y otro audita. Debe cumplirse §disponibles + despachados == 10000§.

1. ¿Hay condición de carrera? Construye un intercalado que produzca una inconsistencia.
2. Corrige con un constructor de sincronización. ¿Por qué no basta proteger sólo las escrituras? ¿Qué pasa con un §atomic§ por variable?
3. Analiza el costo de sincronización y propone una alternativa.`,
    steps: [
      {
        title: "1. La carrera y un intercalado malo",
        body: md`
Sí. El despacho modifica **dos variables** que deben cambiar juntas (invariante), y el auditor las **lee** sin ninguna exclusión. Sea A=§disponibles--§, B=§despachados++§ del hilo de despachos y C=§leer disponibles§, D=§leer despachados§ del auditor:

| Tiempo | Despachador | Auditor | Estado |
|---|---|---|---|
| 1 | A: disponibles = 9999 | | 9999 + 0 |
| 2 | | C: lee disponibles = 9999 | |
| 3 | | D: lee despachados = **0** | 9999 + 0 = 9999 ≠ 10000 |
| 4 | B: despachados = 1 | | |

El auditor ve un estado intermedio **inconsistente** aunque las dos escrituras son correctas.

Esto ocurre **incluso sin que el compilador reordene** instrucciones: bastan dos escrituras *no atómicas como grupo* y un lector concurrente. Con §-O3§ aparece además el problema de visibilidad (el compilador puede mantener las variables en registros).`,
      },
      {
        title: "2. Corrección",
        body: md`
El par (A,B) debe ser una **unidad atómica lógica** y la lectura del auditor debe excluirse con ella. Un único §critical§ con **el mismo nombre** cubre ambas.

**¿Por qué no basta proteger sólo las escrituras?** Porque el auditor lee dos variables; si las lecturas no se excluyen con las escrituras, puede leer entre A y B. **¿Un §atomic§ por variable?** Cada operación sería atómica pero el **par** no: el auditor sigue pudiendo observar el estado intermedio (9999, 0). §atomic§ garantiza atomicidad **por variable**, no la invariante entre varias.`,
        code: code`
#pragma omp parallel for
for (int i = 0; i < 10000; i++) {
    #pragma omp critical(inv)
    { disponibles--; despachados++; }
    if (i % 50 == 0) {
        #pragma omp critical(inv)
        { if (disponibles + despachados != 10000) incons++; }
    }
}
`,
      },
      {
        title: "3. Costo de sincronización y alternativa",
        body: md`
Un §critical§ por despacho serializa las $n=10\,000$ operaciones: $T_p\approx T_s+n\cdot t_{lock}$, es decir, **speedup ≈ 1** (o menor, por el costo del lock).

**Alternativas:**
- **Acumuladores privados** (§reduction§): cada hilo cuenta sus despachos; $disponibles=10000-\sum d_t$ y $despachados=\sum d_t$ se calculan al final (invariante exacto *por construcción*). Costo $O(n/p+\log p)$.
- Si el auditor necesita una vista continua, usa un **snapshot** periódico bajo critical (con poca frecuencia) en vez de uno por despacho.
- Granularidad: agrupar despachos en **lotes** de $b$ unidades por sección crítica reduce $t_{lock}$ por unidad en $b$ veces.`,
      },
    ],
    complexity: [
      { label: "Con critical", value: "Tp ≈ Ts + n·t_lock (serial)" },
      { label: "Con reducción", value: "Tp = Θ(n/p + log p)" },
      { label: "Ley", value: "invariante entre variables ⇒ exclusión mutua conjunta" },
    ],
    result: "Un critical con nombre común (escrituras + auditoría); alternativa: contadores privados con reducción.",
  },
  {
    slug: "knn-paralelo",
    title: "KNN: estrategia de paralelismo y escalabilidad",
    source: "PD04 2026-I · Ejercicio 1",
    topic: "worksharing",
    diff: "medio",
    statement: md`
Paraleliza el KNN (§knn.cpp§): para cada punto de prueba ($N_{test}$) se calcula la distancia a todo el conjunto de entrenamiento ($N_{train}$) y se escogen los $k$ vecinos.

1.1 ¿Qué bucle paralelizas? 1.2 Escalabilidad fuerte con $p=2,4,8,16$. 1.3 Escalabilidad débil: ¿incrementas $N_{test}$ o $N_{train}$?`,
    steps: [
      {
        title: "1.1 Elección del bucle",
        body: md`
**Se paraleliza el bucle de la data de prueba** ($N_{test}$).

- Cada punto de prueba es **independiente**: recorre completo $N_{train}$ y produce su propia clasificación.
- No hay escritura compartida: cada hilo escribe sólo en su posición de salida.
- Paralelizar el bucle de entrenamiento obligaría a una **reducción** posterior de distancias/vecinos (mínimos parciales) por **cada** punto de prueba: sincronización $N_{test}$ veces.`,
        code: code`
#pragma omp parallel for schedule(static)
for (int t = 0; t < Ntest; t++) {
    // distancias a los Ntrain puntos, selección de los k vecinos
    pred[t] = clasificar(test[t], train, Ntrain);
}
`,
      },
      {
        title: "1.2 Escalabilidad fuerte",
        body: md`
Con $N_{test}, N_{train}$ fijos: $T_s=\Theta(N_{test}N_{train}D)$ y
$$T_p=\Theta\!\left(\frac{N_{test}N_{train}D}{p}+\text{overhead}\right).$$
La gráfica $T$ vs $p$ debe seguir $1/p$ mientras $N_{test}/p$ sea grande; cuando $p$ se acerca a $N_{test}$ aparece **desbalance** (algunos hilos con un punto más) y el overhead de la región paralela pasa a dominar → la curva se aplana.`,
      },
      {
        title: "1.3 Escalabilidad débil",
        body: md`
Se mantiene constante el trabajo por hilo: $W/p$ constante.
- **Incrementar $N_{test}$** proporcional a $p$ ($N_{test}=p\,n_0$): cada hilo siempre procesa $n_0$ puntos completos; $T_p$ debería permanecer **constante** (ideal). Es la opción natural porque la paralelización es sobre $N_{test}$.
- Incrementar $N_{train}$ también multiplica el trabajo por punto de prueba, pero con $N_{test}$ fijo el reparto no cambia y se desbalancea si $N_{test}/p$ es pequeño.

**Eficiencia débil** $E_w=T_1(n_0)/T_p(pn_0)$. Una caída indica overhead que crece con $p$ (ancho de banda de memoria compartida, NUMA).`,
      },
    ],
    complexity: [
      { label: "Ts", value: "Θ(Ntest · Ntrain · D)" },
      { label: "Tp", value: "Θ(Ntest · Ntrain · D / p) + overhead" },
      { label: "Escalab. débil", value: "Ntest ∝ p ⇒ Tp constante" },
    ],
    result: "Paralelizar sobre los puntos de prueba; sin sincronización dentro del bucle.",
  },
  {
    slug: "tareas-dag-2026i",
    title: "Tareas en paralelo: DAG, PRAM y Brent",
    source: "PD04 2026-I · Ejercicio 2",
    topic: "tareas",
    diff: "dificil",
    statement: md`
§§§
a = calcula_a(v, x);   // O(n)
b = calcula_b(v, a);   // O(n log n)
c = calcula_c(v, x);   // O(n log n)
d = calcula_d(v, y);   // O(n log² n)
e = calcula_e(v, x);   // O(n)
x += a + b + c;
y += c + d + e;
for i<n: j = f(x, y, v[i]);  // f es O(n)
         if (0 < j < 4) k++;
§§§
2.1 DAG. 2.2 Algoritmo PRAM que maximice el paralelismo. 2.3 Complejidad.`,
    steps: [
      {
        title: "2.1 DAG",
        body: md`
- §b§ necesita §a§. Las demás (§a§, §c§, §d§, §e§) sólo leen $v,x,y$ originales: independientes.
- La actualización de §x§ necesita $a,b,c$; la de §y§ necesita $c,d,e$.
- El bucle final necesita los **nuevos** $x,y$. Sus $n$ iteraciones son independientes (el contador §k§ se resuelve con reducción).`,
        dag: {
          nodes: [
            { id: "a", label: "a  O(n)" },
            { id: "b", label: "b  O(n log n)" },
            { id: "c", label: "c  O(n log n)" },
            { id: "d", label: "d  O(n log²n)" },
            { id: "e", label: "e  O(n)" },
            { id: "x", label: "x += a+b+c" },
            { id: "y", label: "y += c+d+e" },
            { id: "f", label: "for f(x,y,v[i])" },
          ],
          edges: [["a", "b"], ["a", "x"], ["b", "x"], ["c", "x"], ["c", "y"], ["d", "y"], ["e", "y"], ["x", "f"], ["y", "f"]],
          critical: ["d", "y", "f"],
        },
      },
      {
        title: "2.2 Algoritmo PRAM",
        body: md`
§§§
calcula a ‖ calcula c ‖ calcula d ‖ calcula e      // en paralelo
calcula b                                           // tras a (corre en paralelo con d)
x += a + b + c ;  y += c + d + e                    // dos actualizaciones independientes
for i = 1 to n pardo
    j = f(x, y, v[i])
    if 0 < j < 4: k++                               // reducción de suma (ARBITRARY/CRCW suma o árbol)
§§§`,
      },
      {
        title: "2.3 Complejidad",
        body: md`
**Camino crítico:** el más largo es $d\to y\to$ bucle: $O(n\log^2 n)+O(1)+O(n)$ (cada iteración $f$ cuesta $O(n)$, con $n$ procesadores en paralelo).
$$T_\infty=O(n\log^2n+n).$$
**Trabajo:** $T_1=n+n\log n+n\log n+n\log^2n+n+n\cdot n=O(n^2)$ (domina el bucle final).

**Teorema de Brent:**
$$T_p\le\frac{T_1}{p}+T_\infty=O\!\left(\frac{n^2}{p}+n\log^2 n+n\right).$$

**Lectura:** el bucle final tiene paralelismo masivo ($n^2$ de trabajo), pero la fase de las funciones $a..e$ ($n\log^2n$ de camino crítico) limita el speedup para $p$ grande: $S=O\!\left(\dfrac{n^2}{n^2/p+n\log^2n}\right)$ → crece hasta $p\approx n/\log^2n$.`,
      },
    ],
    complexity: [
      { label: "T1", value: "O(n²)" },
      { label: "T∞", value: "O(n log² n + n)" },
      { label: "Tp (Brent)", value: "O(n²/p + n log² n + n)" },
      { label: "Ruta crítica", value: "d → y → bucle final" },
    ],
    result: "Brent: Tp = O(n²/p + n·log²n + n). Escala mientras p ≲ n / log²n.",
  },
  {
    slug: "promedio-atomic-capture",
    title: "Posiciones mayores al promedio: atomic capture y overhead",
    source: "PD04 2026-I · Ejercicio 3",
    topic: "sincronizacion",
    diff: "medio",
    statement: md`
Para una matriz $N\times N$ se calcula el promedio y luego se guardan las posiciones de los valores mayores. 3.1 Paraleliza. 3.2 Analiza el paralelismo. 3.3 Plantea ecuaciones de overhead y obtén $T_p(n,p)$.`,
    steps: [
      {
        title: "3.1 Código",
        body: "Fase 1: reducción de suma. Fase 2: §k§ compartido, se reserva el índice con §atomic capture§ para que dos hilos no escriban en la misma posición.",
        code: code`
#pragma omp parallel for collapse(2) reduction(+:sum)
for (int i = 0; i < N; i++)
    for (int j = 0; j < N; j++) sum += A[i][j];
double prom = sum / (N * N);

#pragma omp parallel for collapse(2)
for (int i = 0; i < N; i++)
    for (int j = 0; j < N; j++)
        if (A[i][j] > prom) {
            int idx;
            #pragma omp atomic capture
            idx = k++;
            posiciones[idx][0] = i;
            posiciones[idx][1] = j;
        }
`,
      },
      {
        title: "3.2 Nivel de paralelismo",
        body: md`
- **Fase 1:** $N^2$ sumas independientes + reducción → paralelismo casi perfecto.
- **Fase 2:** $N^2$ comparaciones independientes, pero cada elemento que cumple pasa por un **punto serial** (§atomic capture§). Si $M$ elementos cumplen, hay $M$ operaciones atómicas serializadas; el orden de las posiciones es no determinista pero el resultado es correcto.`,
      },
      {
        title: "3.3 Ecuaciones de overhead",
        body: md`
- Región paralela (creación/barrera de hilos): $T_{fork}=O(p)$ por región (hay dos).
- Reducción de suma: copias privadas combinadas en árbol: $O(\log p)$.
- Atomic capture: $M$ ejecuciones con contención: $O(M)$ (constante alta); en el peor caso $M=N^2$.

$$T_p=O\!\left(\frac{N^2}{p}+p+\log p+M\right)\approx O\!\left(\frac{N^2}{p}+\log p+M\right),\quad 0\le M\le N^2.$$

Si $M\approx N^2/2$ (la mitad supera el promedio), el término $M$ domina y el speedup se **satura** cerca de 2: el *atomic capture* es el cuello de botella. Mejora: cada hilo guarda sus posiciones en un buffer **local** y se concatenan con un prefijo de tamaños (sin atomics por elemento).`,
      },
    ],
    complexity: [
      { label: "Ts", value: "Θ(N²)" },
      { label: "Tp", value: "O(N²/p + log p + M)" },
      { label: "M", value: "# elementos > promedio (≤ N²)" },
    ],
    result: "Tp = O(N²/p + log p + M); el atomic capture es el cuello de botella si M es grande.",
  },
];
