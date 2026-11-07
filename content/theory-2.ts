import { md } from "@/lib/md";
import type { Topic } from "@/lib/types";

export const theory2: Topic[] = [
  {
    id: "memoria",
    title: "Modelo de memoria y flush",
    icon: "🧠",
    blurb: "Visibilidad, flush, ordered, threadprivate y consistencia relajada.",
    reading: md`
## Vista temporal de la memoria

Cada hilo puede mantener valores de variables compartidas en **registros o caché** y no verlos actualizados de inmediato. OpenMP usa un modelo de **consistencia relajada**: sólo hay garantía de visibilidad en ciertos **puntos de sincronización**.

## §flush§

§#pragma omp flush(lista)§ fuerza que la vista temporal del hilo se alinee con la memoria compartida (publica sus escrituras y descarta lecturas obsoletas). Está **implícito** en: §barrier§, entrada/salida de §critical§, §set_lock§/§unset_lock§, fin de construcciones work-sharing (sin §nowait§), entrada/salida de §parallel§, §taskwait§ y operaciones §atomic§ con semántica seq_cst.

Patrón productor/consumidor con bandera: sin flush el consumidor puede **no ver nunca** la bandera (espera activa infinita).

## §ordered§

Dentro de un §for§ con cláusula §ordered§, el bloque §#pragma omp ordered§ se ejecuta **en el orden secuencial de las iteraciones**. El resto del cuerpo sigue en paralelo, útil para imprimir en orden o encadenar dependencias de bucle.

## §threadprivate§

§§§cpp
static int contador;
#pragma omp threadprivate(contador)
§§§

Cada hilo conserva su copia entre regiones paralelas (si el nº de hilos no cambia y §dynamic§ está desactivado). Con §copyin(x)§ el maestro inicializa las copias.

## Jerarquía real

NUMA, líneas de caché de 64 B, *first-touch* (la página queda en el nodo del hilo que la toca primero). Inicializar en paralelo con el **mismo reparto** que el cómputo mejora la localidad.
`,
    questions: [
      { id: "mem-1", type: "mc", diff: "facil", q: "OpenMP garantiza visibilidad de escrituras entre hilos:", options: ["Siempre, inmediatamente", "Sólo en puntos de sincronización (flush implícito/explícito)", "Nunca", "Sólo con §private§"], answer: 1, explain: "Consistencia relajada: barrier, critical, locks, etc. incluyen flush." },
      { id: "mem-2", type: "tf", diff: "facil", q: "Una §barrier§ incluye un §flush§ implícito.", answer: true, explain: "Sí, al igual que entrar/salir de critical y los locks." },
      { id: "mem-3", type: "fill", diff: "medio", q: "La cláusula que hace que el bloque se ejecute en el orden de las iteraciones es §___§.", answer: ["ordered"], explain: "§#pragma omp ordered§ dentro de un for con la cláusula §ordered§." },
      { id: "mem-4", type: "mc", diff: "medio", q: "Un hilo espera con §while(!flag);§ y otro hace §flag=1;§ sin flush. Lo más probable:", options: ["Funciona siempre", "El compilador puede mantener flag en registro y el bucle no termina", "Se produce un deadlock del runtime", "Error de compilación"], answer: 1, explain: "Sin punto de sincronización no hay garantía de visibilidad." },
      { id: "mem-5", type: "mc", diff: "medio", q: "§copyin§ se usa para:", options: ["Copiar datos al heap", "Inicializar variables §threadprivate§ con el valor del maestro", "Copiar arreglos entre procesos", "Hacer reducción"], answer: 1, explain: "Propaga el valor del hilo maestro a las copias threadprivate." },
      { id: "mem-6", type: "tf", diff: "dificil", q: "First-touch significa que la memoria queda asignada al nodo NUMA del hilo que la accede primero.", answer: true, explain: "Por eso conviene inicializar en paralelo con el mismo reparto que el cómputo." },
    ],
    cards: [
      { id: "mem-c1", front: "flush", back: "Alinea la vista temporal del hilo con la memoria compartida. Implícito en barrier, critical, locks, fin de parallel…" },
      { id: "mem-c2", front: "Consistencia relajada", back: "Los hilos pueden ver valores obsoletos salvo en puntos de sincronización." },
      { id: "mem-c3", front: "ordered", back: "Ejecuta el bloque en el orden secuencial de las iteraciones; el resto del cuerpo sigue en paralelo." },
      { id: "mem-c4", front: "threadprivate", back: "Copias persistentes por hilo de variables globales/static; se inicializan con copyin." },
      { id: "mem-c5", front: "First-touch", back: "La página va al nodo NUMA del primer hilo que la toca." },
    ],
  },
  {
    id: "tareas",
    title: "Tareas, taskgroup y depend",
    icon: "🌳",
    blurb: "Paralelismo irregular: recursión, DAGs y dependencias.",
    reading: md`
## §task§

§#pragma omp task§ **encola** una unidad de trabajo que ejecutará cualquier hilo del equipo. Ideal para recursión (quicksort, mergesort, fibonacci), listas y árboles. Patrón típico:

§§§cpp
#pragma omp parallel
#pragma omp single       // un hilo genera las tareas
quicksort(a, 0, n-1);
§§§

- Los datos son §firstprivate§ por defecto en tareas si eran privados al crearla; las compartidas hay que declararlas.
- **Cutoff:** crea tareas sólo si el subproblema es grande (§if(n > UMBRAL)§ o §final§); si no, el overhead supera la ganancia.

## Sincronización de tareas

| Construcción | Espera a |
|---|---|
| §taskwait§ | los **hijos directos** de la tarea actual |
| §taskgroup§ | **todos los descendientes** creados dentro del bloque |
| barrier / fin de parallel | todas las tareas del equipo |

## §depend§

§§§cpp
#pragma omp task depend(out: a)         { a = f(); }
#pragma omp task depend(in:  a) depend(out: b) { b = g(a); }
#pragma omp task depend(in:  a, b)      { h(a, b); }
§§§

Tipos: §in§ (lee), §out§ (escribe), §inout§. El runtime construye el **DAG** de dependencias: una tarea con §in(x)§ espera a la última §out/inout(x)§; un §out§ espera a todos los lectores y escritores previos. Hay dependencias RAW, WAR y WAW.

## Análisis con DAG

$T_1$ = suma de costos de los nodos. $T_\infty$ = camino crítico (ruta de mayor costo). Con $p$ hilos: $T_p \ge \max(T_1/p, T_\infty)$. **Speedup máximo** $= T_1/T_\infty$.

## §taskloop§

Divide un bucle en tareas (§grainsize§, §num_tasks§); útil cuando las iteraciones son muy irregulares.
`,
    questions: [
      { id: "tar-1", type: "mc", diff: "facil", q: "¿Por qué se usa §single§ alrededor de la llamada inicial que crea tareas?", options: ["Para que sólo un hilo genere las tareas y no se dupliquen", "Para que sólo un hilo las ejecute", "Para evitar la barrera", "Para activar el schedule"], answer: 0, explain: "Si todos los hilos llamaran a la función, cada uno crearía el árbol completo de tareas." },
      { id: "tar-2", type: "mc", diff: "facil", q: "§taskwait§ espera a:", options: ["Todas las tareas del programa", "Los hijos directos de la tarea actual", "Todos los hilos", "Ninguna"], answer: 1, explain: "Para esperar también a los nietos usa §taskgroup§." },
      { id: "tar-3", type: "tf", diff: "medio", q: "§taskgroup§ espera a todas las tareas descendientes, §taskwait§ sólo a los hijos.", answer: true, explain: "Diferencia clave entre ambos." },
      { id: "tar-4", type: "mc", diff: "medio", q: "Con §depend(in:x)§ en la tarea B y §depend(out:x)§ en la tarea A creada antes, el runtime:", options: ["Ejecuta B antes que A", "Ejecuta B después de que A termine (RAW)", "Ejecuta ambas a la vez", "Lanza un error"], answer: 1, explain: "Dependencia RAW: B lee lo que A escribe." },
      { id: "tar-5", type: "fill", diff: "medio", q: "Para evitar crear tareas diminutas en una recursión se define un ___ (palabra: *cutoff* en español: umbral).", answer: ["umbral", "cutoff", "threshold"], explain: "Sin umbral, el overhead de crear tareas domina." },
      { id: "tar-6", type: "mc", diff: "dificil", q: "Un DAG tiene costos A=2, B=3, C=4, D=1 con A→B, A→C, B→D, C→D. ¿Cuál es $T_1$ y $T_\\infty$?", options: ["T1=10, T∞=7", "T1=10, T∞=6", "T1=7, T∞=10", "T1=10, T∞=10"], answer: 0, explain: "$T_1=2+3+4+1=10$. Camino crítico A→C→D = 2+4+1 = 7." },
      { id: "tar-7", type: "tf", diff: "dificil", q: "Con $T_1=10$ y $T_\\infty=7$, usar 8 hilos puede dar speedup mayor que $10/7$.", answer: false, explain: "El speedup máximo es $T_1/T_\\infty = 10/7 ≈ 1.43$ sin importar el número de hilos." },
    ],
    cards: [
      { id: "tar-c1", front: "taskwait vs taskgroup", back: "taskwait: hijos directos. taskgroup: todos los descendientes del bloque." },
      { id: "tar-c2", front: "depend(in/out/inout)", back: "in lee, out escribe, inout ambos. Genera el DAG (RAW, WAR, WAW)." },
      { id: "tar-c3", front: "Cutoff en tareas", back: "Sólo crear tareas si el subproblema es grande: §if(n>U)§/§final§." },
      { id: "tar-c4", front: "Speedup máximo en un DAG", back: "$T_1/T_\\infty$ (el paralelismo del programa)." },
      { id: "tar-c5", front: "Patrón parallel+single", back: "Un hilo genera las tareas; el resto del equipo las ejecuta." },
      { id: "tar-c6", front: "taskloop", back: "Parte un bucle en tareas (grainsize/num_tasks); útil para trabajo irregular." },
    ],
  },
  {
    id: "hibrido",
    title: "Modelo híbrido MPI+OpenMP",
    icon: "🧩",
    blurb: "Jerarquía nodos × hilos, niveles de soporte de hilos y reparto.",
    reading: md`
## ¿Por qué híbrido?

Un clúster tiene muchos nodos y cada nodo muchos núcleos con memoria compartida. **MPI entre nodos + OpenMP dentro** reduce el número de procesos (menos memoria duplicada y menos mensajes) y se adapta a la jerarquía.

Si hay $P$ procesos MPI y $T$ hilos por proceso, el total de unidades de cómputo es $P\times T$.

## Niveles de soporte de hilos de MPI

| Nivel | Significado |
|---|---|
| §MPI_THREAD_SINGLE§ | un hilo |
| §MPI_THREAD_FUNNELED§ | varios hilos, pero **sólo el maestro** llama a MPI |
| §MPI_THREAD_SERIALIZED§ | cualquier hilo, pero **uno a la vez** |
| §MPI_THREAD_MULTIPLE§ | cualquier hilo, concurrentemente |

Se inicializa con §MPI_Init_thread(&argc,&argv, requerido, &provisto)§.

## Estrategias de reparto

Primero se particiona el dominio entre procesos (cada uno con su bloque local) y dentro del proceso se usa §parallel for§ sobre el bloque. Para **intercambiar fronteras** (halo/ghost cells) un solo hilo (§master§ o fuera de la región paralela) hace el §MPI_Sendrecv§.

## Trade-offs

- Menos mensajes pero más sincronización de hilos.
- Se debe evitar que los hilos del mismo proceso compitan por el mismo recurso (NIC) sin necesidad.
- Mapeo/afinidad: un proceso por socket y un hilo por núcleo suele ser buen punto de partida.
`,
    questions: [
      { id: "hib-1", type: "mc", diff: "facil", q: "En §MPI_THREAD_FUNNELED§ quién puede llamar a MPI:", options: ["Cualquier hilo a la vez", "Sólo el hilo maestro", "Ninguno", "Un hilo por vez, cualquiera"], answer: 1, explain: "FUNNELED: varios hilos, pero las llamadas MPI las hace sólo el hilo que inicializó MPI." },
      { id: "hib-2", type: "mc", diff: "facil", q: "Con 4 procesos MPI y 8 hilos OpenMP por proceso, ¿cuántos hilos de cómputo hay en total?", options: ["12", "32", "4", "8"], answer: 1, explain: "$4\\times 8 = 32$." },
      { id: "hib-3", type: "tf", diff: "medio", q: "El modelo híbrido suele reducir el número de mensajes entre nodos frente a MPI puro con un proceso por núcleo.", answer: true, explain: "Menos procesos ⇒ menos comunicación inter-nodo y menos datos replicados." },
      { id: "hib-4", type: "fill", diff: "medio", q: "El nivel de soporte de hilos más permisivo de MPI es §MPI_THREAD____§.", answer: ["MULTIPLE", "multiple"], explain: "THREAD_MULTIPLE permite llamadas concurrentes desde cualquier hilo." },
      { id: "hib-5", type: "mc", diff: "dificil", q: "Para intercambiar halos usando §FUNNELED§ dentro de una región paralela, lo correcto es:", options: ["Que todos los hilos llamen MPI_Sendrecv", "Usar §master§ (con barrier antes y después según corresponda) para la comunicación", "Usar §atomic§", "No se puede"], answer: 1, explain: "Sólo el maestro llama a MPI; se necesitan barreras para que los demás hilos no lean halos antes de recibirlos." },
    ],
    cards: [
      { id: "hib-c1", front: "Niveles MPI_THREAD_*", back: "SINGLE < FUNNELED (sólo maestro) < SERIALIZED (uno a la vez) < MULTIPLE (concurrente)." },
      { id: "hib-c2", front: "¿Por qué híbrido?", back: "Aprovecha jerarquía: MPI entre nodos, OpenMP dentro. Menos mensajes y memoria replicada." },
      { id: "hib-c3", front: "Halo / ghost cells", back: "Filas/columnas de frontera copiadas del vecino para calcular el borde local." },
      { id: "hib-c4", front: "Total de unidades", back: "$P$ procesos × $T$ hilos." },
    ],
  },
  {
    id: "edp",
    title: "EDP: calor y Jacobi",
    icon: "🔥",
    blurb: "Stencils, diferencias finitas, doble buffer y descomposición de dominio.",
    reading: md`
## Ecuación del calor 1D

$$\frac{\partial u}{\partial t} = \alpha \frac{\partial^2 u}{\partial x^2}$$

Con diferencias finitas explícitas (FTCS), con $r=\alpha\,\Delta t/\Delta x^2$:

$$u_i^{t+1} = u_i^{t} + r\,(u_{i-1}^{t} - 2u_i^{t} + u_{i+1}^{t})$$

**Estabilidad:** $r\le 1/2$.

## Estructura paralela

Cada punto del nuevo paso sólo depende del paso **anterior** ⇒ las $n$ actualizaciones son independientes: §parallel for§ con **dos buffers** (leer de §old§, escribir en §new§ y luego intercambiar punteros). Entre pasos de tiempo hay una barrera implícita.

Sobrecosto de sincronización: una barrera por paso de tiempo ($T$ pasos).

## Jacobi 2D

$$u_{i,j}^{new} = \tfrac14\left(u_{i-1,j}+u_{i+1,j}+u_{i,j-1}+u_{i,j+1}\right)$$

Iterar hasta que el residuo $\max|u^{new}-u|<\varepsilon$ (reducción §max§). **Gauss-Seidel** converge más rápido pero tiene dependencias entre iteraciones (necesita red-black para paralelizar).

## Complejidad

Con $n$ puntos y $T$ pasos: $T_s=\Theta(nT)$. Con $p$ hilos $T_p=\Theta\!\left(\tfrac{nT}{p}+T\log p\right)$ (barrera por paso). En el modelo distribuido por bloques, cada paso comunica $O(1)$ valores por frontera (1D) o $O(n/\sqrt p)$ (2D).

**Optimización clave:** precalcular términos constantes (como la fuente de calor) fuera del bucle de tiempo evita recomputar y mejora mucho el tiempo.
`,
    questions: [
      { id: "edp-1", type: "mc", diff: "facil", q: "¿Por qué se usan dos buffers en el stencil de calor?", options: ["Para ahorrar memoria", "Porque actualizar en sitio lee valores nuevos y viejos mezclados (carrera)", "Para usar más hilos", "Por la caché"], answer: 1, explain: "Cada punto lee vecinos del paso anterior; si se sobrescribe en sitio, otro hilo podría leer ya el valor nuevo." },
      { id: "edp-2", type: "tf", diff: "facil", q: "Las $n$ actualizaciones de un paso de tiempo son independientes entre sí.", answer: true, explain: "Sólo dependen del paso anterior." },
      { id: "edp-3", type: "fill", diff: "medio", q: "La condición de estabilidad del método explícito FTCS en 1D es $r \\le$ ___ (decimal).", answer: ["0.5", "1/2", ".5"], explain: "$r=\\alpha\\Delta t/\\Delta x^2\\le 1/2$." },
      { id: "edp-4", type: "mc", diff: "medio", q: "El criterio de parada de Jacobi se paraleliza con:", options: ["§atomic§", "§reduction(max:err)§", "§single§", "§ordered§"], answer: 1, explain: "Cada hilo calcula un máximo parcial del residuo; se combinan con max." },
      { id: "edp-5", type: "mc", diff: "dificil", q: "Para un stencil 2D $n\\times n$ distribuido en $p$ procesos (cuadrados), el volumen de comunicación por paso por proceso es:", options: ["$O(n^2/p)$", "$O(n/\\sqrt p)$", "$O(1)$", "$O(n)$"], answer: 1, explain: "Es proporcional al perímetro del bloque: $4\\cdot n/\\sqrt p$." },
      { id: "edp-6", type: "tf", diff: "dificil", q: "Gauss-Seidel se paraleliza directamente con §parallel for§ igual que Jacobi.", answer: false, explain: "Usa valores ya actualizados en la misma pasada: hay dependencias. Se requiere red-black u otro esquema." },
    ],
    cards: [
      { id: "edp-c1", front: "FTCS 1D", back: "$u_i^{t+1}=u_i^t+r(u_{i-1}-2u_i+u_{i+1})$, $r=\\alpha\\Delta t/\\Delta x^2\\le 1/2$." },
      { id: "edp-c2", front: "Jacobi 2D", back: "Promedio de los 4 vecinos del paso anterior; iterar hasta residuo < ε (reduction max)." },
      { id: "edp-c3", front: "Doble buffer", back: "Leer de old, escribir en new, intercambiar punteros: evita carreras en stencils." },
      { id: "edp-c4", front: "Costo de calor paralelo", back: "$T_p=\\Theta(nT/p + T\\log p)$: trabajo repartido + barrera por paso." },
      { id: "edp-c5", front: "Halo en 2D", back: "Cada bloque $n/\\sqrt p$ intercambia sus 4 bordes: $O(n/\\sqrt p)$ por paso." },
    ],
  },
];
