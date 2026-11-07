import { md, code } from "@/lib/md";
import type { Lesson } from "@/lib/types";

export const lessons1: Lesson[] = [
  {
    id: "parallel",
    widget: "forkjoin",
    title: "La región paralela y el modelo fork-join",
    unit: "U4.1",
    minutes: 12,
    summary: "Crea tu primer equipo de hilos y descubre qué significa que todos ejecuten el mismo bloque.",
    slideDeck: "u4-1",
    topic: "fundamentos",
    intro: md`
## ¿Qué es OpenMP?

OpenMP es una API para **memoria compartida**: varios hilos de un mismo proceso ven las mismas variables. Tiene tres piezas:

1. **Directivas** §#pragma omp ...§: le dicen al compilador qué parte paralelizar. Sin §-fopenmp§ se ignoran y el programa sigue siendo secuencial y válido.
2. **Funciones de librería** (§#include <omp.h>§): §omp_get_thread_num()§, §omp_get_num_threads()§, §omp_set_num_threads(n)§, §omp_get_wtime()§.
3. **Variables de entorno**: §OMP_NUM_THREADS=4§, §OMP_SCHEDULE=dynamic,2§.

## Fork-join

§#pragma omp parallel§ crea un equipo de hilos (**fork**). **Todos** ejecutan el bloque completo. Al cerrar la llave hay una **barrera implícita**: el hilo maestro (hilo 0) espera a todos y sigue solo (**join**).

§§§cpp
#pragma omp parallel num_threads(4)
{
    int id = omp_get_thread_num();   // 0..3
    printf("Peekaboo desde el hilo %d\n", id);
}   // join: barrera implícita
§§§

> El orden de las líneas cambia en cada ejecución: los hilos corren a la vez y el sistema operativo decide quién imprime primero. Por eso en estos ejercicios la salida se compara **sin importar el orden**.

Todo lo declarado **dentro** de la región es privado de cada hilo. Lo declarado **fuera** es compartido.
`,
    checkpoints: [
      {
        id: "hola",
        title: "Hola desde cada hilo",
        task: md`Haz que **4 hilos** impriman cada uno una línea con el formato §Hola desde el hilo X de 4§ (X es el número del hilo). Usa §num_threads(4)§ en la directiva.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    // TODO: crea una región paralela de 4 hilos
    {
        int id = omp_get_thread_num();
        printf("Hola desde el hilo %d de %d\n", id, omp_get_num_threads());
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    #pragma omp parallel num_threads(4)
    {
        int id = omp_get_thread_num();
        printf("Hola desde el hilo %d de %d\n", id, omp_get_num_threads());
    }
    return 0;
}
`,
        hints: [
          "La directiva va justo encima de la llave de apertura del bloque.",
          "§#pragma omp parallel num_threads(4)§",
        ],
        tests: {
          static: [{ re: "#pragma\\s+omp\\s+parallel", want: true, msg: "Falta la directiva §#pragma omp parallel§." }],
          runs: [{ expect: [{ kind: "sorted", value: "Hola desde el hilo 0 de 4\nHola desde el hilo 1 de 4\nHola desde el hilo 2 de 4\nHola desde el hilo 3 de 4" }] }],
        },
      },
      {
        id: "reparto-manual",
        title: "Repartir un arreglo a mano",
        task: md`Hay **20 elementos** y **4 hilos**. Cada hilo debe calcular qué pedazo le toca usando solo su número de hilo (así lo hace §#pragma omp for§ por dentro): tamaño §n/nt§, inicio §id*tam§ y, si es el **último** hilo, se queda con el resto. Cada hilo imprime §hilo ID: [inicio, fin)§.

Con 20 elementos y 4 hilos, el hilo 0 hace 0–4, el 1 hace 5–9, etc.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    const int N = 20;
    #pragma omp parallel num_threads(4)
    {
        int id = omp_get_thread_num();
        int nt = omp_get_num_threads();
        // TODO: calcula tam, ini y fin (el último hilo llega hasta N)
        int ini = 0, fin = 0;
        printf("hilo %d: [%d, %d)\n", id, ini, fin);
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    const int N = 20;
    #pragma omp parallel num_threads(4)
    {
        int id = omp_get_thread_num();
        int nt = omp_get_num_threads();
        int tam = N / nt;
        int ini = id * tam;
        int fin = (id == nt - 1) ? N : ini + tam;
        printf("hilo %d: [%d, %d)\n", id, ini, fin);
    }
    return 0;
}
`,
        hints: ["tam = N / nt; ini = id * tam.", "fin = ini + tam, salvo para id == nt-1 donde fin = N."],
        tests: {
          runs: [{ expect: [{ kind: "sorted", value: "hilo 0: [0, 5)\nhilo 1: [5, 10)\nhilo 2: [10, 15)\nhilo 3: [15, 20)" }] }],
        },
      },
    ],
  },

  {
    id: "datos-privados",
    title: "Alcance de variables: shared, private y compañía",
    unit: "U4.2",
    minutes: 15,
    summary: "La carrera clásica del id, firstprivate y lastprivate.",
    slideDeck: "u4-2",
    topic: "datos",
    intro: md`
## Regla por defecto

Lo declarado **fuera** de la región es **compartido**; lo declarado **dentro** y el índice de un §omp for§ es **privado**.

| Cláusula | ¿Copia por hilo? | Valor inicial | Al salir |
|---|---|---|---|
| §shared(x)§ | no | — | — |
| §private(x)§ | sí | **sin inicializar (basura)** | el original no cambia |
| §firstprivate(x)§ | sí | el valor original | el original no cambia |
| §lastprivate(x)§ | sí | sin inicializar | el original toma el valor de la **última iteración** |
| §threadprivate(x)§ | sí, y dura entre regiones | — | cada hilo conserva su valor |
| §reduction(op:x)§ | sí | el neutro de §op§ | original §op§ copias |

## El error típico

§§§cpp
int id;                      // declarada FUERA: compartida
#pragma omp parallel
{
    id = omp_get_thread_num();   // los 4 hilos escriben la misma variable
    printf("%d\n", id);          // puede imprimir el id de otro hilo
}
§§§

Soluciones equivalentes: §private(id)§ o declarar §int id;§ **dentro** del bloque. Buena práctica: §default(none)§ obliga a declarar el alcance de cada variable.
`,
    checkpoints: [
      {
        id: "carrera-id",
        title: "Arregla la carrera del id",
        task: md`Cada hilo guarda su número en §id§, espera a los demás con §#pragma omp barrier§ y luego imprime §hilo ID§. Como §id§ es compartida, **todos imprimen el mismo número**. Corrígelo para que se impriman los hilos 0, 1, 2 y 3.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int id;
    #pragma omp parallel num_threads(4)
    {
        id = omp_get_thread_num();
        #pragma omp barrier
        printf("hilo %d\n", id);
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int id;
    #pragma omp parallel num_threads(4) private(id)
    {
        id = omp_get_thread_num();
        #pragma omp barrier
        printf("hilo %d\n", id);
    }
    return 0;
}
`,
        hints: ["Necesitas que cada hilo tenga su propia copia de §id§.", "Agrega §private(id)§ a la directiva §parallel§."],
        tests: { runs: [{ expect: [{ kind: "sorted", value: "hilo 0\nhilo 1\nhilo 2\nhilo 3" }] }] },
      },
      {
        id: "firstprivate",
        title: "firstprivate: copiar el valor inicial",
        task: md`Fuera de la región §x = 10§. Cada hilo debe sumar su número de hilo a **su copia** de §x§ (empezando en 10) e imprimir §hilo T: x=V§. Después de la región, el §x§ original debe seguir valiendo 10 (§x fuera = 10§). Con §private§ la copia empieza sin inicializar, así que necesitas otra cláusula.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int x = 10;
    #pragma omp parallel num_threads(4) private(x)
    {
        int t = omp_get_thread_num();
        x = x + t;
        printf("hilo %d: x=%d\n", t, x);
    }
    printf("x fuera = %d\n", x);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int x = 10;
    #pragma omp parallel num_threads(4) firstprivate(x)
    {
        int t = omp_get_thread_num();
        x = x + t;
        printf("hilo %d: x=%d\n", t, x);
    }
    printf("x fuera = %d\n", x);
    return 0;
}
`,
        hints: ["§private§ no copia el valor; la otra familia sí."],
        tests: {
          static: [{ re: "firstprivate\\s*\\(\\s*x", want: true, msg: "Usa §firstprivate(x)§." }],
          runs: [{ expect: [{ kind: "sorted", value: "hilo 0: x=10\nhilo 1: x=11\nhilo 2: x=12\nhilo 3: x=13\nx fuera = 10" }] }],
        },
      },
      {
        id: "lastprivate",
        title: "lastprivate: el valor de la última iteración",
        task: md`El bucle calcula §a[i] = 2*i§ para §i = 0..9§. Queremos que §ult§ (variable privada en el bucle) valga **después del bucle** el valor que tuvo en la **última iteración secuencial** (§i = 9§, o sea 18). Imprime §ult = 18§.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int a[10];
    int ult = -1;
    #pragma omp parallel for num_threads(4) private(ult)
    for (int i = 0; i < 10; i++) {
        a[i] = 2 * i;
        ult = a[i];
    }
    printf("ult = %d\n", ult);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int a[10];
    int ult = -1;
    #pragma omp parallel for num_threads(4) lastprivate(ult)
    for (int i = 0; i < 10; i++) {
        a[i] = 2 * i;
        ult = a[i];
    }
    printf("ult = %d\n", ult);
    return 0;
}
`,
        hints: ["Reemplaza §private(ult)§ por la cláusula que copia de vuelta el valor de la última iteración."],
        tests: {
          static: [{ re: "lastprivate\\s*\\(\\s*ult", want: true, msg: "Usa §lastprivate(ult)§." }],
          runs: [{ expect: [{ kind: "exact", value: "ult = 18" }] }],
        },
      },
    ],
  },

  {
    id: "omp-for",
    title: "Repartir bucles: omp for y collapse",
    unit: "U4.1",
    minutes: 14,
    summary: "parallel for, el índice privado y cuándo collapse reparte mejor.",
    slideDeck: "u4-1",
    topic: "worksharing",
    intro: md`
## Worksharing

Los constructores de **worksharing** (§for§, §sections§, §single§) van **dentro** de una región §parallel§ y **no crean hilos nuevos**: reparten el trabajo entre los existentes. Tienen barrera implícita al final salvo §nowait§.

§§§cpp
#pragma omp parallel for       // = parallel + for
for (int i = 0; i < n; i++)
    a[i] = f(i);
§§§

**Requisito:** las iteraciones deben ser **independientes** (la iteración §i§ no puede necesitar el resultado de la §i-1§). El índice del bucle es privado automáticamente.

## collapse

Con dos bucles anidados, §parallel for§ solo reparte el externo. Si el externo tiene pocas iteraciones, sobran hilos: con 4 filas y 8 hilos, 4 hilos no hacen nada. §collapse(2)§ junta los dos bucles en uno de §N*M§ iteraciones.

§§§cpp
#pragma omp parallel for collapse(2)
for (int i = 0; i < 4; i++)
    for (int j = 0; j < 16; j++) ...
§§§
`,
    checkpoints: [
      {
        id: "parallel-for",
        title: "Tu primer parallel for",
        task: md`Rellena §a[i] = i*i§ para §i = 0..99§ en paralelo con §parallel for§ e imprime §a[99] = 9801§.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int a[100];
    // TODO: paraleliza este bucle
    for (int i = 0; i < 100; i++)
        a[i] = i * i;
    printf("a[99] = %d\n", a[99]);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int a[100];
    #pragma omp parallel for
    for (int i = 0; i < 100; i++)
        a[i] = i * i;
    printf("a[99] = %d\n", a[99]);
    return 0;
}
`,
        hints: ["§#pragma omp parallel for§ justo antes del §for§."],
        tests: {
          static: [{ re: "omp\\s+parallel\\s+for", want: true, msg: "Usa §#pragma omp parallel for§." }],
          runs: [{ expect: [{ kind: "exact", value: "a[99] = 9801" }] }],
        },
      },
      {
        id: "static-1",
        title: "¿Qué hilo hace cada iteración?",
        task: md`Con **8 iteraciones** y **4 hilos**, usa §schedule(static,1)§ para repartirlas en ronda (round-robin): la iteración §i§ la hace el hilo §i % 4§. El programa guarda en §quien[i]§ el hilo que la ejecutó e imprime una línea §i=K hilo=T§ por iteración (ya lo hace el código).`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int quien[8];
    #pragma omp parallel for num_threads(4)   // TODO: agrega schedule(static,1)
    for (int i = 0; i < 8; i++)
        quien[i] = omp_get_thread_num();
    for (int i = 0; i < 8; i++)
        printf("i=%d hilo=%d\n", i, quien[i]);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int quien[8];
    #pragma omp parallel for num_threads(4) schedule(static,1)
    for (int i = 0; i < 8; i++)
        quien[i] = omp_get_thread_num();
    for (int i = 0; i < 8; i++)
        printf("i=%d hilo=%d\n", i, quien[i]);
    return 0;
}
`,
        hints: ["Por defecto §static§ sin tamaño de bloque da bloques consecutivos: 0,0,1,1,2,2,3,3.", "§schedule(static,1)§: bloques de 1 iteración repartidos en ronda."],
        tests: {
          static: [{ re: "schedule\\s*\\(\\s*static\\s*,\\s*1\\s*\\)", want: true, msg: "Usa §schedule(static,1)§." }],
          runs: [{ expect: [{ kind: "exact", value: "i=0 hilo=0\ni=1 hilo=1\ni=2 hilo=2\ni=3 hilo=3\ni=4 hilo=0\ni=5 hilo=1\ni=6 hilo=2\ni=7 hilo=3" }] }],
        },
      },
      {
        id: "collapse",
        title: "collapse(2): repartir mejor",
        task: md`Hay **8 hilos** y un doble bucle de **4 filas × 16 columnas** (64 iteraciones). Cada hilo cuenta sus iteraciones en §cnt[id]§. Sin §collapse§, el hilo 0 hace las 16 de la fila 0 y 4 hilos no hacen nada. Con §collapse(2)§ y reparto estático, el hilo 0 debe hacer **8**. Imprime §hilo 0 hizo 8§.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int cnt[8] = {0};
    #pragma omp parallel for num_threads(8)    // TODO: reparte las 64 iteraciones
    for (int i = 0; i < 4; i++)
        for (int j = 0; j < 16; j++)
            cnt[omp_get_thread_num()]++;
    printf("hilo 0 hizo %d\n", cnt[0]);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int cnt[8] = {0};
    #pragma omp parallel for num_threads(8) collapse(2)
    for (int i = 0; i < 4; i++)
        for (int j = 0; j < 16; j++)
            cnt[omp_get_thread_num()]++;
    printf("hilo 0 hizo %d\n", cnt[0]);
    return 0;
}
`,
        hints: ["64 iteraciones / 8 hilos = 8 por hilo, si se reparten juntas.", "Agrega §collapse(2)§ a la directiva."],
        tests: {
          static: [{ re: "collapse\\s*\\(\\s*2\\s*\\)", want: true, msg: "Usa §collapse(2)§." }],
          runs: [{ threads: 8, expect: [{ kind: "exact", value: "hilo 0 hizo 8" }] }],
        },
      },
    ],
  },

  {
    id: "schedule",
    widget: "schedule",
    title: "schedule: static, dynamic y guided",
    unit: "U4.1",
    minutes: 12,
    summary: "Explora visualmente cómo se reparten las iteraciones y cuándo conviene cada política.",
    slideDeck: "u4-1",
    topic: "worksharing",
    intro: md`
## Políticas de reparto

§schedule(tipo[,chunk])§ decide cómo se reparten las iteraciones de un §for§:

- **§static§**: bloques iguales decididos **antes** de empezar. Siempre igual en cada ejecución. Mínimo overhead. Ideal si todas las iteraciones cuestan lo mismo.
- **§static,c§**: bloques de §c§ iteraciones repartidos en ronda.
- **§dynamic,c§**: cada hilo pide un bloque de §c§ cuando termina el anterior. Útil si el costo es **desigual**, pero cuesta más coordinar.
- **§guided§**: como §dynamic§, pero los bloques empiezan grandes y se van achicando.
- **§runtime§**: lo decide la variable §OMP_SCHEDULE§. **§auto§**: lo decide el compilador.

Con trabajo muy pequeño por iteración, §dynamic§ no reparte bien (un hilo puede quedarse con todo porque termina antes de que los demás lleguen a pedir) y solo agrega costo.

Usa el visualizador para ver cómo cambia el reparto. El caso con costo **creciente** (triangular) es el clásico donde §static§ desbalancea.
`,
    checkpoints: [
      {
        id: "static-2",
        title: "static con bloques de 2",
        task: md`Con **16 iteraciones** y **4 hilos**, usa §schedule(static,2)§. El resultado esperado (hilo que hace cada iteración) es §0 0 1 1 2 2 3 3 0 0 1 1 2 2 3 3§. El programa imprime esa fila.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int quien[16];
    #pragma omp parallel for num_threads(4)    // TODO
    for (int i = 0; i < 16; i++)
        quien[i] = omp_get_thread_num();
    for (int i = 0; i < 16; i++) printf("%d ", quien[i]);
    printf("\n");
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int quien[16];
    #pragma omp parallel for num_threads(4) schedule(static,2)
    for (int i = 0; i < 16; i++)
        quien[i] = omp_get_thread_num();
    for (int i = 0; i < 16; i++) printf("%d ", quien[i]);
    printf("\n");
    return 0;
}
`,
        hints: ["§schedule(static,2)§"],
        tests: {
          static: [{ re: "schedule\\s*\\(\\s*static\\s*,\\s*2", want: true, msg: "Usa §schedule(static,2)§." }],
          runs: [{ expect: [{ kind: "exact", value: "0 0 1 1 2 2 3 3 0 0 1 1 2 2 3 3" }] }],
        },
      },
      {
        id: "dynamic-sum",
        title: "dynamic + reduction",
        task: md`Suma §sum += i§ para §i = 0..9999§ con §schedule(dynamic,100)§ y una **reducción** (no uses §critical§ ni §atomic§). Imprime §sum = 49995000§.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    long long sum = 0;
    // TODO: paraleliza con schedule(dynamic,100) y reduction
    for (int i = 0; i < 10000; i++)
        sum += i;
    printf("sum = %lld\n", sum);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    long long sum = 0;
    #pragma omp parallel for schedule(dynamic,100) reduction(+:sum)
    for (int i = 0; i < 10000; i++)
        sum += i;
    printf("sum = %lld\n", sum);
    return 0;
}
`,
        hints: ["Combina §parallel for§, §schedule(dynamic,100)§ y §reduction(+:sum)§ en una sola directiva."],
        tests: {
          static: [
            { re: "schedule\\s*\\(\\s*dynamic", want: true, msg: "Usa §schedule(dynamic,100)§." },
            { re: "reduction\\s*\\(\\s*\\+\\s*:\\s*sum", want: true, msg: "Usa §reduction(+:sum)§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "sum = 49995000" }] }],
        },
      },
    ],
  },

  {
    id: "sections-single",
    title: "sections, single, master y barrier",
    unit: "U4.1",
    minutes: 14,
    summary: "Tareas distintas por hilo, quién ejecuta qué y cuándo hay sincronización implícita.",
    slideDeck: "u4-1",
    topic: "worksharing",
    intro: md`
## sections

Para **tareas distintas** (no un mismo bucle): cada §section§ la ejecuta un hilo, una sola vez. Con 4 hilos y 3 secciones, un hilo se queda sin trabajo.

§§§cpp
#pragma omp parallel sections
{
    #pragma omp section
    suma(a, b, c);
    #pragma omp section
    producto(a, b, d);
}
§§§

## single vs master

- **§single§**: lo ejecuta **un solo hilo, cualquiera**. Los demás esperan al final (barrera implícita) salvo §nowait§. Típico para inicializar o hacer E/S.
- **§master§**: lo ejecuta **solo el hilo 0** y **no tiene barrera**: los demás se lo saltan sin esperar.

## nowait y barrier

Cada constructor de worksharing termina con barrera implícita. §nowait§ la quita. Es seguro solo si lo que viene después **no depende** de lo anterior, o si el reparto es el mismo (§schedule(static)§ con igual número de iteraciones asigna los mismos índices al mismo hilo). §#pragma omp barrier§ fuerza la espera explícita y además hace un *flush*.
`,
    checkpoints: [
      {
        id: "sections",
        title: "Dos secciones",
        task: md`Calcula en dos §section§ distintas: la **suma** de 1..100 y el **factorial** de 10. Imprime §suma=5050§ y §fact=3628800§ (una línea cada una, el orden no importa).`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    long long suma = 0, fact = 1;
    // TODO: usa parallel sections con dos section
    {
        for (int i = 1; i <= 100; i++) suma += i;
        for (int i = 2; i <= 10; i++) fact *= i;
    }
    printf("suma=%lld\n", suma);
    printf("fact=%lld\n", fact);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    long long suma = 0, fact = 1;
    #pragma omp parallel sections num_threads(2)
    {
        #pragma omp section
        { for (int i = 1; i <= 100; i++) suma += i; }
        #pragma omp section
        { for (int i = 2; i <= 10; i++) fact *= i; }
    }
    printf("suma=%lld\n", suma);
    printf("fact=%lld\n", fact);
    return 0;
}
`,
        hints: ["Cada trabajo va en su propio §#pragma omp section§ dentro de §parallel sections§."],
        tests: {
          static: [{ re: "omp\\s+section\\b", want: true, msg: "Usa §#pragma omp section§ para cada trabajo." }],
          runs: [{ expect: [{ kind: "sorted", value: "suma=5050\nfact=3628800" }] }],
        },
      },
      {
        id: "single-master",
        title: "single y master",
        task: md`Dentro de una región de 4 hilos: **solo un hilo** (cualquiera) imprime §init§ usando §single§, **solo el maestro** imprime §soy el maestro§ usando §master§, y cada hilo imprime §hilo T listo§. Ahora todos imprimen todo.`,
        starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    #pragma omp parallel num_threads(4)
    {
        printf("init\n");
        printf("soy el maestro\n");
        printf("hilo %d listo\n", omp_get_thread_num());
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    #pragma omp parallel num_threads(4)
    {
        #pragma omp single
        printf("init\n");
        #pragma omp master
        printf("soy el maestro\n");
        printf("hilo %d listo\n", omp_get_thread_num());
    }
    return 0;
}
`,
        hints: ["§#pragma omp single§ y §#pragma omp master§ se aplican a la sentencia siguiente."],
        tests: {
          static: [
            { re: "omp\\s+single", want: true, msg: "Usa §single§." },
            { re: "omp\\s+master", want: true, msg: "Usa §master§." },
          ],
          runs: [{ expect: [{ kind: "sorted", value: "init\nsoy el maestro\nhilo 0 listo\nhilo 1 listo\nhilo 2 listo\nhilo 3 listo" }] }],
        },
      },
      {
        id: "barrier",
        title: "barrier entre fases",
        task: md`Fase 1: cada hilo escribe §a[id] = id + 1§. Fase 2: cada hilo lee el valor de su **vecino** §a[(id+1)%4]§ e imprime §hilo ID ve V§. Sin sincronizar, un hilo puede leer antes de que el vecino escriba. Agrega la sincronización necesaria **entre** las dos fases.`,
        starter: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    int a[4] = {0, 0, 0, 0};
    #pragma omp parallel num_threads(4)
    {
        int id = omp_get_thread_num();
        if (id == 1) usleep(100000);      // el hilo 1 llega tarde
        a[id] = id + 1;
        // TODO: sincroniza aquí
        printf("hilo %d ve %d\n", id, a[(id + 1) % 4]);
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    int a[4] = {0, 0, 0, 0};
    #pragma omp parallel num_threads(4)
    {
        int id = omp_get_thread_num();
        if (id == 1) usleep(100000);
        a[id] = id + 1;
        #pragma omp barrier
        printf("hilo %d ve %d\n", id, a[(id + 1) % 4]);
    }
    return 0;
}
`,
        hints: ["Hay una directiva que hace que ningún hilo avance hasta que todos llegaron."],
        tests: {
          static: [{ re: "omp\\s+barrier", want: true, msg: "Agrega §#pragma omp barrier§." }],
          runs: [{ expect: [{ kind: "sorted", value: "hilo 0 ve 2\nhilo 1 ve 3\nhilo 2 ve 4\nhilo 3 ve 1" }] }],
        },
      },
    ],
  },
];
