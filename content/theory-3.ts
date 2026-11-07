import { md } from "@/lib/md";
import type { Topic } from "@/lib/types";

export const theory3: Topic[] = [
  {
    id: "ordenamiento",
    title: "Ordenamiento paralelo",
    icon: "📊",
    blurb: "Ranking sort, bitónico, mergesort, quicksort y samplesort/Hyksort.",
    reading: md`
## Ranking (enumeration) sort

El *rango* de $a_i$ es la cantidad de elementos menores (con desempate por índice). Colocar $a_i$ en la posición $rank(a_i)$. Con $n^2$ procesadores el cálculo de rangos es $O(1)$ (CRCW) o $O(\log n)$ (CREW con suma en árbol). **Trabajo $\Theta(n^2)$**: no es *work-optimal* frente a $\Theta(n\log n)$.

## Mergesort paralelo

La recursión crea dos tareas independientes (fork-join) y se espera con §taskwait§/§taskgroup§. El cuello de botella es el **merge secuencial** $O(n)$ en cada nivel: con merge secuencial el span es $\Theta(n)$ y el paralelismo $\Theta(\log n)$. Con **merge paralelo** (partir por *cross-ranking* con búsqueda binaria) el span baja a $\Theta(\log^2 n)$.

## Ordenamiento bitónico

Una secuencia **bitónica** crece y luego decrece (o un desplazamiento circular de ello). El *merge bitónico* de $n=2^k$ elementos usa $k$ etapas de comparadores $(i, i+n/2)$, $(i, i+n/4)$, … Ordenar completo exige $\Theta(\log^2 n)$ etapas con $n/2$ comparadores cada una:

$$T_\infty=\Theta(\log^2 n),\qquad W=\Theta(n\log^2 n)$$

Es una **red de comparación** (oblivious): el patrón no depende de los datos ⇒ perfecto para hardware/GPU. En una malla las distancias hacen que el costo de comunicación domine; en un **hipercubo** cada comparador conecta vecinos directos, así que es el mapeo natural.

## Quicksort paralelo

1. Elegir pivote, **particionar** (en paralelo con prefijos), recursión en ambas mitades como tareas. El paralelismo está limitado por la partición inicial.
2. En memoria distribuida: elegir pivote global, intercambiar entre mitades de procesos, recursión en subgrupos. Un mal pivote desbalancea carga.

**Samplesort / Hyksort:** se toman muestras, se eligen $p-1$ *splitters*, cada proceso envía cada elemento a su cubeta destino en **un solo intercambio all-to-all**, y se ordena localmente. Hyksort generaliza con un hipercubo de radix $k$ para reducir la cantidad de mensajes.

## Cuadro comparativo

| Algoritmo | Trabajo | Span | Notas |
|---|---|---|---|
| Ranking | $\Theta(n^2)$ | $O(\log n)$ | simple, no óptimo |
| Mergesort (merge paralelo) | $\Theta(n\log n)$ | $\Theta(\log^2 n)$ | óptimo en trabajo |
| Bitónico | $\Theta(n\log^2 n)$ | $\Theta(\log^2 n)$ | red fija, $n=2^k$ |
| Quicksort | $\Theta(n\log n)$ esp. | depende del pivote | desbalance posible |
`,
    questions: [
      { id: "ord-1", type: "mc", diff: "facil", q: "El *rango* de un elemento en ranking sort es:", options: ["Su índice original", "La cantidad de elementos menores que él", "La suma de todos", "Su valor"], answer: 1, explain: "Con el rango se sabe su posición final." },
      { id: "ord-2", type: "tf", diff: "facil", q: "El ordenamiento bitónico requiere que $n$ sea potencia de 2.", answer: true, explain: "La red de comparadores se define sobre $2^k$ elementos." },
      { id: "ord-3", type: "mc", diff: "medio", q: "¿Cuántas etapas de comparación tiene el bitonic sort completo de $n=2^k$ elementos?", options: ["$k$", "$k(k+1)/2$", "$2^k$", "$k^2 \\cdot n$"], answer: 1, explain: "Suma $1+2+\\dots+k = k(k+1)/2 = \\Theta(\\log^2 n)$." },
      { id: "ord-4", type: "mc", diff: "medio", q: "¿Por qué el mergesort paralelo con merge secuencial tiene paralelismo limitado?", options: ["Porque no puede crear tareas", "Porque el merge de los niveles altos es secuencial $O(n)$ (span $\\Theta(n)$)", "Por el false sharing", "Porque usa recursión"], answer: 1, explain: "Span = $n + n/2 + \\dots = \\Theta(n)$; el paralelismo $T_1/T_\\infty$ es sólo $\\Theta(\\log n)$." },
      { id: "ord-5", type: "tf", diff: "medio", q: "Una red de comparación es 'oblivious': los comparadores no dependen de los datos.", answer: true, explain: "Por eso bitónico es muy adecuado para GPU/hardware." },
      { id: "ord-6", type: "mc", diff: "dificil", q: "En samplesort los *splitters* sirven para:", options: ["Elegir el pivote de un hilo", "Decidir a qué proceso va cada elemento tras un único all-to-all", "Ordenar localmente", "Balancear la memoria"], answer: 1, explain: "Dividen el rango de valores en $p$ cubetas equilibradas." },
      { id: "ord-7", type: "tf", diff: "dificil", q: "Ranking sort con $n^2$ procesadores es work-optimal.", answer: false, explain: "Trabajo $\\Theta(n^2)$ vs. $\\Theta(n\\log n)$ del mejor secuencial." },
    ],
    cards: [
      { id: "ord-c1", front: "Ranking sort", back: "Rango = # elementos menores. $n^2$ procesadores; trabajo $\\Theta(n^2)$, no óptimo." },
      { id: "ord-c2", front: "Bitonic: costo", back: "$\\Theta(\\log^2 n)$ etapas, $n/2$ comparadores cada una; trabajo $\\Theta(n\\log^2 n)$." },
      { id: "ord-c3", front: "Secuencia bitónica", back: "Crece y luego decrece (o rotación circular de ello)." },
      { id: "ord-c4", front: "Mergesort: cuello de botella", back: "Merge secuencial en la raíz: span $\\Theta(n)$. Con merge paralelo: $\\Theta(\\log^2 n)$." },
      { id: "ord-c5", front: "Samplesort / Hyksort", back: "Elegir splitters, un all-to-all, ordenar local. Hyksort: hipercubo de radix $k$ para menos mensajes." },
      { id: "ord-c6", front: "Malla vs hipercubo (bitónico)", back: "En hipercubo los comparadores conectan vecinos directos; en malla las distancias elevan el costo de comunicación." },
    ],
  },
  {
    id: "busqueda",
    title: "Búsqueda paralela",
    icon: "🔎",
    blurb: "Búsqueda lineal, binaria, DFS paralelo y anomalías de aceleración.",
    reading: md`
## Búsqueda lineal

Se reparte el arreglo en $p$ bloques; cada hilo busca en el suyo y se **reduce** el resultado (mínimo índice con §reduction(min)§). Costo:

$$T_p=\Theta\!\left(\frac{n}{p}+\log p\right)$$

**Parada temprana:** con §cancel§ (OpenMP 4+) o una bandera compartida §atomic§ para que los demás hilos dejen de buscar al encontrar el elemento. En OpenMP no se puede salir de un §parallel for§ con §break§.

## Búsqueda binaria paralela

$O(\log n)$ inherentemente secuencial; con $p$ procesadores se hace **búsqueda $(p+1)$-aria**: cada paso compara con $p$ pivotes y reduce el intervalo por $p+1$: $O(\log_{p+1} n)$ pasos.

## DFS / búsqueda en árbol

La exploración de un árbol se paraleliza con **tareas por subárbol** (con umbral de profundidad). En grafos con ciclos hay que marcar visitados con §atomic§ (compare-and-swap). La carga es **irregular**: el balance dinámico (task stealing) es clave.

## Anomalías de aceleración

En búsqueda **exploratoria** (el tamaño del trabajo depende de dónde esté la solución), el speedup puede ser **superlineal** ($S>p$) o **menor a 1** respecto del secuencial, porque el orden de exploración cambia. Por eso se compara con el valor esperado sobre muchas instancias.
`,
    questions: [
      { id: "bus-1", type: "mc", diff: "facil", q: "El costo de la búsqueda lineal paralela con $p$ hilos es:", options: ["$\\Theta(n)$", "$\\Theta(n/p+\\log p)$", "$\\Theta(\\log n)$", "$\\Theta(p)$"], answer: 1, explain: "Se reparte el arreglo y se combinan los resultados parciales con una reducción." },
      { id: "bus-2", type: "tf", diff: "facil", q: "En un §parallel for§ de OpenMP se puede usar §break§ para salir del bucle.", answer: false, explain: "No está permitido; usa una bandera atómica o §cancel§." },
      { id: "bus-3", type: "mc", diff: "medio", q: "La búsqueda binaria con $p$ procesadores como $(p+1)$-aria toma:", options: ["$O(\\log_2 n)$", "$O(\\log_{p+1} n)$", "$O(n/p)$", "$O(1)$"], answer: 1, explain: "Cada paso divide el intervalo en $p+1$ partes." },
      { id: "bus-4", type: "tf", diff: "medio", q: "En búsquedas exploratorias el speedup puede superar $p$.", answer: true, explain: "Anomalía de aceleración superlineal: un hilo puede empezar justo cerca de la solución." },
      { id: "bus-5", type: "mc", diff: "dificil", q: "¿Por qué el DFS paralelo en grafos necesita sincronización al marcar nodos visitados?", options: ["Para ordenar los nodos", "Para evitar que dos hilos visiten el mismo nodo a la vez (compare-and-swap/atomic)", "Para balancear el árbol", "No la necesita"], answer: 1, explain: "Sin atomicidad, dos hilos pueden marcar y expandir el mismo nodo." },
    ],
    cards: [
      { id: "bus-c1", front: "Búsqueda lineal paralela", back: "Bloques por hilo + reducción de mínimo índice. $T_p=\\Theta(n/p+\\log p)$." },
      { id: "bus-c2", front: "Parada temprana", back: "Bandera atómica compartida o §cancel§; no se puede usar break en parallel for." },
      { id: "bus-c3", front: "Anomalías de aceleración", back: "En búsqueda exploratoria el speedup puede ser superlineal o <1 por el orden de exploración." },
      { id: "bus-c4", front: "Binaria (p+1)-aria", back: "$O(\\log_{p+1}n)$ pasos con $p$ procesadores." },
      { id: "bus-c5", front: "DFS paralelo", back: "Tareas por subárbol con umbral; visitados con CAS/atomic; carga irregular ⇒ balance dinámico." },
    ],
  },
  {
    id: "grafos",
    title: "Grafos: Floyd, Prim, Dijkstra",
    icon: "🕸️",
    blurb: "Caminos mínimos y árbol de expansión mínima; isoeficiencia.",
    reading: md`
## Floyd–Warshall (todos contra todos)

§§§cpp
for (int k = 0; k < n; k++)
  #pragma omp parallel for collapse(2)
  for (int i = 0; i < n; i++)
    for (int j = 0; j < n; j++)
      if (d[i][k] + d[k][j] < d[i][j]) d[i][j] = d[i][k] + d[k][j];
§§§

El bucle de $k$ es **secuencial** (cada $k$ depende del anterior); los $n^2$ pares $(i,j)$ de cada iteración son independientes (la fila y columna $k$ no cambian durante la iteración $k$).

- Secuencial: $T_s=\Theta(n^3)$.
- Particionado por filas ($p$ procesos): cada iteración difunde la fila $k$: $T_p=\Theta\!\left(\frac{n^3}{p}+n^2\log p\right)$ ⇒ isoeficiencia $W=\Theta(p^3\log^3 p)$.
- Bloques 2D mejoran la isoeficiencia a $\Theta(p^{1.5}\log^3 p)$.

## Prim (árbol de expansión mínima)

Con matriz de adyacencia: $n$ iteraciones; en cada una se elige el vértice fuera del árbol con menor *distancia* y se **actualizan** las distancias de los demás.

- Elegir el mínimo: **reducción** de mínimo (par valor-índice).
- Actualizar: §parallel for§ independiente.
- $T_s=\Theta(n^2)$, $T_p=\Theta\!\left(\frac{n^2}{p}+n\log p\right)$ ⇒ isoeficiencia $W=\Theta(p^2\log^2 p)$.

**Dijkstra** es idéntico en estructura (mismo costo y paralelización), sólo cambia la regla de actualización.

## Dónde está el paralelismo

| Algoritmo | Bucle secuencial | Paralelo |
|---|---|---|
| Floyd | $k$ | $(i,j)$ |
| Prim/Dijkstra | selección del siguiente vértice | actualización de distancias + reducción min |

La barrera por iteración ($n$ barreras) limita la escalabilidad cuando $n/p$ es pequeño.
`,
    questions: [
      { id: "gra-1", type: "mc", diff: "facil", q: "En Floyd–Warshall paralelo, ¿qué bucle se mantiene secuencial?", options: ["i", "j", "k", "ninguno"], answer: 2, explain: "Cada iteración $k$ usa el resultado de $k-1$." },
      { id: "gra-2", type: "tf", diff: "facil", q: "En Prim con matriz de adyacencia, la actualización de distancias de cada iteración es paralelizable.", answer: true, explain: "Cada vértice se actualiza de forma independiente." },
      { id: "gra-3", type: "mc", diff: "medio", q: "¿Cuál es el $T_s$ de Floyd–Warshall?", options: ["$\\Theta(n^2)$", "$\\Theta(n^3)$", "$\\Theta(n\\log n)$", "$\\Theta(n^4)$"], answer: 1, explain: "Tres bucles anidados de tamaño $n$." },
      { id: "gra-4", type: "mc", diff: "medio", q: "El costo paralelo de Prim con $p$ hilos es:", options: ["$\\Theta(n^2/p + n\\log p)$", "$\\Theta(n^3/p)$", "$\\Theta(n/p)$", "$\\Theta(n^2\\log p)$"], answer: 0, explain: "$n$ iteraciones; cada una reparte $n$ trabajo y reduce el mínimo en $\\log p$." },
      { id: "gra-5", type: "fill", diff: "dificil", q: "Con $T_s=n^2$ y $T_o = p\\cdot n\\log p$ en Prim, mantener $E$ constante exige $n=\\Theta($ ___ $)$ (forma: §p log p§).", answer: ["p log p", "plogp", "p*log p", "p log(p)", "p·log p"], explain: "$n^2=K p n\\log p \\Rightarrow n=\\Theta(p\\log p)$ ⇒ $W=\\Theta(p^2\\log^2 p)$." },
      { id: "gra-6", type: "tf", diff: "dificil", q: "Dijkstra y Prim tienen la misma estructura de paralelización (selección con reducción de mínimo y actualización paralela).", answer: true, explain: "Sólo cambia la regla de relajación; ambos son $\\Theta(n^2)$ secuencial y $\\Theta(n^2/p+n\\log p)$ paralelo." },
    ],
    cards: [
      { id: "gra-c1", front: "Floyd paralelo", back: "$k$ secuencial; $(i,j)$ en paralelo (collapse(2)). $T_s=\\Theta(n^3)$." },
      { id: "gra-c2", front: "Prim paralelo", back: "Reducción min para elegir vértice + parallel for para actualizar. $T_p=\\Theta(n^2/p+n\\log p)$." },
      { id: "gra-c3", front: "Isoeficiencia de Prim (1D)", back: "$W=\\Theta(p^2\\log^2 p)$." },
      { id: "gra-c4", front: "Isoeficiencia de Floyd (1D)", back: "$W=\\Theta(p^3\\log^3 p)$; con bloques 2D: $\\Theta(p^{1.5}\\log^3 p)$." },
      { id: "gra-c5", front: "Dijkstra vs Prim", back: "Misma estructura y costo; cambia la regla de actualización (distancia acumulada vs peso de arista)." },
    ],
  },
];
