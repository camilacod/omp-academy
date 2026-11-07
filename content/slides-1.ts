import type { Deck } from "@/lib/types";
import { md, code } from "@/lib/md";

// Resúmenes propios (no se copian las diapositivas): una tarjeta por idea, siguiendo el orden de cada PDF.

export const decks1: Deck[] = [
  {
    id: "u4-1",
    unit: "U4.1",
    title: "OpenMP: modelo, regiones paralelas y trabajo compartido",
    pdf: "U4.1 Paralelismo compartido-OMP",
    intro: md`Primera clase de OpenMP: qué es, cómo funciona el modelo fork–join, las directivas de §parallel§, §for§, §sections§, §single§, la sincronización básica y las cláusulas de alcance de datos.`,
    slides: [
      {
        title: "¿Qué es OpenMP?",
        note: "Diapos 3–5",
        bullets: [
          md`API **portable y escalable** para memoria compartida en C/C++ y Fortran; se apoya en **directivas de compilador, una librería y variables de entorno**.`,
          md`Corre en máquinas multiprocesador **UMA o ccNUMA**: todos los hilos ven el mismo espacio de direcciones.`,
          md`Evolución: 1.0 (1997 Fortran, 1998 C/C++) → 2.5 (2005) → 3.0 (2008, §task§) → 4.0 (2013) → 5.0 (2018) → 6.0 (2024).`,
          md`Es estándar en la industria y en centros HPC: la comunidad de uso creció de 11 a 22 centros entre 2008 y 2020.`,
        ],
      },
      {
        title: "Modelo fork–join",
        note: "Diapo 6",
        bullets: [
          md`OpenMP paraleliza con **hilos** (la unidad más pequeña que el SO puede planificar). El usuario decide cuántos.`,
          md`El programa arranca con el **hilo maestro** (id 0).`,
          md`**FORK**: al llegar a una región paralela el maestro crea un equipo de hilos.`,
          md`**JOIN**: al terminar, los hilos se sincronizan y desaparecen; sigue solo el maestro.`,
        ],
        formula: String.raw`T_p \approx T_{\text{serie}} + \frac{T_{\text{paralelo}}}{p} + T_{\text{fork/join}}`,
      },
      {
        title: "OpenMP vs MPI",
        note: "Diapos 7–8",
        bullets: [
          md`**OpenMP**: hilos de un **mismo proceso** comparten memoria; se coordinan con barreras, atomics, locks. Cambios incrementales sobre código secuencial.`,
          md`**MPI**: **procesos** con memoria propia que se comunican enviando mensajes; escala a miles de nodos pero exige reescribir la lógica.`,
          md`Si dudas en el examen: *memoria compartida → OpenMP; memoria distribuida → MPI; clúster de nodos multinúcleo → híbrido* (U4.5).`,
        ],
      },
      {
        title: "Tu primer pragma",
        note: "Diapo 9",
        bullets: [
          md`OpenMP nació para paralelizar **bucles con iteraciones independientes**.`,
          md`Una directiva es un **comentario sintáctico**: si compilas sin §-fopenmp§ el compilador la ignora y obtienes el programa secuencial.`,
          md`El maestro abre la región, las iteraciones se reparten y al final los hilos se unen.`,
        ],
        code: code`
#include <omp.h>
int main() {
  double resultado[1000];
  #pragma omp parallel for
  for (int i = 0; i < 1000; i++)
    calculo_pesado(resultado[i]);   // iteraciones independientes
}
`,
      },
      {
        title: "Las tres piezas de OpenMP",
        note: "Diapos 10–12",
        bullets: [
          md`**Directivas**: abren regiones paralelas, reparten iteraciones o secciones, serializan bloques y sincronizan.`,
          md`**Librería** (§omp_get_thread_num§, §omp_get_num_threads§, §omp_set_num_threads§, §omp_get_wtime§…): consultar y ajustar en tiempo de ejecución.`,
          md`**Variables de entorno** (§OMP_NUM_THREADS§, §OMP_SCHEDULE§…): controlan la ejecución sin recompilar.`,
          md`Soporte: GCC ≥ 4.9 (OpenMP 4.0), GCC ≥ 9 (5.0), Intel y LLVM/Clang 12 (5.0).`,
        ],
      },
      {
        title: "Región paralela y cláusulas",
        note: "Diapos 13–14",
        bullets: [
          md`§#pragma omp parallel§ duplica el bloque: **cada hilo ejecuta todo el código** de la región. El maestro es el hilo 0.`,
          md`Cláusulas: §if§, §num_threads§, §private§, §shared§, §default(shared|none)§, §firstprivate§, §reduction§, §copyin§.`,
          md`Patrón clásico: todos saludan con su id y solo el hilo 0 imprime el total de hilos.`,
        ],
        code: code`
int nthreads, tid;
#pragma omp parallel private(tid)
{
  tid = omp_get_thread_num();
  printf("Hola desde el hilo %d\n", tid);
  if (tid == 0) {                       // solo el maestro
    nthreads = omp_get_num_threads();
    printf("Hilos: %d\n", nthreads);
  }
}   // join implícito
`,
      },
      {
        title: "Trabajo compartido: for",
        note: "Diapos 15–16",
        bullets: [
          md`§#pragma omp for§ **no crea hilos**: reparte las iteraciones entre los hilos que ya existen (paralelismo de datos).`,
          md`Cláusulas: §private§, §firstprivate§, §lastprivate§, §reduction§, §schedule(kind[,chunk])§, §collapse(n)§, §ordered§, §nowait§.`,
          md`Hay una **barrera implícita** al final del bucle, salvo que uses §nowait§.`,
        ],
      },
      {
        title: "schedule: cómo se reparten las iteraciones",
        note: "Diapos 16–17",
        bullets: [
          md`**static[,chunk]**: bloques fijos de tamaño §chunk§ asignados por adelantado (sin chunk: trozos iguales). Cero costo de planificación.`,
          md`**dynamic[,chunk]**: cada hilo pide un bloque cuando termina el anterior. Ideal si las iteraciones tienen **costo desigual**.`,
          md`**guided[,chunk]**: como dynamic, pero el tamaño del bloque **decrece exponencialmente**.`,
          md`**runtime**: se decide al ejecutar con §OMP_SCHEDULE§ (no se da chunk en el código). **auto**: decide el compilador.`,
        ],
      },
      {
        title: "nowait y directivas combinadas",
        note: "Diapos 18–19 y 23",
        bullets: [
          md`§nowait§ quita la barrera final: un hilo que termina pasa directo a lo siguiente. Es seguro solo si lo que viene **no depende** del bucle anterior.`,
          md`Se pueden fusionar: §#pragma omp parallel for§ y §#pragma omp parallel sections§ equivalen a abrir la región y el reparto en una sola línea.`,
          md`**Ojo**: §sections§ dentro de un §parallel for§ no es válido; elige el constructor que corresponde a la estructura.`,
        ],
        code: code`
#pragma omp parallel shared(a,b,c,chunk) private(i)
{
  #pragma omp for schedule(dynamic, chunk) nowait
  for (i = 0; i < N; i++)
    c[i] = a[i] + b[i];
}
`,
      },
      {
        title: "sections",
        note: "Diapos 20–21",
        bullets: [
          md`Cada §#pragma omp section§ es un bloque que ejecuta **un solo hilo, una sola vez**; secciones distintas pueden ir a hilos distintos (paralelismo de **tareas fijas**).`,
          md`Barrera implícita al final, salvo §nowait§. No uses §goto§ para entrar o salir de una sección.`,
          md`Limitación: el paralelismo máximo es el **número de secciones** (en el ejemplo, 4).`,
        ],
        code: code`
#pragma omp parallel
{
  #pragma omp sections
  {
    #pragma omp section
    { a = ...; b = ...; }
    #pragma omp section
    { c = ...; d = ...; }
  }
}
`,
      },
      {
        title: "single y master",
        note: "Diapos 22 y 24",
        bullets: [
          md`**single**: lo ejecuta **un solo hilo (cualquiera)**; los demás esperan en una barrera implícita (se evita con §nowait§). Útil para E/S y para inicializar.`,
          md`**master**: lo ejecuta **solo el hilo 0** y los demás **no esperan** (no hay barrera).`,
          md`Diferencia clave: single → barrera al final, hilo elegido por el runtime; master → sin barrera, siempre el 0.`,
        ],
      },
      {
        title: "critical y barrier",
        note: "Diapos 25–27",
        bullets: [
          md`**critical**: un hilo a la vez dentro del bloque; los demás se bloquean hasta que salga. Se pueden **nombrar** regiones críticas independientes.`,
          md`Ejemplo típico: contar casos especiales (§cnt++§) dentro de un §for§ mientras el resto del cuerpo sigue en paralelo.`,
          md`**barrier**: todos esperan a todos antes de seguir; después continúan en paralelo.`,
        ],
        code: code`
#pragma omp for
for (int i = 0; i < 20; i++) {
  if (b[i] == 0) {
    #pragma omp critical
    cnt++;
  }
  a[i] = b[i] + f * (i - 1);
}
`,
      },
      {
        title: "atomic, flush y ordered",
        note: "Diapos 28–30",
        bullets: [
          md`**atomic**: mini-critical **solo para la sentencia siguiente** (actualización de una posición de memoria). Más barato que critical.`,
          md`**flush**: punto donde la memoria vista por el hilo se vuelve consistente con la global. Está implícito en barrier, entrada/salida de parallel, critical, ordered y al final de for/sections/single.`,
          md`**ordered**: ejecuta el bloque en el **orden secuencial de las iteraciones**; el bucle debe declarar §ordered§. Una iteración no puede pasar dos veces por ordered.`,
        ],
      },
      {
        title: "Alcance de datos: shared y private",
        note: "Diapos 31–32",
        bullets: [
          md`En memoria compartida las variables son **compartidas por defecto**; las excepciones: índices de bucle y variables locales declaradas dentro de la región.`,
          md`**shared**: una sola ubicación de memoria visible por todos. Si varios escriben, necesitas critical/atomic/reduction.`,
          md`**private**: cada hilo recibe una copia **sin inicializar**; al salir no afecta al original.`,
        ],
      },
      {
        title: "default, firstprivate, lastprivate, copyin, copyprivate",
        note: "Diapos 33–34",
        bullets: [
          md`**default(shared|none)**: política por defecto (solo una vez por §parallel§). §none§ obliga a declarar cada variable.`,
          md`**firstprivate**: privada **inicializada con el valor original**.`,
          md`**lastprivate**: privada y al final el original recibe el valor de la **última iteración (o sección)** lógica.`,
          md`**copyin**: da a cada hilo el valor de las variables §threadprivate§. **copyprivate**: difunde el valor producido en un §single§.`,
        ],
      },
      {
        title: "reduction",
        note: "Diapos 35–37",
        bullets: [
          md`Cada hilo trabaja con una **copia privada** inicializada con la identidad del operador (0 para §+§, 1 para §*§); al final se **combinan** en la variable original.`,
          md`Evita carreras sin pagar un critical en cada iteración.`,
          md`La variable debe ser **escalar** y declararse shared. Aquí un producto punto con schedule estático.`,
        ],
        code: code`
#pragma omp parallel for default(shared) private(i) \
        schedule(static, chunk) reduction(+:result)
for (int i = 0; i < n; i++)
  result += a[i] * b[i];
`,
      },
      {
        title: "Directivas que no aceptan cláusulas",
        note: "Diapo 38",
        bullets: [
          md`No admiten cláusulas: §master§, §critical§ (solo nombre), §barrier§, §atomic§, §flush§ (solo lista), §ordered§ y §threadprivate§.`,
          md`Mnemotecnia de examen: *si es de sincronización pura, casi no tiene cláusulas; si reparte trabajo (for, sections, single), sí*.`,
        ],
      },
    ],
    links: [
      { label: "Lección: Regiones paralelas", href: "/aprende/parallel" },
      { label: "Lección: schedule", href: "/aprende/schedule" },
      { label: "Lección: sections y single", href: "/aprende/sections-single" },
      { label: "Teoría: Trabajo compartido", href: "/teoria/worksharing" },
    ],
  },
  {
    id: "u4-2",
    unit: "U4.2",
    title: "OpenMP: sincronización y alcance de datos en detalle",
    pdf: "U4.2 Paralelismo compartido-OMP",
    intro: md`Segunda parte: ejemplos a fondo de §master§, §critical§, §barrier§, las cuatro formas de §atomic§, §ordered§ y las cláusulas §private§, §firstprivate§, §lastprivate§, §threadprivate§ y §reduction§ con sus trampas.`,
    slides: [
      {
        title: "master: solo el hilo 0",
        note: "Diapos 4–5",
        bullets: [
          md`El bloque lo ejecuta únicamente el maestro, **sin barrera** al entrar ni salir.`,
          md`Ejemplo: iteración de relajación con §reduction(+:toobig)§; el maestro cuenta iteraciones e imprime el progreso mientras los demás ya pasan a la siguiente fase.`,
          md`Como no hay barrera, usa master para tareas que **nadie más necesita** (contadores, mensajes).`,
        ],
      },
      {
        title: "critical con nombre",
        note: "Diapo 6",
        bullets: [
          md`Un hilo espera si **cualquier** otro está dentro de una región crítica **con el mismo nombre**.`,
          md`Sin nombre, todas las regiones críticas del programa comparten un único cerrojo.`,
          md`Ejemplo: dos colas independientes (§xaxis§ e §yaxis§): sacar una tarea de cada cola es crítico, pero no entre colas distintas.`,
        ],
        code: code`
#pragma omp critical(xaxis)
  ix = dequeue(xaxis);
#pragma omp critical(yaxis)
  iy = dequeue(yaxis);
`,
      },
      {
        title: "barrier se enlaza con la región más cercana",
        note: "Diapo 7",
        bullets: [
          md`Un §barrier§ pertenece a la **región paralela más interna que lo contiene**, aunque esté en una función llamada desde ella.`,
          md`**Todos** los hilos del equipo deben llegar a él; si alguno no llega, el programa se cuelga.`,
          md`Si una subrutina con barrier se llama fuera de región paralela, el barrier no hace nada.`,
        ],
      },
      {
        title: "atomic: accesos exclusivos a una dirección",
        note: "Diapos 8–9",
        bullets: [
          md`Garantiza acceso exclusivo a la misma ubicación **x** respecto a otros atomics sobre **x**, sin importar en qué bloque estén.`,
          md`**read**: lectura atómica (§v = x;§).`,
          md`**write**: escritura atómica (§x = expr;§).`,
        ],
      },
      {
        title: "atomic update y capture",
        note: "Diapos 10–12",
        bullets: [
          md`**update**: §x++§, §--x§, §x binop= expr§, §x = x binop expr§; binop ∈ {+, *, -, /, &, ^, |, <<, >>}.`,
          md`**capture**: actualiza y además **captura** el valor viejo o nuevo en §v§ (§v = x++;§, §v = ++x;§, §v = x += expr;§).`,
          md`Forma de bloque: §{ v = x; x += expr; }§ captura el valor **anterior**; §{ x += expr; v = x; }§ el **posterior**.`,
        ],
        code: code`
int v;
#pragma omp atomic capture
v = x++;          // v = valor viejo de x; x queda +1
`,
      },
      {
        title: "atomic vs critical",
        note: "Diapos 13–14",
        bullets: [
          md`Con **atomic** los hilos que actualizan posiciones **distintas** no se bloquean; con critical se serializan todas las actualizaciones.`,
          md`Atomic protege **solo la sentencia siguiente**: si hay otra sentencia que toca otros elementos (p. ej. §y[i]§), esos no quedan protegidos.`,
          md`Regla: si la operación es un simple update sobre un escalar, **atomic**; si protege varias sentencias, **critical**.`,
        ],
      },
      {
        title: "ordered",
        note: "Diapos 15–18",
        bullets: [
          md`Ejecuta un bloque **en el orden de las iteraciones**, mientras el resto del cuerpo del bucle va en paralelo.`,
          md`La iteración 0 entra sin esperar; las siguientes esperan a que las anteriores terminen su ordered.`,
          md`El bucle debe llevar la cláusula §ordered§ en el §for§.`,
          md`**Válido**: varios ordered en el bucle si cada iteración ejecuta **a lo sumo uno** (por ejemplo, if/else). **Inválido**: dos ordered consecutivos en la misma iteración.`,
        ],
        code: code`
#pragma omp parallel for ordered schedule(dynamic)
for (int i = 0; i < n; i++) {
  trabajo(i);                 // en paralelo
  #pragma omp ordered
  printf("%d\n", i);          // sale 0,1,2,...
}
`,
      },
      {
        title: "private",
        note: "Diapos 19–20",
        bullets: [
          md`Cada tarea/hilo obtiene una **copia nueva** de la variable; las referencias dentro de la región apuntan a la copia.`,
          md`El original **no cambia** al salir (en el ejemplo, §i§ y §j§ valen lo mismo antes y después).`,
          md`Una variable que es **parte de otra** (un elemento de array o un campo de struct) no puede ir en la lista private.`,
          md`Trampa: si accedes al original por **puntero**, sí puedes modificarlo.`,
        ],
      },
      {
        title: "firstprivate y lastprivate",
        note: "Diapos 21–22",
        bullets: [
          md`**firstprivate**: privada, inicializada con el valor que tenía la variable original al **entrar**.`,
          md`**lastprivate**: privada; al **salir**, el original recibe el valor de la última iteración lógica (o última sección), como en la ejecución secuencial.`,
          md`Úsalo cuando el código posterior depende del valor de §i§ o de una variable calculada en la última vuelta.`,
        ],
        code: code`
int ult;
#pragma omp parallel for lastprivate(ult)
for (int i = 0; i < 100; i++)
  ult = i * i;
// aquí ult == 99*99, igual que en secuencial
`,
      },
      {
        title: "threadprivate",
        note: "Diapos 23–24",
        bullets: [
          md`Es una **directiva** (no cláusula) que replica una variable **global/estática**: cada hilo tiene su propia copia **persistente entre regiones paralelas**.`,
          md`Cada copia se inicializa una vez; para propagar el valor del maestro a todos al entrar usa §copyin§.`,
          md`Diferencia con private: private vive solo dentro de la región; threadprivate sobrevive de una región a la siguiente.`,
        ],
      },
      {
        title: "reduction y su trampa de inicialización",
        note: "Diapos 25–26",
        bullets: [
          md`Se crea una copia privada por hilo con la identidad del operador; al final el original se actualiza combinando todas las copias.`,
          md`**Trampa**: si haces §a = 0;§ dentro de la región y a continuación un §for reduction(+:a)§, esa inicialización no está sincronizada con la actualización final de la reducción: el valor puede quedar errado.`,
          md`Soluciones: (1) **inicializar antes** de abrir la región, (2) poner un §barrier§ después de §a = 0§, o (3) hacerlo dentro de un §single§ (barrera implícita).`,
        ],
      },
    ],
    links: [
      { label: "Lección: Sincronización", href: "/aprende/sincronizacion" },
      { label: "Lección: reduction", href: "/aprende/reduction" },
      { label: "Lección: ordered y memoria", href: "/aprende/memoria-ordered" },
      { label: "Reto: Histograma", href: "/problemas/histograma" },
      { label: "Reto: Orden en el log", href: "/problemas/ordered-log" },
    ],
  },
  {
    id: "u4-3",
    unit: "U4.3",
    title: "OpenMP: memoria, ICVs, tareas y dependencias",
    pdf: "U4.3 Paralelismo compartido-OMP",
    intro: md`Cómo ven la memoria los hilos (flush implícito), las variables de control interno, ejemplos de §parallel§, §sections§, §nowait§, §collapse§ y, sobre todo, el modelo de **tareas** con §depend§, §taskwait§, §taskgroup§ y §taskyield§.`,
    slides: [
      {
        title: "Uso de memoria: ¿qué lee cada hilo?",
        note: "Diapos 4–5",
        bullets: [
          md`El hilo 0 escribe §x = 5§ y el hilo 1 lee §x§ **sin sincronización**: puede ver 2 o 5 (carrera de datos).`,
          md`Un §barrier§ tiene **flush implícito**: tras él todos ven el valor escrito antes. Por eso los prints posteriores sí garantizan 5.`,
          md`Moraleja: la visibilidad entre hilos la crea la **sincronización**, no el orden en el que escribes el código.`,
        ],
        code: code`
if (omp_get_thread_num() == 0) x = 5;
else printf("1: x=%d\n", x);        // puede ser 2 o 5
#pragma omp barrier                   // flush implícito
printf("2/3: x=%d\n", x);            // ahora siempre 5
`,
      },
      {
        title: "Variables de control interno (ICV)",
        note: "Diapos 6–7",
        bullets: [
          md`Cada tarea de una región paralela recibe **su copia de las ICV**, que gobiernan el comportamiento del programa.`,
          md`§omp_set_num_threads(n)§: hilos de la **siguiente** región. §omp_set_max_active_levels(n)§: tope de niveles anidados activos.`,
          md`§omp_set_nested(b)§: habilita/deshabilita paralelismo anidado. §omp_set_dynamic(b)§: permite al runtime ajustar el número de hilos.`,
        ],
      },
      {
        title: "ICV en regiones anidadas",
        note: "Diapos 8–9",
        bullets: [
          md`La región externa crea un equipo de **2 hilos**; dentro, cada hilo fija 3 y crea un equipo de **3 hilos**; dentro del anidado se asigna 4 para la próxima región.`,
          md`El §single§ externo imprime **una vez**; el interno imprime **dos veces** (uno por cada equipo interno).`,
          md`Cada hilo modifica **su propia copia** de la ICV: lo que ajustas en una región no se propaga a otras tareas hermanas.`,
        ],
      },
      {
        title: "parallel de grano grueso",
        note: "Diapos 10–11",
        bullets: [
          md`Paralelismo **SPMD**: cada hilo calcula con §omp_get_thread_num()§ y §omp_get_num_threads()§ qué trozo del arreglo le toca.`,
          md`El **último hilo** absorbe el resto cuando §n§ no divide exacto.`,
          md`Es lo que hace internamente un §for§ estático; escribirlo a mano da control total del reparto.`,
        ],
        code: code`
iam = omp_get_thread_num();  nt = omp_get_num_threads();
ipoints = npoints / nt;      istart = iam * ipoints;
if (iam == nt - 1)           ipoints = npoints - istart;
subdomain(x, istart, ipoints);
`,
      },
      {
        title: "sections con firstprivate",
        note: "Diapo 12",
        bullets: [
          md`§firstprivate(section_count)§ da a cada hilo una copia inicial en 0.`,
          md`Si las dos secciones corren en **hilos distintos**, ambas imprimen 1. Si las ejecuta el **mismo hilo**, una imprime 1 y la otra 2.`,
          md`El resultado depende de la planificación: no asumas qué hilo ejecuta qué sección.`,
        ],
      },
      {
        title: "nowait entre bucles dependientes",
        note: "Diapo 13",
        bullets: [
          md`Tres bucles consecutivos con §schedule(static) nowait§: cada uno lee lo que **él mismo** escribió en el bucle anterior.`,
          md`Es seguro porque static reparte **la misma secuencia de iteraciones a los mismos hilos** en cada bucle, y todos tienen igual número de iteraciones.`,
          md`Con §dynamic§ o con tamaños distintos, el nowait **rompería** la dependencia.`,
        ],
      },
      {
        title: "collapse",
        note: "Diapo 14",
        bullets: [
          md`§collapse(2)§ fusiona dos bucles anidados en **un único espacio de iteraciones** (k×j) que se reparte entre hilos: más paralelismo cuando el bucle externo es corto.`,
          md`El orden del espacio colapsado sigue el orden secuencial; por eso con §lastprivate§ los últimos valores son k = 2 y j = 3 (el ejemplo imprime §2 3§).`,
          md`Los bucles deben estar **perfectamente anidados** y ser rectangulares.`,
        ],
        code: code`
#pragma omp for collapse(2) lastprivate(jlast, klast)
for (k = 1; k <= 2; k++)
  for (j = 1; j <= 3; j++) { jlast = j; klast = k; }
// imprime: 2 3
`,
      },
      {
        title: "single en secuencia",
        note: "Diapo 15",
        bullets: [
          md`Cada §single§ lo ejecuta un solo hilo; los demás se detienen en la **barrera implícita** al final.`,
          md`El último puede llevar §nowait§ para que nadie espere y se pase directo a §work2§.`,
          md`Útil para mensajes de avance y E/S dentro de una región paralela.`,
        ],
      },
      {
        title: "task: tareas explícitas",
        note: "Diapos 16–17",
        bullets: [
          md`§#pragma omp task§ crea una **tarea** que el hilo que la encuentra ejecuta **ya** o **difiere** para que cualquier hilo del equipo la ejecute.`,
          md`Cláusulas: §if§, §untied§, §default§, §private§, §shared§, §firstprivate§, §depend§.`,
          md`Patrón estándar: §parallel§ + §single§ para que **un solo hilo genere** las tareas y el equipo las consuma. Las tres tareas imprimen en orden aleatorio.`,
        ],
        code: code`
#pragma omp parallel num_threads(2)
#pragma omp single
{
  #pragma omp task
  printf("t1 desde hilo %d\n", omp_get_thread_num());
  #pragma omp task
  printf("t2 desde hilo %d\n", omp_get_thread_num());
}
`,
      },
      {
        title: "depend: in, out, inout",
        note: "Diapos 18–19",
        bullets: [
          md`§depend(in: x)§: la tarea **lee** x y espera a toda tarea anterior con §out§ o §inout§ sobre x.`,
          md`§depend(out: x)§ / §inout§: la tarea **escribe**; espera a toda tarea anterior con §in§, §out§ o §inout§ sobre x.`,
          md`El orden se determina por el **orden de creación** y las variables nombradas, no por la posición en el archivo de la parte ejecutada.`,
          md`Ejemplo: §out: x§ (x = 2) seguido de §in: x§ (printf) → imprime **x = 2**.`,
        ],
      },
      {
        title: "depend: el orden de creación manda",
        note: "Diapos 20–21",
        bullets: [
          md`Si primero se crea la tarea **in** (imprime) y luego la **out** (x = 2), la lectora no espera: imprime **x = 1**.`,
          md`Dos tareas §out§ sobre x se serializan (la primera x = 1, la segunda x = 2) y un §taskwait§ antes del print asegura que ambas acabaron → imprime **x = 2**.`,
          md`Sin §taskwait§ o dependencia, el print podría correr antes que las tareas.`,
        ],
        code: code`
#pragma omp task depend(out: x)  x = 1;
#pragma omp task depend(out: x)  x = 2;
#pragma omp taskwait
printf("x=%d\n", x);                 // x=2
`,
      },
      {
        title: "Concurrencia entre lectoras",
        note: "Diapo 22",
        bullets: [
          md`Una tarea §out: x§ seguida de **dos** tareas §in: x§: ambas lectoras dependen de la primera, pero **no entre ellas**.`,
          md`Pueden correr en cualquier orden o **a la vez** si hay hilos libres. Salidas válidas: §x+1 = 3, x+2 = 4§ o §x+2 = 4, x+1 = 3§.`,
          md`En el DAG: un nodo que se bifurca; T∞ cuenta solo el camino más largo.`,
        ],
      },
      {
        title: "taskgroup",
        note: "Diapo 23",
        bullets: [
          md`Agrupa tareas y **espera a las del grupo y a sus descendientes** al cerrar el bloque.`,
          md`Una tarea creada **fuera** del grupo (p. ej. el trabajo en segundo plano) no participa de esa sincronización y sigue libre.`,
          md`Contraste: §taskwait§ espera solo a las **tareas hijas directas** de la tarea actual; §taskgroup§ espera a todo el subárbol del grupo.`,
        ],
      },
      {
        title: "taskyield",
        note: "Diapo 24",
        bullets: [
          md`Permite **suspender la tarea actual** y que el hilo ejecute otra pendiente.`,
          md`Mejora la concurrencia con tareas anidadas o de **duración desigual**; sin él, una tarea larga puede acaparar un hilo y retrasar el inicio de otras.`,
          md`Se combina con §untied§ para que la tarea pueda reanudarse en un hilo distinto.`,
        ],
      },
    ],
    links: [
      { label: "Lección: Tareas", href: "/aprende/tareas" },
      { label: "Lección: taskgroup", href: "/aprende/taskgroup" },
      { label: "Lección: depend y DAG", href: "/aprende/depend-dag" },
      { label: "Resuelto: Sistema con depend", href: "/resueltos/sistema-depend" },
      { label: "Reto: Sistema DAG", href: "/problemas/sistema-dag" },
    ],
  },
  {
    id: "u4-4",
    unit: "U4.4",
    title: "Modelo de memoria, interleavings y locks",
    pdf: "U4.4 Paralelismo compartido-OMP",
    intro: md`Por qué el código paralelo no se razona como el secuencial: interleavings, optimizaciones del compilador y del procesador, *happens-before*, y las herramientas para exclusión mutua: §critical§ y **locks** (filósofos, histograma).`,
    slides: [
      {
        title: "¿Puede fallar el assert?",
        note: "Diapos 4–6",
        bullets: [
          md`§f()§ hace §x=1; y=1;§ (A, B) y §g()§ hace §a=y; b=x; assert(b>=a)§ (C, D), en hilos distintos mediante §sections§.`,
          md`Solo importa el orden **entre hilos**: A antes que B y C antes que D siempre; los interleavings válidos son ABCD, ACBD, ACDB, CABD, CADB, CDAB.`,
          md`Prueba por contradicción: si b < a entonces a=1 y b=0; luego C ocurre después de B y D antes de A; pero A < B, B < C, C < D y D < A forma un **ciclo** → imposible.`,
        ],
        formula: String.raw`\#\text{interleavings} = \binom{2k}{k} = \frac{(2k)!}{(k!)^2} \sim \frac{4^k}{\sqrt{\pi k}}`,
      },
      {
        title: "El compilador reordena",
        note: "Diapos 7–9",
        bullets: [
          md`El compilador puede cambiar el código **si no altera la semántica secuencial**: reordenar sentencias, propagar constantes (§y = x+1§ → §y = 2§).`,
          md`Con otro hilo escribiendo §x§, esas transformaciones **cambian lo observable**: en una versión §y§ podría valer 6 y en otra no.`,
          md`Con §-O3§ un bucle de espera §while (x==1);§ puede compilarse a un salto infinito: se elimina la relectura de §x§ porque en secuencial no cambiaría.`,
        ],
        code: code`
int x = 0;
void wait()   { x = 1; while (x == 1); }   // -O3: jmp test (¡infinito!)
void arrive() { x = 2; }
`,
      },
      {
        title: "Lo que garantizan (y no) compilador y CPU",
        note: "Diapos 9–10",
        bullets: [
          md`Los compiladores modernos garantizan orden **local por hilo**, no un orden global de accesos; así logran mejoras típicas de 3–10×.`,
          md`El procesador también reordena accesos por el **pipeline** y cada hilo tiene **caché local**: una escritura puede ser visible a otros hilos en momentos distintos.`,
          md`Conclusión: sin sincronización explícita no existe una vista única y ordenada de la memoria.`,
        ],
      },
      {
        title: "Modelo de memoria",
        note: "Diapos 11–12",
        bullets: [
          md`**Orden del programa**: dentro de un hilo existe un orden lógico entre operaciones.`,
          md`**Consistencia de memoria**: qué valores puede observar un hilo cuando otros escriben a la vez.`,
          md`**Data race**: dos hilos acceden a la misma ubicación, **al menos uno escribe** y los accesos **no están ordenados** por sincronización.`,
          md`**Happens-before**: si una escritura ocurre antes que una lectura en este orden, la lectura debe ver un valor compatible. OpenMP lo establece con §barrier§, §critical§, §atomic§, §task depend§, §reduction§ y §flush§.`,
        ],
      },
      {
        title: "Locks de OpenMP",
        note: "Diapos 14–16",
        bullets: [
          md`§critical§: solo un hilo a la vez; se pueden nombrar regiones independientes (pero los nombres son **estáticos**).`,
          md`Un **lock** es un objeto §omp_lock_t§ que posee un hilo a la vez, con 4 operaciones: §omp_init_lock§, §omp_set_lock§ (espera hasta poder tomarlo), §omp_unset_lock§, §omp_destroy_lock§.`,
          md`Ventaja sobre critical: puedes tener **muchos locks dinámicos** (uno por recurso) y decidir en tiempo de ejecución cuál tomar.`,
        ],
        code: code`
omp_lock_t L;
omp_init_lock(&L);
#pragma omp parallel
{
  omp_set_lock(&L);
  /* sección crítica */
  omp_unset_lock(&L);
}
omp_destroy_lock(&L);
`,
      },
      {
        title: "Los filósofos: cada uno toma 2 tenedores",
        note: "Diapos 17–20",
        bullets: [
          md`N filósofos en mesa redonda, N tenedores (**un lock por tenedor**); cada uno necesita el izquierdo y el derecho para comer.`,
          md`Algoritmo: piensa, toma el izquierdo, toma el derecho, come, suelta ambos, repite.`,
          md`**Problema del código de la clase**: si **todos** toman primero el izquierdo, cada uno tiene un tenedor y espera el del vecino → **deadlock** (espera circular).`,
          md`Arreglos clásicos: **orden global de adquisición** (tomar primero el tenedor de menor índice), o un filósofo que invierte el orden, o limitar a N−1 comensales a la vez.`,
        ],
        code: code`
omp_set_lock(&forks[left]);
omp_set_lock(&forks[right]);   // si todos tienen 'left': deadlock
eat(id);
omp_unset_lock(&forks[left]);
omp_unset_lock(&forks[right]);
`,
      },
      {
        title: "Histograma: la carrera",
        note: "Diapo 21",
        bullets: [
          md`§hist[key]++§ desde varios hilos es **lectura-modificación-escritura**: se pierden incrementos.`,
          md`Con 2²⁶ entradas y 2²⁰ cajas la carrera es real; la suma final de las cajas no coincide con el número de entradas.`,
        ],
      },
      {
        title: "Histograma: critical vs locks",
        note: "Diapos 22–23",
        bullets: [
          md`**critical** funciona, pero **serializa todo** el incremento, aunque dos hilos toquen cajas distintas → no escala.`,
          md`**Un lock por caja**: solo se bloquean hilos que van a la **misma** caja. Es la solución de grano fino.`,
          md`**Bug en la diapo**: el código toma §lock[i]§ (el índice del bucle) en vez de §lock[key]§; así no protege la caja que realmente se modifica. Debe ser §omp_set_lock(&lock[key])§.`,
          md`Alternativas más baratas: §#pragma omp atomic§ sobre §hist[key]++§, o histogramas **privados** por hilo y reducción final (§reduction(+:hist[:N])§).`,
        ],
        code: code`
#pragma omp parallel for
for (int i = 0; i < INP_SIZE; i++) {
  int key = inp[i];
  omp_set_lock(&lock[key]);    // lock[key], NO lock[i]
  hist[key]++;
  omp_unset_lock(&lock[key]);
}
`,
      },
    ],
    links: [
      { label: "Lección: Locks", href: "/aprende/locks" },
      { label: "Lección: Memoria y ordered", href: "/aprende/memoria-ordered" },
      { label: "Reto: Histograma", href: "/problemas/histograma" },
      { label: "Resuelto: Histograma (PRAM)", href: "/resueltos/histograma-pram" },
      { label: "Teoría: Fundamentos", href: "/teoria/fundamentos" },
    ],
  },
  {
    id: "u4-5",
    unit: "U4.5",
    title: "Paralelismo híbrido MPI + OpenMP",
    pdf: "U4.5 Paralelismo-hibrido",
    intro: md`Por qué el hardware obliga a paralelizar, cómo combinar **MPI entre nodos y OpenMP dentro del nodo**, qué ganas (menos halos, mejor balance) y qué pierdes (complejidad, hilos ociosos durante la comunicación).`,
    slides: [
      {
        title: "Por qué paralelismo: Ley de Moore y límites",
        note: "Diapos 4–7",
        bullets: [
          md`Los transistores siguen creciendo, pero la **frecuencia no**. El cómputo crece más rápido que el **ancho de banda de memoria y de red** (el cuello de botella).`,
          md`La potencia dinámica crece de forma superlineal con la frecuencia.`,
          md`Ejemplo de hardware actual: un Xeon Max con 52 núcleos y 104 hilos.`,
        ],
        formula: String.raw`P_{\text{dyn}}(f) = \gamma\, f^{3}`,
      },
      {
        title: "La solución: muchos núcleos lentos",
        note: "Diapo 8",
        bullets: [
          md`Si P ~ f³, **dos núcleos a f/2 consumen mucho menos** que uno a f con el mismo rendimiento potencial (“los pollos y el buey”).`,
          md`Se necesita: explotar muchos núcleos lentos, aprovechar la memoria **local** del procesador (paralelismo híbrido) y alcanzar altos niveles de paralelismo.`,
          md`Consecuencia: el programador debe conocer la **arquitectura** y el desarrollo es más complejo (trabajo en equipo).`,
        ],
      },
      {
        title: "Paradigmas de programación",
        note: "Diapos 9–10",
        bullets: [
          md`**MPI** sigue dominando; el híbrido **MPI+OpenMP+CUDA** crece sobre todo en supercomputadores; los lenguajes **PGAS** (GASPI, Coarray-Fortran, UPC, Chapel) son la alternativa emergente.`,
          md`**Memoria compartida**: los hilos leen y escriben en RAM y se sincronizan por competencia entre tareas; pertenecen a **un proceso**.`,
          md`**Memoria distribuida**: los procesos usan solo variables locales y se **envían mensajes**; cada proceso puede tener uno o más hilos.`,
        ],
      },
      {
        title: "Qué es el paralelismo híbrido",
        note: "Diapos 11–13",
        bullets: [
          md`MPI se usa para **comunicar procesos** (entre nodos) y OpenMP **dentro de cada proceso** (entre núcleos del nodo).`,
          md`**Ventajas**: mayor escalabilidad (más granularidad), mejor balance de carga y mejor uso de memoria.`,
          md`**Desventajas**: código más complejo, ambos niveles deben rendir bien, y efectos **NUMA**.`,
          md`Se benefician: algoritmos con escalabilidad MPI limitada, que requieren balance dinámico, con memoria limitada y mucha comunicación MPI, y aplicaciones de paralelismo masivo.`,
        ],
      },
      {
        title: "Halos y descomposición de dominio",
        note: "Diapos 14–17",
        bullets: [
          md`Una **región de halo** es la copia local de datos remotos necesaria para calcular en el borde del subdominio; hay que actualizarla con comunicación.`,
          md`Con hilos dentro del proceso hay **menos subdominios MPI**, por tanto menos halos que almacenar y menos comunicación.`,
          md`En 2D, con M×N celdas por proceso hay 2M+2N de halo. Al pasar de P a 4P procesos, cada uno tiene un cuarto de celdas pero **solo la mitad de halo**: el halo por proceso baja como √P, más lento que el cómputo.`,
          md`En 3D, un cubo de 10³ lleva 1 capa de halo → 12³: **42 % es halo**; con 20³ baja a 25 % y con 40³ a 14 %.`,
        ],
        formula: String.raw`\text{halo}_{3D}(n)=\frac{(n+2)^3-n^3}{(n+2)^3}`,
      },
      {
        title: "Modos de MPI con hilos",
        note: "Diapos 18–19",
        bullets: [
          md`Un programa híbrido típico: se **inicializa MPI**, se abren regiones OpenMP **dentro de cada proceso**, se puede llamar a MPI en regiones seriales y paralelas (según el nivel de soporte de hilos) y se **finaliza MPI**.`,
          md`Los niveles de soporte (§MPI_THREAD_SINGLE§, §FUNNELED§, §SERIALIZED§, §MULTIPLE§) indican qué hilos pueden llamar a MPI.`,
        ],
      },
      {
        title: "Código híbrido y compilación",
        note: "Diapos 20–21",
        bullets: [
          md`Cada proceso MPI abre una región con §num_threads(4)§; cada hilo conoce su id (§iam§) y el rango del proceso (§rank§).`,
          md`Compilar con §mpicc -fopenmp§ y lanzar con §mpirun -np 2§.`,
          md`El número **óptimo de hilos** depende del hardware: hay que medirlo.`,
        ],
        code: code`
MPI_Init(&argc, &argv);
MPI_Comm_rank(MPI_COMM_WORLD, &rank);
#pragma omp parallel num_threads(4) default(shared) private(iam, np)
{
  np  = omp_get_num_threads();
  iam = omp_get_thread_num();
  printf("hilo %d/%d del proceso %d/%d\n", iam, np, rank, numprocs);
}
MPI_Finalize();
`,
      },
      {
        title: "Mapear a la máquina",
        note: "Diapos 22–25",
        bullets: [
          md`Máquina de 268 nodos × 8 núcleos: puedes combinar **1 proceso × 8 hilos**, **2 × 4** o **4 × 2** por nodo.`,
          md`En el clúster **Khipu**: 4 procesos MPI con 8 hilos OMP cada uno.`,
          md`En **Perlmutter** (CPU AMD EPYC de 64 núcleos): un proceso MPI por **socket** y un hilo OMP por **núcleo físico** (frente a un proceso por núcleo).`,
        ],
      },
      {
        title: "Ejemplo: Poisson 3D con Jacobi",
        note: "Diapos 26–27",
        bullets: [
          md`Se resuelve ∇²u = S en el cubo unitario con malla regular h y **Jacobi**: la iteración n+1 usa solo los vecinos inmediatos de la iteración n.`,
          md`Se prueba en un Blue Gene de 10 240 nodos × 4 núcleos comparando MPI puro con MPI+OpenMP.`,
        ],
      },
      {
        title: "¿Por qué el híbrido no siempre es más rápido?",
        note: "Diapo 28",
        bullets: [
          md`OpenMP escala bien por su paralelismo implícito, pero está **limitado por el hardware** del nodo.`,
          md`Mientras un hilo hace la comunicación MPI, **los demás hilos están ociosos**.`,
          md`Crear y sincronizar muchos hilos tiene **costo**.`,
          md`No hay librerías/compiladores tan optimizados para OpenMP como para MPI.`,
        ],
      },
      {
        title: "Aplicaciones: SPH y N-cuerpos",
        note: "Diapos 29–33",
        bullets: [
          md`**SPHYNX/SPH-EXA**: simulaciones astrofísicas SPH escaladas con el modelo híbrido.`,
          md`**N-cuerpos**: comparación OpenMP vs HPX, versión híbrida y MPI+CUDA (el cómputo directo O(n²) se acelera en GPU).`,
          md`Mensaje: el mejor modelo depende del algoritmo y la máquina.`,
        ],
      },
    ],
    links: [
      { label: "Lección: Paralelismo híbrido", href: "/aprende/hibrido" },
      { label: "Reto: Reparto híbrido", href: "/problemas/hibrido-reparto" },
      { label: "Resuelto: Energía y escalabilidad", href: "/resueltos/energia-escalabilidad" },
      { label: "Teoría: Híbrido", href: "/teoria/hibrido" },
    ],
  },
];
