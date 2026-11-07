import { md } from "@/lib/md";
import type { Topic } from "@/lib/types";

export const theory1: Topic[] = [
  {
    id: "fundamentos",
    title: "Fundamentos y métricas",
    icon: "🧭",
    blurb: "Memoria compartida, fork-join, speedup, eficiencia, Amdahl e isoeficiencia.",
    reading: md`
## Memoria compartida vs. distribuida

En **memoria compartida** todos los hilos ven el mismo espacio de direcciones (OpenMP). Se comunican leyendo/escribiendo variables, por eso aparecen las **condiciones de carrera**. En **memoria distribuida** cada proceso tiene su memoria y se comunica con mensajes (MPI). Un programa **híbrido** usa MPI entre nodos y OpenMP dentro de cada nodo.

## Modelo fork-join

El hilo maestro ejecuta en serie; al llegar a §#pragma omp parallel§ crea un equipo (**fork**); al final hay una **barrera implícita** y el maestro continúa solo (**join**).

## Métricas de rendimiento

Sea $T_s$ el tiempo del mejor algoritmo secuencial y $T_p$ el tiempo con $p$ procesadores.

| Métrica | Fórmula | Significado |
|---|---|---|
| Speedup | $S = T_s / T_p$ | cuántas veces más rápido |
| Eficiencia | $E = S / p$ | fracción útil de cada procesador |
| Trabajo | $T_1$ | total de operaciones |
| Longitud del camino crítico (span) | $T_\infty$ | tiempo con infinitos procesadores |
| Costo | $C = p \cdot T_p$ | trabajo "pagado" |

**Límite del DAG (ley trabajo-span):** $T_p \ge \max\left(\dfrac{T_1}{p},\; T_\infty\right)$, y por tanto $S \le \min\left(p, \dfrac{T_1}{T_\infty}\right)$. El **paralelismo** del programa es $T_1/T_\infty$.

## Ley de Amdahl

Si una fracción serial $f$ no se puede paralelizar:

$$S(p) \le \frac{1}{f + \frac{1-f}{p}} \xrightarrow{p\to\infty} \frac{1}{f}$$

Con $f = 0.1$ nunca pasarás de $10\times$, no importa cuántos núcleos tengas.

## Escalabilidad e isoeficiencia

- **Escalabilidad fuerte:** $n$ fijo, aumento $p$ (Amdahl).
- **Escalabilidad débil:** $n/p$ fijo (Gustafson).
- **Isoeficiencia:** cuánto debe crecer el tamaño del problema $W$ al crecer $p$ para mantener $E$ constante. Si el sobrecosto total es $T_o(W,p) = pT_p - W$, entonces $W = K\,T_o(W,p)$ con $K = E/(1-E)$. Cuanto **menor** crezca $W$ con $p$, más escalable es el algoritmo.
`,
    questions: [
      { id: "fun-1", type: "mc", diff: "facil", q: "¿Qué ocurre al final de una región §parallel§?", options: ["Los hilos terminan sin sincronizar", "Hay una barrera implícita y el maestro continúa solo", "Cada hilo continúa con su propia copia del programa", "Se crean nuevos hilos"], answer: 1, explain: "Fork-join: al cerrar la región hay una barrera implícita (join) y sólo el hilo maestro sigue." },
      { id: "fun-2", type: "tf", diff: "facil", q: "En memoria compartida los hilos necesitan enviarse mensajes para intercambiar datos.", answer: false, explain: "Eso es memoria distribuida (MPI). En memoria compartida leen/escriben las mismas variables, por eso hay que sincronizar." },
      { id: "fun-3", type: "fill", diff: "facil", q: "El speedup se define como $S = T_s / $ ___ (nombre de la variable en una palabra, ej. §Tp§).", answer: ["Tp", "T_p", "tp"], explain: "$S = T_s/T_p$, tiempo secuencial entre tiempo paralelo con $p$ procesadores." },
      { id: "fun-4", type: "mc", diff: "medio", q: "Un programa tiene $T_s = 100$ y $T_4 = 40$. ¿Cuál es la eficiencia?", options: ["0.25", "0.625", "2.5", "0.4"], answer: 1, explain: "$S = 100/40 = 2.5$ y $E = S/p = 2.5/4 = 0.625$." },
      { id: "fun-5", type: "mc", diff: "medio", q: "Con $f = 0.2$ de fracción serial, el speedup máximo (p → ∞) según Amdahl es:", options: ["2", "5", "10", "20"], answer: 1, explain: "$1/f = 1/0.2 = 5$." },
      { id: "fun-6", type: "mc", diff: "dificil", q: "Un DAG tiene $T_1 = 120$ y $T_\\infty = 20$. Con $p = 8$ procesadores, el mejor $T_p$ posible es al menos:", options: ["15", "20", "8", "12"], answer: 1, explain: "$T_p \\ge \\max(T_1/p, T_\\infty) = \\max(15, 20) = 20$. El camino crítico domina." },
      { id: "fun-7", type: "tf", diff: "medio", q: "Si la eficiencia es menor que 1, el programa paralelo es incorrecto.", answer: false, explain: "$E<1$ es lo normal: hay sobrecosto de sincronización, comunicación y desbalance." },
      { id: "fun-8", type: "tf", diff: "dificil", q: "Un algoritmo cuya función de isoeficiencia es $W = \\Theta(p)$ es más escalable que uno con $W=\\Theta(p\\log p)$.", answer: true, explain: "Menor crecimiento requerido del problema para mantener $E$ constante ⇒ mejor escalabilidad." },
    ],
    cards: [
      { id: "fun-c1", front: "Speedup y eficiencia", back: "$S=T_s/T_p$, $E=S/p$. Ideal: $S=p$, $E=1$." },
      { id: "fun-c2", front: "Ley de Amdahl", back: "$S\\le 1/(f+(1-f)/p)$; límite $1/f$ con $f$ la fracción serial." },
      { id: "fun-c3", front: "¿Qué es $T_\\infty$?", back: "Longitud del camino crítico del DAG: tiempo con infinitos procesadores. Cota inferior de $T_p$." },
      { id: "fun-c4", front: "Cota del DAG (trabajo-span)", back: "$T_p\\ge\\max(T_1/p, T_\\infty)$." },
      { id: "fun-c5", front: "Isoeficiencia", back: "Crecimiento de $W$ necesario para mantener $E$ constante al crecer $p$: $W=K\\,T_o(W,p)$." },
      { id: "fun-c6", front: "Fork-join", back: "Maestro crea equipo (fork), todos ejecutan la región, barrera implícita y sólo el maestro sigue (join)." },
      { id: "fun-c7", front: "Escalabilidad fuerte vs. débil", back: "Fuerte: $n$ fijo y crece $p$. Débil: $n/p$ fijo (el problema crece con $p$)." },
    ],
  },
  {
    id: "worksharing",
    title: "Work-sharing: for, schedule, sections",
    icon: "🔀",
    blurb: "Cómo se reparten las iteraciones y el trabajo entre hilos.",
    reading: md`
## §parallel for§

§#pragma omp parallel for§ reparte las iteraciones de un bucle **canónico** entre los hilos. Requisitos: contador entero, límites invariantes, paso constante. Las iteraciones deben ser **independientes**.

- §collapse(k)§ fusiona los $k$ bucles perfectamente anidados en un solo espacio de iteración (más trabajo que repartir).
- §nowait§ quita la barrera implícita al final del §for§.
- §ordered§ fuerza a ejecutar un bloque en orden de iteración.

## schedule

| Política | Reparto | Cuándo |
|---|---|---|
| §static§ | bloques contiguos de $\lceil n/p\rceil$ | costo uniforme (overhead mínimo) |
| §static, c§ | bloques de $c$ en round-robin | costo creciente/estructurado |
| §dynamic, c§ | quien queda libre toma $c$ iteraciones | costo irregular (overhead de cola) |
| §guided, c§ | bloques grandes que decrecen, mínimo $c$ | costo irregular con menos overhead |
| §runtime§ | usa §OMP_SCHEDULE§ | experimentación |
| §auto§ | decide el compilador | — |

## §sections§ y §single§

§sections§ reparte **bloques de código distintos** (una §section§ por hilo disponible). §single§ lo ejecuta **un solo hilo** (cualquiera) con barrera al final; §master§ lo ejecuta el hilo 0 **sin** barrera.

## Reducción de overhead

Muchos §parallel for§ seguidos crean y destruyen equipos; es mejor una sola región §parallel§ con varios §for§ dentro.
`,
    questions: [
      { id: "ws-1", type: "mc", diff: "facil", q: "¿Qué política conviene para un bucle donde el costo de la iteración $i$ crece con $i$?", options: ["§static§ sin chunk", "§static, 1§ o §dynamic§", "Ninguna, no se puede paralelizar", "§master§"], answer: 1, explain: "Con static sin chunk, el último hilo recibe las iteraciones más caras. static,1 intercala y dynamic equilibra en ejecución." },
      { id: "ws-2", type: "tf", diff: "facil", q: "§single§ tiene una barrera implícita al final, §master§ no.", answer: true, explain: "Cierto. Por eso con §master§ otros hilos pueden adelantarse." },
      { id: "ws-3", type: "fill", diff: "facil", q: "La cláusula que permite fusionar dos bucles anidados en un solo espacio de iteraciones es §___(2)§.", answer: ["collapse"], explain: "§collapse(2)§." },
      { id: "ws-4", type: "mc", diff: "medio", q: "En §schedule(dynamic, 4)§, ¿qué significa el 4?", options: ["4 hilos", "Cada solicitud de trabajo entrega 4 iteraciones consecutivas", "4 iteraciones por hilo en total", "Se repite 4 veces"], answer: 1, explain: "Es el tamaño del chunk." },
      { id: "ws-5", type: "mc", diff: "medio", q: "¿Qué pasa si quitas la barrera con §nowait§ y el siguiente bucle usa resultados del primero?", options: ["Nada, siempre es seguro", "Puede leer valores aún no calculados (carrera)", "El compilador lo corrige", "Se ejecuta en serie"], answer: 1, explain: "Sin barrera un hilo rápido pasa al siguiente bucle mientras otros no terminan." },
      { id: "ws-6", type: "tf", diff: "medio", q: "§dynamic§ siempre es más rápido que §static§.", answer: false, explain: "Con costos uniformes, dynamic agrega overhead de cola y es más lento." },
      { id: "ws-7", type: "mc", diff: "dificil", q: "§#pragma omp parallel for collapse(2)§ sobre §for(i<3) for(j<1000)§ con 8 hilos. ¿Qué ventaja tiene?", options: ["Ninguna", "Hay 3000 iteraciones que repartir, no sólo 3", "Ejecuta en orden", "Elimina las carreras"], answer: 1, explain: "Sin collapse sólo hay 3 iteraciones paralelizables (5 hilos ociosos)." },
    ],
    cards: [
      { id: "ws-c1", front: "static vs dynamic", back: "static: reparto fijo en compilación, mínimo overhead. dynamic: bajo demanda, equilibra costos irregulares con overhead de cola." },
      { id: "ws-c2", front: "guided", back: "Chunks grandes al inicio que decrecen (≈ restante/p), mínimo $c$. Menos overhead que dynamic." },
      { id: "ws-c3", front: "single vs master", back: "single: cualquier hilo, con barrera. master: sólo hilo 0, sin barrera." },
      { id: "ws-c4", front: "collapse(k)", back: "Fusiona $k$ bucles perfectamente anidados en un solo espacio de iteración." },
      { id: "ws-c5", front: "nowait", back: "Elimina la barrera implícita al final de for/sections/single." },
      { id: "ws-c6", front: "Bucle canónico", back: "Contador entero, inicio/límite/paso invariantes y sin saltos fuera del bucle." },
    ],
  },
  {
    id: "datos",
    title: "Alcance de datos y carreras",
    icon: "🔒",
    blurb: "shared, private, firstprivate, lastprivate y data races.",
    reading: md`
## Alcance por defecto

Dentro de una región paralela las variables declaradas **fuera** son §shared§ y las declaradas **dentro** son privadas. El contador del §for§ paralelo es siempre privado.

## Cláusulas

- §private(x)§: cada hilo tiene su copia **sin inicializar**. Al salir se descarta.
- §firstprivate(x)§: copia privada **inicializada** con el valor previo.
- §lastprivate(x)§: al salir, la variable original recibe el valor de la **última iteración lógica**.
- §default(none)§: obliga a declarar el alcance de cada variable (evita errores).
- §threadprivate§: variable global con una copia persistente por hilo.

## Condición de carrera

Hay *data race* cuando dos hilos acceden a la misma posición, al menos uno escribe y no hay sincronización. El resultado es **indefinido**.

§§§cpp
int cnt = 0;
#pragma omp parallel for
for (int i = 0; i < n; i++) cnt++;   // ❌ carrera
§§§

Soluciones: §reduction§, §atomic§, §critical§, o variables privadas por hilo + combinación al final.

## False sharing

Variables distintas en la **misma línea de caché** (64 B) que escriben hilos diferentes provocan invalidaciones constantes. No es incorrecto pero sí **lento**. Solución: *padding* o acumuladores locales.
`,
    questions: [
      { id: "dat-1", type: "mc", diff: "facil", q: "Una variable §private§ al entrar a la región paralela:", options: ["Conserva el valor original", "No está inicializada", "Vale 0", "Es compartida"], answer: 1, explain: "Para inicializarla con el valor previo usa §firstprivate§." },
      { id: "dat-2", type: "tf", diff: "facil", q: "El contador de un §parallel for§ es privado por defecto.", answer: true, explain: "Sí, cada hilo tiene su propio valor de i." },
      { id: "dat-3", type: "fill", diff: "medio", q: "La cláusula que copia al final el valor de la última iteración lógica a la variable original es §___§.", answer: ["lastprivate"], explain: "§lastprivate(x)§." },
      { id: "dat-4", type: "mc", diff: "medio", q: "¿Cuál NO es una forma correcta de evitar la carrera en §sum += a[i]§?", options: ["§reduction(+:sum)§", "§atomic§", "§critical§", "§private(sum)§ y usar sum después"], answer: 3, explain: "private descarta el valor al salir: sum original no se actualiza." },
      { id: "dat-5", type: "mc", diff: "medio", q: "El false sharing ocurre cuando:", options: ["Dos hilos escriben la misma variable", "Hilos escriben variables distintas en la misma línea de caché", "Se usa §firstprivate§", "Se agota la memoria"], answer: 1, explain: "No hay carrera lógica, pero la línea de caché rebota entre núcleos." },
      { id: "dat-6", type: "tf", diff: "dificil", q: "Un programa con una carrera de datos siempre produce resultado incorrecto.", answer: false, explain: "El comportamiento es indefinido: puede dar el resultado esperado a veces, lo que lo hace más peligroso." },
      { id: "dat-7", type: "mc", diff: "dificil", q: "§int x=5; #pragma omp parallel firstprivate(x) { x += omp_get_thread_num(); }§ Después de la región, x vale:", options: ["La suma de todos", "5", "El valor del último hilo", "Indefinido"], answer: 1, explain: "Las modificaciones son sobre copias privadas; la original no cambia." },
    ],
    cards: [
      { id: "dat-c1", front: "private vs firstprivate", back: "private: copia sin inicializar. firstprivate: copia inicializada con el valor previo." },
      { id: "dat-c2", front: "lastprivate", back: "La original recibe el valor de la última iteración lógica (no del último hilo en terminar)." },
      { id: "dat-c3", front: "Condición de carrera", back: "≥2 hilos acceden a la misma dirección, ≥1 escribe, sin sincronización." },
      { id: "dat-c4", front: "False sharing", back: "Variables distintas en la misma línea de caché modificadas por hilos distintos; rendimiento bajo. Usa padding/locales." },
      { id: "dat-c5", front: "default(none)", back: "Obliga a declarar el alcance de cada variable; ayuda a detectar errores." },
      { id: "dat-c6", front: "threadprivate", back: "Variable global/estática con una copia persistente por hilo entre regiones paralelas." },
    ],
  },
  {
    id: "sincronizacion",
    title: "Sincronización",
    icon: "🚦",
    blurb: "critical, atomic, locks, barrier, reduction y deadlock.",
    reading: md`
## Herramientas

| Mecanismo | Qué protege | Costo |
|---|---|---|
| §atomic§ | una **actualización** de memoria (§x += e§, §x++§, capture) | bajo (instrucción atómica) |
| §critical§ | un **bloque** (opcionalmente §critical(nombre)§) | medio; mismo nombre = exclusión mutua |
| §omp_lock_t§ | región arbitraria, múltiples locks / por elemento | medio; tú gestionas |
| §barrier§ | espera de **todos** los hilos | alto si hay desbalance |
| §reduction§ | combinación de resultados parciales | el más barato para sumas/máximos |

§critical§ **sin nombre** comparte un único lock global con todos los demás críticos sin nombre.

## §atomic§ capture

§§§cpp
int pos;
#pragma omp atomic capture
pos = count++;        // leer y avanzar de forma indivisible
§§§

## Locks

§omp_init_lock§, §omp_set_lock§, §omp_unset_lock§, §omp_destroy_lock§. Un lock **por elemento** (p.ej. por bucket de histograma) reduce la contención frente a un único critical.

## Deadlock

Ocurre cuando cada hilo espera un recurso que tiene otro. Las cuatro condiciones de Coffman: exclusión mutua, retener y esperar, no apropiación y espera circular. **Evita la espera circular** ordenando la adquisición (ej. siempre el lock de menor índice primero; en filósofos, el último toma los tenedores al revés).

## Reducciones

§reduction(op:var)§ da una copia privada inicializada con el neutro de §op§ (0 para +, 1 para ×, −∞ para max) y al final combina. Operadores: §+ * - & | ^ && || min max§ y arreglos con §reduction(+:a[:n])§.
`,
    questions: [
      { id: "syn-1", type: "mc", diff: "facil", q: "¿Qué protege §#pragma omp atomic§?", options: ["Un bloque cualquiera", "Una sola actualización de memoria", "Todo el programa", "Un bucle"], answer: 1, explain: "Sólo una sentencia de actualización simple (x op= expr, x++, etc.)." },
      { id: "syn-2", type: "tf", diff: "facil", q: "Dos §critical§ sin nombre en lugares distintos se excluyen mutuamente entre sí.", answer: true, explain: "Todos los critical sin nombre comparten el mismo lock." },
      { id: "syn-3", type: "fill", diff: "facil", q: "Con §reduction(+:s)§, cada hilo inicia su copia privada de s en ___ (número).", answer: ["0", "cero"], explain: "El neutro de la suma." },
      { id: "syn-4", type: "mc", diff: "medio", q: "¿Cuál es el neutro de §reduction(max:m)§ para enteros?", options: ["0", "El mínimo entero (−∞)", "1", "El máximo entero"], answer: 1, explain: "El neutro del máximo es el menor valor representable." },
      { id: "syn-5", type: "mc", diff: "medio", q: "Para un histograma con 1000 bins y muchos hilos, la mejor opción es:", options: ["Un solo §critical§", "§atomic§ por incremento o locks por bin (o reducción de arreglo)", "§barrier§ en cada iteración", "§master§"], answer: 1, explain: "Granularidad fina: atomic/locks por bin, o copias privadas con reduction(+:h[:1000])." },
      { id: "syn-6", type: "mc", diff: "dificil", q: "En la cena de filósofos, ¿qué rompe la condición de espera circular?", options: ["Que todos tomen primero el tenedor izquierdo", "Que uno tome primero el derecho (orden global de recursos)", "Usar más hilos", "Usar §atomic§"], answer: 1, explain: "Imponer un orden total sobre los recursos elimina el ciclo de espera." },
      { id: "syn-7", type: "tf", diff: "dificil", q: "Poner un §barrier§ dentro de un bloque ejecutado sólo por algunos hilos puede causar deadlock.", answer: true, explain: "Todos los hilos del equipo deben llegar a la barrera; si no, los que llegaron esperan para siempre." },
    ],
    cards: [
      { id: "syn-c1", front: "atomic vs critical", back: "atomic: una actualización, barato (hardware). critical: bloque arbitrario, más caro." },
      { id: "syn-c2", front: "Condiciones de Coffman", back: "Exclusión mutua, retener y esperar, no apropiación, espera circular. Romper una evita el deadlock." },
      { id: "syn-c3", front: "atomic capture", back: "Lee y actualiza de forma indivisible: §pos = count++§ — útil para asignar posiciones únicas." },
      { id: "syn-c4", front: "Neutros de reduction", back: "+ → 0 · * → 1 · max → −∞ · min → +∞ · & → ~0 · | → 0 · && → 1 · || → 0" },
      { id: "syn-c5", front: "critical(nombre)", back: "Críticos con el mismo nombre se excluyen entre sí; con distinto nombre pueden ejecutar a la vez." },
      { id: "syn-c6", front: "Locks por elemento", back: "Un omp_lock_t por bin/nodo reduce la contención frente a un lock único." },
    ],
  },
];
