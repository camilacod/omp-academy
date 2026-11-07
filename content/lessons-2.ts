import { md, code } from "@/lib/md";
import type { Lesson } from "@/lib/types";

export const lessons2: Lesson[] = [
  {
    id: "sincronizacion",
    title: "Condición de carrera: critical y atomic",
    unit: "U4.2 · U4.4",
    minutes: 16,
    summary: "Por qué x = x + 1 pierde incrementos y cómo protegerlo (atomic, critical, atomic capture).",
    slideDeck: "u4-4",
    topic: "sincronizacion",
    intro: md`
## La condición de carrera

Ocurre cuando **dos hilos acceden a la misma posición de memoria, al menos uno escribe, y nada ordena esos accesos**. El clásico §x = x + 1§ son tres pasos: leer §x§, sumar 1, escribir §x§. Si dos hilos leen el mismo valor antes de que alguno escriba, se pierde un incremento. Con 4 hilos y 1 000 000 de incrementos se pierde ~74 % y el número cambia en cada ejecución.

## Las herramientas

- **§critical§**: un bloque que solo un hilo puede ejecutar a la vez. Sirve para cualquier código. Con nombre, §critical(nombre)§: secciones con nombres distintos no se bloquean entre sí.
- **§atomic§**: protege **una sola** actualización de memoria simple (§x++§, §x += expr§). Variantes: §read§, §write§, §update§ (por defecto) y **§capture§** (§v = x++§: actualizar y quedarte con el valor).
- **Locks** (§omp_lock_t§): candado explícito; útil con *muchos* candados.
- **§reduction§**: cada hilo acumula en una copia privada y OpenMP combina al final (siguiente lección).

## El patrón que sí escala

Sincronizar **dentro** del bucle serializa el trabajo: 4 hilos pueden ir *más lento* que 1. El patrón correcto es **acumular local y combinar una vez**: cada hilo cuenta en su variable privada y entra **una sola vez** a la sección crítica al final.

§§§cpp
#pragma omp parallel
{
    int cnt = 0;                    // privada
    #pragma omp for
    for (int i = 0; i < n; i++) if (b[i] == 0) cnt++;
    #pragma omp critical
    total += cnt;                   // p entradas, no n
}
§§§
`,
    checkpoints: [
      {
        id: "atomic",
        title: "Arregla el contador con atomic",
        task: md`Cada una de las 400 000 iteraciones suma 1 a §total§ (compartida). Sin protección se pierden incrementos. Protege la actualización con **§atomic§** e imprime §total=400000§.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    long long total = 0;
    #pragma omp parallel for num_threads(4)
    for (int i = 0; i < 400000; i++) {
        total++;     // TODO: protege esta actualización
    }
    printf("total=%lld\n", total);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    long long total = 0;
    #pragma omp parallel for num_threads(4)
    for (int i = 0; i < 400000; i++) {
        #pragma omp atomic
        total++;
    }
    printf("total=%lld\n", total);
    return 0;
}
`,
        hints: ["§atomic§ se aplica a la sentencia siguiente, que debe ser una actualización simple como §x++§."],
        tests: {
          static: [{ re: "omp\\s+atomic", want: true, msg: "Usa §#pragma omp atomic§." }],
          runs: [{ expect: [{ kind: "exact", value: "total=400000" }] }],
        },
      },
      {
        id: "critical-max",
        title: "Máximo: local + un solo critical",
        task: md`Encuentra el **máximo** de §v[i] = (i*37) % 1000§ para §i < 100000§ (es 999). Cada hilo calcula su máximo local en §mx_local§ y entra **una sola vez** a un §critical§ para actualizar §mx§. Prohibido poner el §critical§ dentro del bucle. Imprime §max=999§.`,
        starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    const int N = 100000;
    std::vector<int> v(N);
    for (int i = 0; i < N; i++) v[i] = (i * 37) % 1000;

    int mx = -1;
    // TODO: región paralela; cada hilo mantiene mx_local y al final lo combina en mx
    for (int i = 0; i < N; i++)
        if (v[i] > mx) mx = v[i];
    printf("max=%d\n", mx);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    const int N = 100000;
    std::vector<int> v(N);
    for (int i = 0; i < N; i++) v[i] = (i * 37) % 1000;

    int mx = -1;
    #pragma omp parallel num_threads(4)
    {
        int mx_local = -1;
        #pragma omp for
        for (int i = 0; i < N; i++)
            if (v[i] > mx_local) mx_local = v[i];
        #pragma omp critical
        if (mx_local > mx) mx = mx_local;
    }
    printf("max=%d\n", mx);
    return 0;
}
`,
        hints: [
          "Estructura: §parallel§ { variable local; §omp for§ sobre el bucle; §critical§ al final }.",
          "El §critical§ va **después** del §omp for§ y antes de cerrar la región.",
        ],
        tests: {
          static: [
            { re: "omp\\s+critical", want: true, msg: "Usa §#pragma omp critical§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "max=999" }] }],
        },
      },
      {
        id: "atomic-capture",
        title: "atomic capture: posiciones únicas",
        task: md`Guarda en §pos[]§ los **índices** de los elementos mayores a 4 de §v[i] = i % 10§ (i < 100): son 50. Varios hilos escriben en §pos§, así que cada uno necesita una posición **única**: obtén la siguiente con §atomic capture§ (§idx = k++§). Imprime §cuenta=50§ y §suma=2600§ (suma de los índices guardados; el orden en §pos§ no importa).`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int v[100], pos[100];
    for (int i = 0; i < 100; i++) v[i] = i % 10;

    int k = 0;
    #pragma omp parallel for num_threads(4)
    for (int i = 0; i < 100; i++) {
        if (v[i] > 4) {
            int idx = k;   // TODO: toma una posición única con atomic capture
            k = k + 1;
            pos[idx] = i;
        }
    }
    long long suma = 0;
    for (int j = 0; j < k; j++) suma += pos[j];
    printf("cuenta=%d\n", k);
    printf("suma=%lld\n", suma);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int v[100], pos[100];
    for (int i = 0; i < 100; i++) v[i] = i % 10;

    int k = 0;
    #pragma omp parallel for num_threads(4)
    for (int i = 0; i < 100; i++) {
        if (v[i] > 4) {
            int idx;
            #pragma omp atomic capture
            idx = k++;
            pos[idx] = i;
        }
    }
    long long suma = 0;
    for (int j = 0; j < k; j++) suma += pos[j];
    printf("cuenta=%d\n", k);
    printf("suma=%lld\n", suma);
    return 0;
}
`,
        hints: ["Forma: §#pragma omp atomic capture§ seguido de §idx = k++;§ en una sola sentencia."],
        tests: {
          static: [{ re: "omp\\s+atomic\\s+capture", want: true, msg: "Usa §#pragma omp atomic capture§." }],
          runs: [{ expect: [{ kind: "exact", value: "cuenta=50\nsuma=2600" }] }],
        },
      },
    ],
  },

  {
    id: "locks",
    title: "Locks y el problema de los filósofos",
    unit: "U4.4",
    minutes: 14,
    summary: "Candados explícitos, deadlock por espera circular y cómo romperlo con orden.",
    slideDeck: "u4-4",
    topic: "sincronizacion",
    intro: md`
## Locks

§omp_lock_t§ es un candado explícito: §omp_init_lock§, §omp_set_lock§ (espera hasta tomarlo), §omp_unset_lock§ (lo suelta), §omp_destroy_lock§. Útil cuando necesitas **muchos** candados (uno por casilla de un histograma, uno por tenedor).

> Error clásico en el histograma con locks de la diapositiva: usar §lock[i]§ (índice del dato) en vez de §lock[key]§ (la casilla que se modifica). Así no se protege §hist[key]§.

## Deadlock (bloqueo mutuo)

Cada participante espera algo que tiene otro, **en ciclo**, y nadie avanza. El programa no da error: se queda colgado. En los filósofos, si los 5 toman su tenedor izquierdo a la vez, todos esperan el derecho para siempre.

**Soluciones:** romper el orden circular (cada filósofo toma primero el tenedor de **menor índice**), limitar a N-1 los que intentan comer, o usar §omp_test_lock§ y soltar si el segundo no está libre.
`,
    checkpoints: [
      {
        id: "lock-hist",
        title: "Histograma con un lock por casilla",
        task: md`Cuenta cuántas veces aparece cada valor de §data[i] = (i*i) % 4§ (i < 40 000) en §hist[4]§. Protege cada casilla con **su propio lock** (§lock[key]§, no §lock[i]§). El programa imprime una línea §h0 h1 h2 h3§. (Pista: un cuadrado módulo 4 solo puede valer 0 o 1, así que dos casillas quedan en cero.)`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    const int N = 40000;
    int hist[4] = {0, 0, 0, 0};
    omp_lock_t lock[4];
    for (int b = 0; b < 4; b++) omp_init_lock(&lock[b]);

    #pragma omp parallel for num_threads(4)
    for (int i = 0; i < N; i++) {
        int key = (int)(((long long)i * i) % 4);
        // TODO: protege hist[key] con lock[key]
        hist[key]++;
    }
    for (int b = 0; b < 4; b++) omp_destroy_lock(&lock[b]);
    printf("%d %d %d %d\n", hist[0], hist[1], hist[2], hist[3]);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    const int N = 40000;
    int hist[4] = {0, 0, 0, 0};
    omp_lock_t lock[4];
    for (int b = 0; b < 4; b++) omp_init_lock(&lock[b]);

    #pragma omp parallel for num_threads(4)
    for (int i = 0; i < N; i++) {
        int key = (int)(((long long)i * i) % 4);
        omp_set_lock(&lock[key]);
        hist[key]++;
        omp_unset_lock(&lock[key]);
    }
    for (int b = 0; b < 4; b++) omp_destroy_lock(&lock[b]);
    printf("%d %d %d %d\n", hist[0], hist[1], hist[2], hist[3]);
    return 0;
}
`,
        hints: ["Toma el lock de la casilla justo antes de modificarla y suéltalo justo después."],
        tests: {
          static: [{ re: "omp_set_lock\\s*\\(\\s*&\\s*lock\\s*\\[\\s*key", want: true, msg: "Usa §lock[key]§ (la casilla), no §lock[i]§." }],
          runs: [{ expect: [{ kind: "exact", value: "20000 20000 0 0" }] }],
        },
      },
      {
        id: "filosofos",
        title: "Filósofos sin deadlock",
        task: md`5 filósofos, 5 tenedores (un lock cada uno). Cada filósofo toma el tenedor izquierdo y luego el derecho (con una pausa entre ambos que **fuerza** el deadlock). **El código inicial se cuelga** (tiene un temporizador de seguridad de 3 s). Rómpelo tomando **siempre primero el tenedor de menor índice**. Imprime §todos comieron: 5§.`,
        starter: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    alarm(3);   // seguridad: mata el programa si se cuelga
    setvbuf(stdout, NULL, _IONBF, 0);
    const int P = 5;
    omp_lock_t fork_[P];
    for (int i = 0; i < P; i++) omp_init_lock(&fork_[i]);
    int comieron = 0;

    #pragma omp parallel num_threads(P)
    {
        int i = omp_get_thread_num();
        int izq = i, der = (i + 1) % P;
        // TODO: toma primero el de menor índice
        omp_set_lock(&fork_[izq]);
        usleep(100000);
        omp_set_lock(&fork_[der]);
        #pragma omp atomic
        comieron++;
        omp_unset_lock(&fork_[der]);
        omp_unset_lock(&fork_[izq]);
    }
    printf("todos comieron: %d\n", comieron);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    alarm(3);
    setvbuf(stdout, NULL, _IONBF, 0);
    const int P = 5;
    omp_lock_t fork_[P];
    for (int i = 0; i < P; i++) omp_init_lock(&fork_[i]);
    int comieron = 0;

    #pragma omp parallel num_threads(P)
    {
        int i = omp_get_thread_num();
        int a = i, b = (i + 1) % P;
        int primero = a < b ? a : b;
        int segundo = a < b ? b : a;
        omp_set_lock(&fork_[primero]);
        usleep(100000);
        omp_set_lock(&fork_[segundo]);
        #pragma omp atomic
        comieron++;
        omp_unset_lock(&fork_[segundo]);
        omp_unset_lock(&fork_[primero]);
    }
    printf("todos comieron: %d\n", comieron);
    return 0;
}
`,
        hints: [
          "El deadlock existe porque el filósofo 4 toma el tenedor 4 y luego el 0, cerrando un ciclo de espera.",
          "Calcula §min(izq,der)§ y §max(izq,der)§ y toma siempre primero el menor.",
        ],
        tests: { runs: [{ expect: [{ kind: "exact", value: "todos comieron: 5" }] }] },
      },
    ],
  },

  {
    id: "reduction",
    title: "reduction: la forma elegante",
    unit: "U4.2",
    minutes: 15,
    summary: "Escalares, máximos y arreglos completos: cada hilo acumula en privado y OpenMP combina.",
    slideDeck: "u4-2",
    topic: "sincronizacion",
    intro: md`
## ¿Qué hace reduction?

§reduction(op:var)§ crea una copia **privada** de §var§ por hilo, inicializada con el **neutro** de §op§ (0 para §+§, 1 para §*§, el menor valor para §max§), y al final combina todas las copias con §op§ sobre el original.

Operadores: §+ * - & | ^ && ||§ y §max§ / §min§. Desde OpenMP 4.5, también **arreglos**: §reduction(+:H[:B])§.

## Tres versiones del histograma (PD04)

| Versión | Cómo combina | Tiempo (20 M datos, 4 hilos) |
|---|---|---|
| secuencial | — | 0.0061 s |
| histograma local + un §critical§ | suma 256 casillas bajo critical | 0.0031 s |
| histograma local + §atomic§ por casilla | | 0.0048 s |
| **§reduction(+:H[:B])§** | OpenMP combina | **0.0024 s** |

## Costo (cartera financiera, PD04 2026-II)

Con §N§ escenarios y §M§ activos: §reduction(+:g[:M])§ da $T_p \approx \frac{NM}{p} + (\text{combinar } p \text{ copias de } M)$, es decir $O\!\left(\frac{NM}{p} + M\log p\right)$ si la combinación es en árbol. Como $N \gg p$, domina el primer término. **Paraleliza el bucle de las muestras (N), no el de las características (M)** cuando $N \gg M$.
`,
    checkpoints: [
      {
        id: "pi",
        title: "Calcular π con reduction",
        task: md`Aproxima $\pi = \int_0^1 \frac{4}{1+x^2}dx$ con la suma de rectángulos (punto medio) y **N = 2 000 000** pasos. Paraleliza con §reduction(+:suma)§ e imprime §pi = 3.141593§ (6 decimales).`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    const long N = 2000000;
    const double h = 1.0 / N;
    double suma = 0.0;
    // TODO: paraleliza con reduction
    for (long i = 0; i < N; i++) {
        double x = (i + 0.5) * h;
        suma += 4.0 / (1.0 + x * x);
    }
    printf("pi = %.6f\n", suma * h);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    const long N = 2000000;
    const double h = 1.0 / N;
    double suma = 0.0;
    #pragma omp parallel for reduction(+:suma)
    for (long i = 0; i < N; i++) {
        double x = (i + 0.5) * h;
        suma += 4.0 / (1.0 + x * x);
    }
    printf("pi = %.6f\n", suma * h);
    return 0;
}
`,
        hints: ["§x§ se declara dentro del bucle, así que ya es privada. Solo falta tratar §suma§."],
        tests: {
          static: [{ re: "reduction\\s*\\(\\s*\\+\\s*:\\s*suma", want: true, msg: "Usa §reduction(+:suma)§." }],
          runs: [{ expect: [{ kind: "exact", value: "pi = 3.141593" }] }],
        },
      },
      {
        id: "reduction-array",
        title: "Histograma con reducción de arreglo",
        task: md`Genera §data[i] = (i*7) % 8§ para i < 80 000 y cuenta cuántas veces sale cada valor en §H[8]§ con **§reduction(+:H[:8])§**. Cada valor aparece 10 000 veces. Imprime §total=80000§ y §H0=10000§.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    const int N = 80000, B = 8;
    int H[B] = {0};
    // TODO: paraleliza con reducción de arreglo
    for (int i = 0; i < N; i++) {
        int b = (i * 7) % B;
        H[b]++;
    }
    int total = 0;
    for (int b = 0; b < B; b++) total += H[b];
    printf("total=%d\n", total);
    printf("H0=%d\n", H[0]);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    const int N = 80000, B = 8;
    int H[B] = {0};
    #pragma omp parallel for reduction(+:H[:B])
    for (int i = 0; i < N; i++) {
        int b = (i * 7) % B;
        H[b]++;
    }
    int total = 0;
    for (int b = 0; b < B; b++) total += H[b];
    printf("total=%d\n", total);
    printf("H0=%d\n", H[0]);
    return 0;
}
`,
        hints: ["La sintaxis de sección de arreglo es §H[:B]§ (desde 0, B elementos)."],
        tests: {
          static: [{ re: "reduction\\s*\\(\\s*\\+\\s*:\\s*H\\s*\\[\\s*:", want: true, msg: "Usa §reduction(+:H[:B])§." }],
          runs: [{ expect: [{ kind: "exact", value: "total=80000\nH0=10000" }] }],
        },
      },
      {
        id: "reduction-max",
        title: "Máximo con reduction(max:)",
        task: md`Rehaz el máximo de la lección anterior (§v[i] = (i*37) % 1000§, i < 100 000) pero ahora con **§reduction(max:mx)§**: sin §critical§ y sin variable local. Imprime §max=999§.`,
        starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    const int N = 100000;
    std::vector<int> v(N);
    for (int i = 0; i < N; i++) v[i] = (i * 37) % 1000;
    int mx = -1;
    // TODO
    for (int i = 0; i < N; i++)
        if (v[i] > mx) mx = v[i];
    printf("max=%d\n", mx);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    const int N = 100000;
    std::vector<int> v(N);
    for (int i = 0; i < N; i++) v[i] = (i * 37) % 1000;
    int mx = -1;
    #pragma omp parallel for reduction(max:mx)
    for (int i = 0; i < N; i++)
        if (v[i] > mx) mx = v[i];
    printf("max=%d\n", mx);
    return 0;
}
`,
        hints: ["§reduction(max:mx)§ en la directiva §parallel for§."],
        tests: {
          static: [
            { re: "reduction\\s*\\(\\s*max\\s*:\\s*mx", want: true, msg: "Usa §reduction(max:mx)§." },
            { re: "omp\\s+critical", want: false, msg: "Sin §critical§ esta vez." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "max=999" }] }],
        },
      },
    ],
  },

  {
    id: "memoria-ordered",
    title: "Modelo de memoria, flush y ordered",
    unit: "U4.3 · U4.4",
    minutes: 12,
    summary: "Por qué un acceso sin sincronizar no tiene garantías y cómo imprimir en orden.",
    slideDeck: "u4-4",
    topic: "memoria",
    intro: md`
## Por qué hace falta sincronizar

El hilo 0 hace §x = 5§ y el hilo 1 lee §x§ "al mismo tiempo": puede leer el valor viejo o el nuevo. Después de un §barrier§ ambos ven 5, porque la barrera incluye un **flush** implícito (vuelca a memoria los valores que cada hilo tenía en registros o caché).

El compilador (§-O3§) y el procesador **reordenan** instrucciones cuando no cambia el resultado secuencial. Un bucle §while (x == 1);§ puede volverse infinito porque el compilador asume que nadie más cambia §x§.

> **Un acceso compartido sin sincronizar (data race) no tiene garantías**, aunque "en la práctica" funcione. Solo las construcciones de sincronización (§barrier§, §critical§, §atomic§, §reduction§, §depend§, §flush§) establecen el orden **happens-before** entre hilos.

## ordered

Dentro de un §for ordered§, el bloque §#pragma omp ordered§ se ejecuta en el **orden secuencial** de las iteraciones. Sirve para imprimir en orden; cada iteración puede ejecutar como máximo una región §ordered§. Fuera de ese bloque el cuerpo sigue en paralelo.
`,
    checkpoints: [
      {
        id: "ordered",
        title: "Imprimir en orden con ordered",
        task: md`El bucle calcula §c = i*i§ en paralelo, pero imprime §i: c§ desordenado. Haz que las **impresiones salgan en orden** 0..7 usando la cláusula y la directiva §ordered§ (el cálculo sigue en paralelo).`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    #pragma omp parallel for num_threads(4) schedule(static,1)
    for (int i = 0; i < 8; i++) {
        int c = i * i;
        printf("%d: %d\n", i, c);
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    #pragma omp parallel for num_threads(4) schedule(static,1) ordered
    for (int i = 0; i < 8; i++) {
        int c = i * i;
        #pragma omp ordered
        printf("%d: %d\n", i, c);
    }
    return 0;
}
`,
        hints: ["Necesitas §ordered§ en la directiva del §for§ **y** §#pragma omp ordered§ antes del §printf§."],
        tests: {
          static: [
            { re: "parallel\\s+for[^\\n]*\\bordered\\b", want: true, msg: "Agrega la cláusula §ordered§ al §parallel for§." },
            { re: "omp\\s+ordered", want: true, msg: "Agrega §#pragma omp ordered§ antes del §printf§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "0: 0\n1: 1\n2: 4\n3: 9\n4: 16\n5: 25\n6: 36\n7: 49" }] }],
        },
      },
      {
        id: "threadprivate",
        title: "threadprivate entre regiones",
        task: md`§contador§ es global y **threadprivate**: cada hilo conserva su propio valor entre dos regiones paralelas. En la región 1 cada hilo hace §contador = id + 100§. En la región 2 cada hilo imprime §hilo ID: V§. Deben salir 100, 101, 102 y 103. (Con 4 hilos en ambas regiones y sin cambiar el número de hilos.)`,
        starter: code`
#include <cstdio>
#include <omp.h>

int contador = 0;
// TODO: declara contador como threadprivate

int main() {
    omp_set_dynamic(0);
    #pragma omp parallel num_threads(4)
    contador = omp_get_thread_num() + 100;

    #pragma omp parallel num_threads(4)
    printf("hilo %d: %d\n", omp_get_thread_num(), contador);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int contador = 0;
#pragma omp threadprivate(contador)

int main() {
    omp_set_dynamic(0);
    #pragma omp parallel num_threads(4)
    contador = omp_get_thread_num() + 100;

    #pragma omp parallel num_threads(4)
    printf("hilo %d: %d\n", omp_get_thread_num(), contador);
    return 0;
}
`,
        hints: ["§#pragma omp threadprivate(contador)§ justo debajo de la declaración global."],
        tests: {
          static: [{ re: "omp\\s+threadprivate\\s*\\(\\s*contador", want: true, msg: "Usa §#pragma omp threadprivate(contador)§." }],
          runs: [{ expect: [{ kind: "sorted", value: "hilo 0: 100\nhilo 1: 101\nhilo 2: 102\nhilo 3: 103" }] }],
        },
      },
    ],
  },

  {
    id: "tareas",
    title: "Tareas: task, single y taskwait",
    unit: "U4.3",
    minutes: 16,
    summary: "Trabajo irregular y recursivo: crea tareas, espera a las hijas y evita el exceso de granularidad.",
    slideDeck: "u4-3",
    topic: "tareas",
    intro: md`
## ¿Por qué tareas?

§for§ y §sections§ necesitan saber de antemano cuánto trabajo hay. Las **tareas** sirven para trabajo irregular o recursivo (árboles, quicksort, grafos de dependencias). Una tarea es "bloque de código + sus datos" que entra a una cola; **cualquier hilo libre** la ejecuta, ahora o más tarde.

**Patrón básico:** un solo hilo crea las tareas, todos las ejecutan.

§§§cpp
#pragma omp parallel      // crea el equipo
#pragma omp single        // solo uno crea las tareas
{
    #pragma omp task
    trabajo1();
    #pragma omp task
    trabajo2();
}                         // barrera: se esperan todas
§§§

Sin el §single§, **cada** hilo crearía las tareas: con 8 hilos saldrían 8 copias.

## Datos en tareas

Si la variable era **compartida** en la región, sigue compartida. Si era privada del hilo creador (local de una función, parámetro), la tarea recibe una **copia** (§firstprivate§) del valor al crearla. Los ejemplos del curso lo escriben explícito: §shared(x)§, §firstprivate(left,j)§.

## taskwait y cutoff

- **§taskwait§**: espera a las tareas **hijas directas** creadas hasta ese punto (no a las nietas).
- **§if(cond)§**: si es falso, la tarea se ejecuta de inmediato sin encolarse. Se usa como **cutoff**: no crees tareas diminutas.

§§§cpp
int fib(int n) {
    if (n < 2) return n;
    int x, y;
    #pragma omp task shared(x) if(n > 15)
    x = fib(n - 1);
    y = fib(n - 2);
    #pragma omp taskwait
    return x + y;
}
§§§
`,
    checkpoints: [
      {
        id: "tareas-basico",
        title: "Tres tareas, un creador",
        task: md`Crea **3 tareas** (§tarea 1§, §tarea 2§, §tarea 3§) dentro de una región de 4 hilos. Deben crearse **una sola vez** (no 4 veces cada una). Cada tarea imprime §tarea K§.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    #pragma omp parallel num_threads(4)
    {
        // TODO: asegúrate de que solo un hilo cree las tareas
        #pragma omp task
        printf("tarea 1\n");
        #pragma omp task
        printf("tarea 2\n");
        #pragma omp task
        printf("tarea 3\n");
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    #pragma omp parallel num_threads(4)
    #pragma omp single
    {
        #pragma omp task
        printf("tarea 1\n");
        #pragma omp task
        printf("tarea 2\n");
        #pragma omp task
        printf("tarea 3\n");
    }
    return 0;
}
`,
        hints: ["Envuelve la creación de tareas en un §#pragma omp single§."],
        tests: {
          static: [{ re: "omp\\s+single", want: true, msg: "Usa §single§ para crear las tareas una sola vez." }],
          runs: [{ expect: [{ kind: "sorted", value: "tarea 1\ntarea 2\ntarea 3" }] }],
        },
      },
      {
        id: "fib-tareas",
        title: "Fibonacci con tareas y cutoff",
        task: md`Calcula §fib(25) = 75025§ con tareas recursivas. Crea una tarea para §fib(n-1)§ (con §shared(x)§), calcula §fib(n-2)§ en el hilo actual y espera con §taskwait§. Usa **cutoff**: §if(n > 12)§ para no crear tareas diminutas. Imprime §fib(25) = 75025§.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int fib(int n) {
    if (n < 2) return n;
    int x, y;
    // TODO: tarea para fib(n-1) con shared(x) y if(n > 12); luego taskwait
    x = fib(n - 1);
    y = fib(n - 2);
    return x + y;
}

int main() {
    int r;
    #pragma omp parallel num_threads(4)
    #pragma omp single
    r = fib(25);
    printf("fib(25) = %d\n", r);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int fib(int n) {
    if (n < 2) return n;
    int x, y;
    #pragma omp task shared(x) if(n > 12)
    x = fib(n - 1);
    y = fib(n - 2);
    #pragma omp taskwait
    return x + y;
}

int main() {
    int r;
    #pragma omp parallel num_threads(4)
    #pragma omp single
    r = fib(25);
    printf("fib(25) = %d\n", r);
    return 0;
}
`,
        hints: [
          "Sin §taskwait§, §x§ podría no estar calculado cuando se suma.",
          "§#pragma omp task shared(x) if(n > 12)§ justo encima de §x = fib(n-1);§",
        ],
        tests: {
          static: [
            { re: "omp\\s+task\\b[^\\n]*if\\s*\\(", want: true, msg: "Agrega el cutoff §if(n > 12)§ a la tarea." },
            { re: "omp\\s+taskwait", want: true, msg: "Falta §taskwait§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "fib(25) = 75025" }] }],
        },
      },
    ],
  },

  {
    id: "taskgroup",
    title: "taskwait vs taskgroup y taskyield",
    unit: "U4.3",
    minutes: 10,
    summary: "Esperar a hijas directas o a todos los descendientes.",
    slideDeck: "u4-3",
    topic: "tareas",
    intro: md`
## Quién espera a quién

- **§taskwait§** espera a las tareas **hijas directas** creadas hasta ese punto. **No** espera a las nietas.
- **§taskgroup§** espera a todas las tareas creadas dentro del bloque **y a todas sus descendientes**.

§§§cpp
#pragma omp taskgroup
{
    #pragma omp task
    {                                  // A
        #pragma omp task               // A1: hija de A, nieta del grupo
        trabajo_A1();
    }
    #pragma omp task
    trabajo_B();
}                                      // aquí A1 ya terminó
§§§

Ejemplo del curso (§Ejemp04_taskwait02§): el §taskwait§ dentro de B espera a sus hijas C y D, así que E sale **siempre** después de C y D. Pero el §taskwait§ del §single§ solo espera a A y B: F sale después de A y B, pero **no necesariamente después de E** (nieta).

## taskyield

Dentro de una tarea larga, §#pragma omp taskyield§ le permite al hilo suspenderla y ejecutar otra tarea pendiente. Es solo una sugerencia al runtime. §untied§ permite que la tarea retome en **otro** hilo.
`,
    checkpoints: [
      {
        id: "taskgroup",
        title: "Esperar a las nietas",
        task: md`La tarea A crea una hija A1 que tarda 0.3 s en imprimir §A1§. Queremos que §despues§ se imprima **solo cuando A1 haya terminado**. Con §taskwait§ no basta (A1 es **nieta** del §single§). Usa §taskgroup§ para esperar a todos los descendientes.`,
        starter: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    #pragma omp parallel num_threads(4)
    #pragma omp single
    {
        #pragma omp task
        {
            #pragma omp task
            {
                usleep(300000);
                printf("A1\n");
            }
        }
        #pragma omp taskwait
        printf("despues\n");
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    #pragma omp parallel num_threads(4)
    #pragma omp single
    {
        #pragma omp taskgroup
        {
            #pragma omp task
            {
                #pragma omp task
                {
                    usleep(300000);
                    printf("A1\n");
                }
            }
        }
        printf("despues\n");
    }
    return 0;
}
`,
        hints: ["Encierra la creación de la tarea A dentro de un bloque §#pragma omp taskgroup { ... }§ y imprime después de él."],
        tests: {
          static: [{ re: "omp\\s+taskgroup", want: true, msg: "Usa §taskgroup§." }],
          runs: [{ expect: [{ kind: "exact", value: "A1\ndespues" }] }],
        },
      },
    ],
  },

  {
    id: "depend-dag",
    title: "Dependencias: depend(in/out) y DAGs",
    unit: "U4.3 · PD04",
    minutes: 18,
    summary: "Convierte un DAG en tareas con depend, calcula Ts, T∞ y Smax como en la PD04.",
    slideDeck: "u4-3",
    topic: "tareas",
    intro: md`
## depend

Le dices a OpenMP qué **lee** (§in§) y qué **escribe** (§out§, §inout§) cada tarea; él arma el DAG y respeta el orden. Una tarea §in: x§ espera a la última anterior con §out: x§. Una §out: x§ espera a todas las anteriores que leen o escriben §x§.

| Orden de creación | Resultado | Por qué |
|---|---|---|
| §out:x§ (x=2), luego §in:x§ (print) | 2 | el print espera a la escritura |
| §in:x§ (print), luego §out:x§ (x=2) | valor viejo | la escritura espera a la lectura |
| dos §out:x§ seguidas | la segunda | se ordenan como se crearon |
| §out:x§, luego dos §in:x§ | ambas leen 2 | lecturas independientes entre sí |

**El orden de creación importa**: §depend§ respeta el orden del código secuencial. Y las dependencias **solo ordenan tareas hermanas** (creadas por el mismo padre): si una tarea crea otra dentro de sí misma, esa hija no se ordena con las demás. Crea todas desde el mismo §single§.

## Métricas del DAG

$T_s$ = suma de todos los costos. $T_\infty$ = costo de la **ruta crítica** (camino más largo). $S_{max} = T_s/T_\infty$. Con $p$ hilos (Brent): $T_p \le T_s/p + T_\infty$.

**Ejercicio sensores (PD04 2026-II):** $P=A_0B_0$ (15 ms), $Q=A_1B_1$ (9), $C=P+Q$ (4), $E$=calidad (12), registrar (2).
$T_s = 42$ ms, ruta crítica $P \to C \to$ registrar $= 21$ ms, $S_{max}=2$. Con **2 hilos** no se alcanza $T_\infty$ (mejor reparto 19/21 antes de registrar → **23 ms**); con 3 hilos sí (21 ms).
`,
    checkpoints: [
      {
        id: "depend-basico",
        title: "El DAG a + b → c → print",
        task: md`Cuatro tareas creadas por el mismo §single§: T1 escribe §a = 1§, T2 escribe §b = 2§, T3 calcula §c = a + b§ y T4 imprime §c = V§. Cada una tarda 0.1 s (§usleep§) para que el orden incorrecto se note. Declara las dependencias (§depend(out:...)§ / §depend(in:...)§) para que imprima §c = 3§.`,
        starter: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    int a = 0, b = 0, c = 0;
    #pragma omp parallel num_threads(4)
    #pragma omp single
    {
        #pragma omp task shared(a)
        { usleep(100000); a = 1; }

        #pragma omp task shared(b)
        { usleep(100000); b = 2; }

        #pragma omp task shared(a, b, c)
        { usleep(100000); c = a + b; }

        #pragma omp task shared(c)
        { printf("c = %d\n", c); }
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    int a = 0, b = 0, c = 0;
    #pragma omp parallel num_threads(4)
    #pragma omp single
    {
        #pragma omp task shared(a) depend(out: a)
        { usleep(100000); a = 1; }

        #pragma omp task shared(b) depend(out: b)
        { usleep(100000); b = 2; }

        #pragma omp task shared(a, b, c) depend(in: a, b) depend(out: c)
        { usleep(100000); c = a + b; }

        #pragma omp task shared(c) depend(in: c)
        { printf("c = %d\n", c); }
    }
    return 0;
}
`,
        hints: [
          "T1 y T2 solo escriben: §depend(out: a)§ y §depend(out: b)§.",
          "T3 lee a y b y escribe c: §depend(in: a, b) depend(out: c)§. T4 solo lee c.",
        ],
        tests: {
          static: [
            { re: "depend\\s*\\(\\s*in\\s*:", want: true, msg: "Usa §depend(in: ...)§." },
            { re: "depend\\s*\\(\\s*out\\s*:", want: true, msg: "Usa §depend(out: ...)§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "c = 3" }] }],
        },
      },
      {
        id: "sensores",
        title: "Sensores: PD04 ejercicio 2",
        task: md`Implementa el DAG de los sensores con **tareas y depend**, **maximizando el paralelismo**: §multiplicar(A0,B0→P)§ y §multiplicar(A1,B1→Q)§ y §calidad(A0,A1→E)§ son independientes; §sumar(P,Q→C)§ espera a P y Q; §registrar(C,E)§ espera a C y E. Todas las funciones ya están escritas. La verificación final debe imprimir §OK§ (todos los §C[i]§ = 26 y §E§ = 2).`,
        starter: code`
#include <cmath>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

const int N = 1000;
vector<double> A0(N, 2.0), A1(N, 4.0), B0(N, 5.0), B1(N, 4.0), P(N), Q(N), C(N);
double E = 0, Sc = 0;

void multiplicar(const vector<double>& a, const vector<double>& b, vector<double>& r) {
    for (int i = 0; i < N; i++) r[i] = a[i] * b[i];
}
void sumar(const vector<double>& p, const vector<double>& q, vector<double>& c) {
    for (int i = 0; i < N; i++) c[i] = p[i] + q[i];
}
void calidad(const vector<double>& a, const vector<double>& b, double& e) {
    double s = 0;
    for (int i = 0; i < N; i++) s += fabs(a[i] - b[i]);
    e = s / N;
}
void registrar(const vector<double>& c, double e) {
    double s = 0;
    for (int i = 0; i < N; i++) s += c[i];
    Sc = s;
    (void)e;
}

int main() {
    #pragma omp parallel num_threads(4)
    #pragma omp single
    {
        // TODO: una tarea por función, con depend(in/out)
        multiplicar(A0, B0, P);
        multiplicar(A1, B1, Q);
        sumar(P, Q, C);
        calidad(A0, A1, E);
        registrar(C, E);
    }
    bool ok = fabs(E - 2.0) <= 1e-10;
    for (int i = 0; i < N; i++) ok = ok && fabs(C[i] - 26.0) <= 1e-10;
    printf("%s\n", ok ? "OK" : "ERROR");
    return 0;
}
`,
        solution: code`
#include <cmath>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

const int N = 1000;
vector<double> A0(N, 2.0), A1(N, 4.0), B0(N, 5.0), B1(N, 4.0), P(N), Q(N), C(N);
double E = 0, Sc = 0;

void multiplicar(const vector<double>& a, const vector<double>& b, vector<double>& r) {
    for (int i = 0; i < N; i++) r[i] = a[i] * b[i];
}
void sumar(const vector<double>& p, const vector<double>& q, vector<double>& c) {
    for (int i = 0; i < N; i++) c[i] = p[i] + q[i];
}
void calidad(const vector<double>& a, const vector<double>& b, double& e) {
    double s = 0;
    for (int i = 0; i < N; i++) s += fabs(a[i] - b[i]);
    e = s / N;
}
void registrar(const vector<double>& c, double e) {
    double s = 0;
    for (int i = 0; i < N; i++) s += c[i];
    Sc = s;
    (void)e;
}

int main() {
    // Las dependencias se declaran sobre variables escalares "etiqueta" (basta una por dato)
    int tP = 0, tQ = 0, tC = 0, tE = 0;
    #pragma omp parallel num_threads(4)
    #pragma omp single
    {
        #pragma omp task depend(out: tP)
        multiplicar(A0, B0, P);
        #pragma omp task depend(out: tQ)
        multiplicar(A1, B1, Q);
        #pragma omp task depend(in: tP, tQ) depend(out: tC)
        sumar(P, Q, C);
        #pragma omp task depend(out: tE)
        calidad(A0, A1, E);
        #pragma omp task depend(in: tC, tE)
        registrar(C, E);
    }
    bool ok = fabs(E - 2.0) <= 1e-10;
    for (int i = 0; i < N; i++) ok = ok && fabs(C[i] - 26.0) <= 1e-10;
    printf("%s\n", ok ? "OK" : "ERROR");
    return 0;
}
`,
        hints: [
          "§depend§ trabaja con variables. Puedes usar una variable escalar 'etiqueta' por dato (tP, tQ, tC, tE) o la dirección del primer elemento.",
          "sumar: §depend(in: tP, tQ) depend(out: tC)§. registrar: §depend(in: tC, tE)§.",
        ],
        tests: {
          static: [
            { re: "depend\\s*\\(\\s*in\\s*:[^)]*,", want: true, msg: "Una tarea debe depender de **dos** entradas (§depend(in: x, y)§)." },
            { re: "omp\\s+task[^\\n]*depend", want: true, msg: "Usa §task§ con §depend§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "OK" }] }],
        },
      },
    ],
  },
];
