import { md, code } from "@/lib/md";
import type { Problem } from "@/lib/types";
import { X } from "./problem-helpers";

const PAR = { re: "omp\\s+parallel", want: true, msg: "Falta una directiva §#pragma omp parallel§." };

export const problems2: Problem[] = [
  {
    slug: "ordered-log",
    title: "Bitácora en orden con ordered",
    topic: "memoria",
    diff: "facil",
    source: "U4.3 · ordered",
    statement: md`
Para $i=0..11$ calcula §f(i)§ (costoso) en paralelo, pero **imprime** las líneas §i=<i> f=<f(i)>§ en orden creciente de $i$.

Sin §ordered§ las líneas salen mezcladas. Mantén el cómputo de §f(i)§ **fuera** del bloque ordenado para conservar el paralelismo.`,
    starter: code`
#include <cstdio>
#include <omp.h>

static long f(int i) {
    long s = 0;
    for (int k = 0; k < 300000; k++) s += ((long)i * k) % 7;
    return s;
}

int main() {
    // TODO: paraleliza el cómputo pero imprime en orden
    for (int i = 0; i < 12; i++) {
        long v = f(i);
        printf("i=%d f=%ld\n", i, v);
    }
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <omp.h>

static long f(int i) {
    long s = 0;
    for (int k = 0; k < 300000; k++) s += ((long)i * k) % 7;
    return s;
}

int main() {
    #pragma omp parallel for ordered schedule(dynamic)
    for (int i = 0; i < 12; i++) {
        long v = f(i);
        #pragma omp ordered
        printf("i=%d f=%ld\n", i, v);
    }
    return 0;
}
`,
    hints: ["Hacen falta **dos** cosas: la cláusula §ordered§ en el §for§ y la directiva §#pragma omp ordered§ alrededor del §printf§."],
    editorial: md`
## Idea
La cláusula §ordered§ en el bucle declara que habrá un bloque ordenado; el bloque §#pragma omp ordered§ se ejecuta en el **orden secuencial de las iteraciones**. Lo demás del cuerpo sigue en paralelo.

## Complejidad
Con costo $c$ por §f§ y $n$ iteraciones: $T_p\approx nc/p + n\cdot t_{print}$ en el peor caso: la parte ordenada es **serial** (Amdahl). Mientras $t_{print}\ll c$ el speedup se conserva.`,
    tests: {
      static: [PAR, { re: "omp\\s+(parallel\\s+)?for[^\\n]*ordered", want: true, msg: "Añade la cláusula §ordered§ al §for§." }, { re: "omp\\s+ordered", want: true, msg: "Rodea el §printf§ con §#pragma omp ordered§." }],
      runs: [{ threads: 4, expect: [X("ordered-log", 0)] }, { threads: 8, expect: [X("ordered-log", 1)] }],
    },
  },
  {
    slug: "productor-consumidor",
    title: "Productor-consumidor con flush",
    topic: "memoria",
    diff: "dificil",
    source: "U4.3 · modelo de memoria",
    statement: md`
Dos hilos comparten una casilla §slot§ y una bandera §full§. El productor escribe los valores $1,2,\dots,100$ uno a uno (esperando a que §full==0§) y el consumidor los suma (esperando a que §full==1§).

**Salida:** §suma=5050§.

Si lees/escribes §full§ como variable normal, el compilador puede dejarla en un registro y el bucle de espera **nunca termina** (el código inicial se aborta a los 3 s). Usa §atomic read/write§ (§seq_cst§) y/o §flush§ para garantizar visibilidad.`,
    starter: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    alarm(3); // seguridad: si el programa se cuelga, se aborta
    int slot = 0, full = 0;
    long suma = 0;

    #pragma omp parallel num_threads(2)
    {
        if (omp_get_thread_num() == 0) {
            for (int v = 1; v <= 100; v++) {
                while (full) { }          // esperar casilla vacía
                slot = v;
                full = 1;
            }
        } else {
            for (int k = 0; k < 100; k++) {
                while (!full) { }         // esperar dato
                suma += slot;
                full = 0;
            }
        }
    }
    printf("suma=%ld\n", suma);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <unistd.h>
#include <omp.h>

int main() {
    alarm(10);
    int slot = 0, full = 0;
    long suma = 0;

    #pragma omp parallel num_threads(2)
    {
        if (omp_get_thread_num() == 0) {
            for (int v = 1; v <= 100; v++) {
                int f;
                do {
                    #pragma omp atomic read seq_cst
                    f = full;
                } while (f);
                slot = v;
                #pragma omp flush
                #pragma omp atomic write seq_cst
                full = 1;
            }
        } else {
            for (int k = 0; k < 100; k++) {
                int f;
                do {
                    #pragma omp atomic read seq_cst
                    f = full;
                } while (!f);
                #pragma omp flush
                suma += slot;
                #pragma omp atomic write seq_cst
                full = 0;
            }
        }
    }
    printf("suma=%ld\n", suma);
    return 0;
}
`,
    hints: [
      "El problema es de **visibilidad**: sin punto de sincronización, un hilo puede no ver nunca la escritura del otro.",
      "Lee la bandera con §#pragma omp atomic read seq_cst§ (guárdala en una variable local) y escríbela con §atomic write seq_cst§.",
      "Añade §#pragma omp flush§ después de escribir §slot§ y antes de leerlo para publicar el dato.",
    ],
    editorial: md`
## Modelo de memoria
OpenMP usa **consistencia relajada**: las escrituras de un hilo sólo son visibles para otros tras un §flush§ (implícito en §barrier§, §critical§, locks, atomics §seq_cst§…). El compilador puede además *hoistear* la lectura de §full§ fuera del bucle de espera.

## Patrón correcto
1. Productor: escribe §slot§, §flush§, escribe §full=1§ (atomic write).
2. Consumidor: lee §full§ (atomic read) hasta 1, §flush§, lee §slot§, §full=0§.

## Costo
La espera activa consume CPU: con $n$ elementos hay $n$ handshakes: $T\approx n\cdot t_{handshake}$ y **no hay speedup** (productor y consumidor se alternan). Un buffer circular o tareas con §depend§ desacopla ambos y permite solapar.`,
    tests: {
      static: [PAR, { re: "omp\\s+(flush|atomic\\s+(read|write))", want: true, msg: "Usa §flush§ o §atomic read/write§ para la bandera." }],
      runs: [{ threads: 2, expect: [X("productor-consumidor", 0)] }],
    },
  },
  {
    slug: "sensores",
    title: "Datos de sensores: tareas con depend",
    topic: "tareas",
    diff: "medio",
    source: "PD04 2026-II · Ej. 2",
    statement: md`
Dos conjuntos de mediciones producen $C = A_0 B_0 + A_1 B_1$ (producto elemento a elemento) y un indicador de calidad $E=\frac1N\sum|A_{0,i}-A_{1,i}|$. Al final se **registra** sumando $C$ e imprimiendo con $E$.

Dependencias: §multiplicar(A0,B0,P)§ y §multiplicar(A1,B1,Q)§ son independientes; §sumar(P,Q,C)§ necesita $P,Q$; §calidad§ sólo $A_0,A_1$; §registrar§ necesita $C$ y $E$.

Implementa el grafo con §task§ y cláusulas §depend§ para **maximizar el paralelismo**.

**Salida:** §C_ok=1 E_ok=1 sumC=<suma de C>§.`,
    starter: code`
#include <cstdio>
#include <cmath>
#include <vector>
#include <omp.h>

static void multiplicar(const double *A, const double *B, double *P, int n) { for (int i = 0; i < n; i++) P[i] = A[i] * B[i]; }
static void sumar(const double *P, const double *Q, double *C, int n) { for (int i = 0; i < n; i++) C[i] = P[i] + Q[i]; }
static void calidad(const double *A0, const double *A1, double *E, int n) {
    double s = 0;
    for (int i = 0; i < n; i++) s += std::fabs(A0[i] - A1[i]);
    *E = s / n;
}
static void registrar(const double *C, double E, int n) {
    double sc = 0;
    for (int i = 0; i < n; i++) sc += C[i];
    bool c_ok = true;
    for (int i = 0; i < n; i++) if (std::fabs(C[i] - 26.0) > 1e-10) c_ok = false;
    bool e_ok = std::fabs(E - 2.0) <= 1e-10;
    printf("C_ok=%d E_ok=%d sumC=%.0f\n", c_ok, e_ok, sc);
}

int main() {
    const int n = 20000;
    std::vector<double> A0(n, 2), B0(n, 5), A1(n, 4), B1(n, 4), P(n), Q(n), C(n);
    double E = 0;

    // TODO: crea tareas con depend según el DAG (parallel + single)
    multiplicar(A0.data(), B0.data(), P.data(), n);
    multiplicar(A1.data(), B1.data(), Q.data(), n);
    sumar(P.data(), Q.data(), C.data(), n);
    calidad(A0.data(), A1.data(), &E, n);
    registrar(C.data(), E, n);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <cmath>
#include <vector>
#include <omp.h>

static void multiplicar(const double *A, const double *B, double *P, int n) { for (int i = 0; i < n; i++) P[i] = A[i] * B[i]; }
static void sumar(const double *P, const double *Q, double *C, int n) { for (int i = 0; i < n; i++) C[i] = P[i] + Q[i]; }
static void calidad(const double *A0, const double *A1, double *E, int n) {
    double s = 0;
    for (int i = 0; i < n; i++) s += std::fabs(A0[i] - A1[i]);
    *E = s / n;
}
static void registrar(const double *C, double E, int n) {
    double sc = 0;
    for (int i = 0; i < n; i++) sc += C[i];
    bool c_ok = true;
    for (int i = 0; i < n; i++) if (std::fabs(C[i] - 26.0) > 1e-10) c_ok = false;
    bool e_ok = std::fabs(E - 2.0) <= 1e-10;
    printf("C_ok=%d E_ok=%d sumC=%.0f\n", c_ok, e_ok, sc);
}

int main() {
    const int n = 20000;
    std::vector<double> A0(n, 2), B0(n, 5), A1(n, 4), B1(n, 4), P(n), Q(n), C(n);
    double E = 0;
    double *pP = P.data(), *pQ = Q.data(), *pC = C.data();

    #pragma omp parallel num_threads(4)
    #pragma omp single
    {
        #pragma omp task depend(out: pP[0])
        multiplicar(A0.data(), B0.data(), pP, n);
        #pragma omp task depend(out: pQ[0])
        multiplicar(A1.data(), B1.data(), pQ, n);
        #pragma omp task depend(in: pP[0], pQ[0]) depend(out: pC[0])
        sumar(pP, pQ, pC, n);
        #pragma omp task depend(out: E)
        calidad(A0.data(), A1.data(), &E, n);
        #pragma omp task depend(in: pC[0], E)
        registrar(pC, E, n);
    }
    return 0;
}
`,
    hints: [
      "Genera las tareas desde **un solo hilo** (§parallel§ + §single§) y deja que el runtime las reparta.",
      "Cada tarea declara lo que **escribe** con §depend(out: x)§ y lo que **lee** con §depend(in: x)§.",
      "Para arreglos usa un elemento representativo: §depend(out: P[0])§ (o la sección completa).",
    ],
    editorial: md`
## DAG
§§§
mult1 ──┐
        ├─► sumar ──┐
mult2 ──┘           ├─► registrar
calidad ────────────┘
§§§

## Métricas con los tiempos medidos
Tiempos: mult1 = 15, mult2 = 9, sumar = 4, calidad = 12, registrar = 2 (ms).

- $T_s = 15+9+4+12+2 = 42$ ms.
- Caminos: mult1→sumar→registrar = 21; mult2→sumar→registrar = 15; calidad→registrar = 14.
- **Ruta crítica** mult1→sumar→registrar, $T_\infty = 21$ ms.
- $S_{max}=T_s/T_\infty = 42/21 = 2$.
- **¿Bastan 2 hilos para alcanzar $T_\infty$?** Sí: H0 ejecuta mult1(15)→sumar(4)→registrar(2) = 21; H1 ejecuta mult2(9)→calidad(12) = 21. Ambos terminan en 21 ms, así que 2 hilos alcanzan $T_\infty$ y $S=2$.

## Complejidad
Con $N$ elementos: $T_s=\Theta(N)$, $T_\infty=\Theta(N)$ (cada etapa es lineal), paralelismo constante ≈ 2: las tareas son de grano grueso, la ganancia está acotada por el **camino crítico**, no por el número de hilos.`,
    tests: {
      static: [PAR, { re: "omp\\s+single", want: true, msg: "Genera las tareas desde un solo hilo con §single§." }, { re: "omp\\s+task", want: true, msg: "Usa §#pragma omp task§." }, { re: "depend\\s*\\(\\s*in", want: true, msg: "Usa §depend(in: ...)§ para expresar las lecturas." }, { re: "depend\\s*\\(\\s*out", want: true, msg: "Usa §depend(out: ...)§ para expresar las escrituras." }],
      runs: [{ threads: 4, expect: [X("sensores", 0)] }, { threads: 2, expect: [X("sensores", 1)] }],
    },
  },
  {
    slug: "postorden",
    title: "Recorrido post-orden con tareas",
    topic: "tareas",
    diff: "medio",
    source: "PD04 2025-I · Ej. 3",
    statement: md`
Un árbol binario completo de $n=2^k-1$ nodos se guarda en un arreglo (hijos de $i$: $2i+1$, $2i+2$). Cada nodo tiene valor $v_i=i^2 \bmod 10$.

En **post-orden** se calcula para cada nodo la suma de su subárbol $s_i=v_i+s_{2i+1}+s_{2i+2}$.

**Entrada:** $k$. **Salida:** §raiz=<s[0]> checksum=<suma de todos s_i módulo 1000003>§.

Paraleliza la recursión con §task§ y §taskwait§, y usa un **umbral de profundidad** para no crear tareas diminutas.`,
    starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>

static std::vector<long> v, s;
static long n;

static void post(long i, int depth) {
    if (i >= n) return;
    // TODO: convierte las dos llamadas recursivas en tareas (con umbral de profundidad)
    post(2 * i + 1, depth + 1);
    post(2 * i + 2, depth + 1);
    long l = (2 * i + 1 < n) ? s[2 * i + 1] : 0;
    long r = (2 * i + 2 < n) ? s[2 * i + 2] : 0;
    s[i] = v[i] + l + r;
}

int main() {
    int k;
    scanf("%d", &k);
    n = (1L << k) - 1;
    v.resize(n);
    s.resize(n);
    for (long i = 0; i < n; i++) v[i] = (i * i) % 10;

    // TODO: región paralela con un solo hilo que lance la recursión
    post(0, 0);

    long check = 0;
    for (long i = 0; i < n; i++) check = (check + s[i]) % 1000003;
    printf("raiz=%ld checksum=%ld\n", s[0], check);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <vector>
#include <omp.h>

static std::vector<long> v, s;
static long n;

static void post(long i, int depth) {
    if (i >= n) return;
    #pragma omp task if(depth < 12)
    post(2 * i + 1, depth + 1);
    #pragma omp task if(depth < 12)
    post(2 * i + 2, depth + 1);
    #pragma omp taskwait
    long l = (2 * i + 1 < n) ? s[2 * i + 1] : 0;
    long r = (2 * i + 2 < n) ? s[2 * i + 2] : 0;
    s[i] = v[i] + l + r;
}

int main() {
    int k;
    scanf("%d", &k);
    n = (1L << k) - 1;
    v.resize(n);
    s.resize(n);
    for (long i = 0; i < n; i++) v[i] = (i * i) % 10;

    #pragma omp parallel num_threads(4)
    #pragma omp single
    post(0, 0);

    long check = 0;
    for (long i = 0; i < n; i++) check = (check + s[i]) % 1000003;
    printf("raiz=%ld checksum=%ld\n", s[0], check);
    return 0;
}
`,
    hints: [
      "§parallel§ + §single§ en el main; las tareas se crean dentro de §post§.",
      "Los hijos deben estar **terminados** antes de calcular §s[i]§: necesitas §taskwait§.",
      "Con §task if(depth < 12)§ las tareas profundas se ejecutan de inmediato (sin overhead de cola).",
    ],
    editorial: md`
## Idea
Es un *divide y vencerás* con dependencia hijos → padre: los dos subárboles son independientes (tareas) y el padre espera con §taskwait§ (**sólo hijos directos**, que es justo lo que necesita).

## Complejidad
- $T_1=\Theta(n)$ (un trabajo constante por nodo).
- $T_\infty=\Theta(\log n)$ = altura del árbol.
- Paralelismo $T_1/T_\infty=\Theta(n/\log n)$ — mucho más que cualquier $p$ real.
- $T_p=\Theta(n/p+\log n)$ + overhead de tareas, que el **umbral** limita a $\approx 2^{12}$ tareas.`,
    tests: {
      static: [PAR, { re: "omp\\s+single|omp\\s+master", want: true, msg: "Lanza la recursión desde un solo hilo (§single§)." }, { re: "omp\\s+task\\b", want: true, msg: "Usa §#pragma omp task§." }, { re: "taskwait|taskgroup", want: true, msg: "Espera a los hijos con §taskwait§." }],
      runs: [
        { stdin: "5\n", threads: 4, expect: [X("postorden", 0)] },
        { stdin: "20\n", threads: 4, expect: [X("postorden", 1)], label: "1 048 575 nodos" },
      ],
    },
  },
  {
    slug: "sistema-dag",
    title: "Sistema con DAG: tareas y dependencias",
    topic: "tareas",
    diff: "medio",
    source: "PD04 2025-II · Ej. 3",
    statement: md`
Se tiene el algoritmo
§§§
ini(A, B);
a  = tarea_1(A);
b  = tarea_2(B);
s1 = suma_prefijos1(B, a);
s2 = suma_prefijos2(B, a, b);
z  = s1 + s2;
§§§
Implementa con tareas y cláusulas §depend§ de modo que se ejecuten en paralelo todas las que no tengan dependencia.

**Salida:** §z=<valor>§ (usa las funciones dadas, todas con aritmética entera).`,
    starter: code`
#include <cstdio>
#include <omp.h>

static const int n = 400;
static long A[n][n], B[n][n];

static void ini() {
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) { A[i][j] = (i + j) % 5; B[i][j] = (i * j) % 7; }
}
static long tarea_1() { long s = 0; for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) s += A[i][j]; return s; }
static long tarea_2() { long s = 0; for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) s += B[i][j]; return s; }
static long suma_prefijos1(long a) {
    long s = a;
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) s += B[i][j] * ((j + 1) % 3);
    return s;
}
static long suma_prefijos2(long a, long b) {
    long s = a * b % 1000003;
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) s += B[i][j] * ((i + 1) % 4);
    return s;
}

int main() {
    long a = 0, b = 0, s1 = 0, s2 = 0, z = 0;

    // TODO: tareas con depend (parallel + single)
    ini();
    a = tarea_1();
    b = tarea_2();
    s1 = suma_prefijos1(a);
    s2 = suma_prefijos2(a, b);
    z = s1 + s2;

    printf("z=%ld\n", z);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <omp.h>

static const int n = 400;
static long A[n][n], B[n][n];

static void ini() {
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++) { A[i][j] = (i + j) % 5; B[i][j] = (i * j) % 7; }
}
static long tarea_1() { long s = 0; for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) s += A[i][j]; return s; }
static long tarea_2() { long s = 0; for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) s += B[i][j]; return s; }
static long suma_prefijos1(long a) {
    long s = a;
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) s += B[i][j] * ((j + 1) % 3);
    return s;
}
static long suma_prefijos2(long a, long b) {
    long s = a * b % 1000003;
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) s += B[i][j] * ((i + 1) % 4);
    return s;
}

int main() {
    long a = 0, b = 0, s1 = 0, s2 = 0, z = 0;

    #pragma omp parallel num_threads(4)
    #pragma omp single
    {
        #pragma omp task depend(out: A[0][0], B[0][0])
        ini();
        #pragma omp task depend(in: A[0][0]) depend(out: a)
        a = tarea_1();
        #pragma omp task depend(in: B[0][0]) depend(out: b)
        b = tarea_2();
        #pragma omp task depend(in: B[0][0], a) depend(out: s1)
        s1 = suma_prefijos1(a);
        #pragma omp task depend(in: B[0][0], a, b) depend(out: s2)
        s2 = suma_prefijos2(a, b);
        #pragma omp task depend(in: s1, s2) depend(out: z)
        z = s1 + s2;
        #pragma omp taskwait
    }

    printf("z=%ld\n", z);
    return 0;
}
`,
    hints: [
      "Dibuja primero el DAG: §ini§ → {§tarea_1§, §tarea_2§}; §s1§ necesita §a§; §s2§ necesita §a§ y §b§; §z§ necesita §s1§ y §s2§.",
      "§ini§ escribe A y B: §depend(out: A[0][0], B[0][0])§. Las demás lo leen con §depend(in: ...)§.",
      "Termina con §taskwait§ dentro del §single§ para asegurar que §z§ está listo antes del §printf§.",
    ],
    editorial: md`
## DAG
§§§
ini ─┬─► t1 (a) ─┬─► s1 ─┐
     │           │       ├─► z
     └─► t2 (b) ─┴─► s2 ─┘
§§§
Niveles paralelos: {t1, t2}, luego {s1, s2} (s1 sólo necesita a, así que puede empezar sin esperar a t2).

## Análisis
Con costos unitarios $c(\text{ini})=n^2$, $c(t_1)=c(t_2)=n^2$, $c(s_1)=c(s_2)=n^2$, $c(z)\approx 0$:
- $T_1\approx 5n^2$ y camino crítico ini→t1→s2→z (o ini→t2→s2→z): $T_\infty\approx 4n^2$.
- $S_{max}=T_1/T_\infty = 5/4 = 1.25$.
Las tareas son de grano grueso; el paralelismo disponible es **muy bajo**: más hilos no ayudan. Para ganar más habría que paralelizar *dentro* de cada tarea.`,
    tests: {
      static: [PAR, { re: "omp\\s+task", want: true, msg: "Usa §#pragma omp task§." }, { re: "depend\\s*\\(\\s*in", want: true, msg: "Usa §depend(in: ...)§." }, { re: "depend\\s*\\(\\s*out", want: true, msg: "Usa §depend(out: ...)§." }],
      runs: [{ threads: 4, expect: [X("sistema-dag", 0)] }, { threads: 2, expect: [X("sistema-dag", 1)] }],
    },
  },
  {
    slug: "hibrido-reparto",
    title: "Reparto híbrido procesos × hilos",
    topic: "hibrido",
    diff: "medio",
    source: "U4.5 · MPI+OpenMP (simulado)",
    statement: md`
Simulamos un programa híbrido sin MPI: $P$ "procesos" (un bucle sobre §rank§) se reparten un dominio de $N$ elementos en bloques contiguos y, dentro de cada proceso, $T$ hilos OpenMP calculan la suma local de $g(i)=(5i+3)\bmod 17$.

- Bloque del proceso $r$: $[\lfloor Nr/P\rfloor,\ \lfloor N(r+1)/P\rfloor)$.
- Dentro de cada proceso usa §parallel for§ con exactamente $T$ hilos (§num_threads(T)§) y §reduction§.

**Entrada:** §N P T§.
**Salida:** una línea por proceso §rank <r>: [<lo>,<hi>) suma=<s>§ y al final §total=<suma de todas>§ (equivale al §MPI_Reduce§).`,
    starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    long N;
    int P, T;
    scanf("%ld %d %d", &N, &P, &T);
    long total = 0;
    for (int rank = 0; rank < P; rank++) {
        long lo = N * rank / P, hi = N * (rank + 1) / P;
        long local = 0;
        // TODO: parallel for con T hilos y reduction
        for (long i = lo; i < hi; i++) local += (5 * i + 3) % 17;
        printf("rank %d: [%ld,%ld) suma=%ld\n", rank, lo, hi, local);
        total += local;
    }
    printf("total=%ld\n", total);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    long N;
    int P, T;
    scanf("%ld %d %d", &N, &P, &T);
    long total = 0;
    for (int rank = 0; rank < P; rank++) {
        long lo = N * rank / P, hi = N * (rank + 1) / P;
        long local = 0;
        #pragma omp parallel for num_threads(T) reduction(+:local)
        for (long i = lo; i < hi; i++) local += (5 * i + 3) % 17;
        printf("rank %d: [%ld,%ld) suma=%ld\n", rank, lo, hi, local);
        total += local;
    }
    printf("total=%ld\n", total);
    return 0;
}
`,
    hints: ["Cada \"proceso\" tiene su propia región paralela: §#pragma omp parallel for num_threads(T) reduction(+:local)§."],
    editorial: md`
## Modelo híbrido
1. **Nivel 1 (MPI):** partición del dominio en $P$ bloques contiguos: $N/P$ elementos por proceso.
2. **Nivel 2 (OpenMP):** dentro de cada proceso, $T$ hilos reparten su bloque: $N/(PT)$ por hilo.
3. **Combinación:** reducción local con OpenMP y global con §MPI_Reduce§: $O(\log T)+O(\log P)$.

## Complejidad
$T_p=\Theta\!\left(\dfrac{N}{PT}+\log T+\log P\cdot(\alpha+\beta)\right)$. Con $P\cdot T$ unidades de cómputo se obtiene un speedup casi lineal si $N\gg PT\log(PT)$. El nivel de hilos de MPI requerido: §MPI_THREAD_FUNNELED§ (sólo el maestro llama a MPI).`,
    tests: {
      static: [PAR, { re: "num_threads\\s*\\(\\s*T\\s*\\)|omp_set_num_threads", want: true, msg: "Usa exactamente $T$ hilos con §num_threads(T)§." }, { re: "reduction", want: true, msg: "Acumula la suma local con §reduction§." }],
      runs: [
        { stdin: "20 3 2\n", threads: 2, expect: [X("hibrido-reparto", 0)] },
        { stdin: "5000000 4 4\n", threads: 4, expect: [X("hibrido-reparto", 1)] },
        { stdin: "1000003 5 3\n", threads: 3, expect: [X("hibrido-reparto", 2)] },
      ],
    },
  },
  {
    slug: "knn",
    title: "KNN: ¿qué bucle paralelizar?",
    topic: "worksharing",
    diff: "medio",
    source: "PD04 2026-I · Ej. 1",
    statement: md`
Clasificador 1-vecino-más-cercano. Puntos de entrenamiento $i<N_{tr}$: coordenadas $c_{ij}=(37i+11j+\lfloor i/7\rfloor)\bmod 101$, etiqueta $i\bmod 3$. Puntos de prueba $t<N_{te}$: coordenadas $(53t+7j+5)\bmod 101$, etiqueta real $t\bmod 3$.

Para cada punto de prueba busca el entrenamiento con menor distancia euclídea al cuadrado (**en empate gana el menor índice**) y predice su etiqueta.

**Entrada:** §Ntr Nte D§. **Salida:** §aciertos=<n> suma_idx=<suma de los índices elegidos>§.

Decide qué bucle paralelizar (prueba y fundamenta). Pista de diseño: el bucle de prueba evita una reducción posterior.`,
    starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int Ntr, Nte, D;
    scanf("%d %d %d", &Ntr, &Nte, &D);
    long aciertos = 0, suma_idx = 0;

    // TODO: paraleliza el bucle más conveniente (¿pruebas o entrenamiento?)
    for (int t = 0; t < Nte; t++) {
        long mejor = -1;
        int idx = -1;
        for (int i = 0; i < Ntr; i++) {
            long d2 = 0;
            for (int j = 0; j < D; j++) {
                long a = (37L * i + 11 * j + i / 7) % 101;
                long b = (53L * t + 7 * j + 5) % 101;
                d2 += (a - b) * (a - b);
            }
            if (mejor < 0 || d2 < mejor) { mejor = d2; idx = i; }
        }
        if (idx % 3 == t % 3) aciertos++;
        suma_idx += idx;
    }
    printf("aciertos=%ld suma_idx=%ld\n", aciertos, suma_idx);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int Ntr, Nte, D;
    scanf("%d %d %d", &Ntr, &Nte, &D);
    long aciertos = 0, suma_idx = 0;

    #pragma omp parallel for reduction(+:aciertos, suma_idx) schedule(static)
    for (int t = 0; t < Nte; t++) {
        long mejor = -1;
        int idx = -1;
        for (int i = 0; i < Ntr; i++) {
            long d2 = 0;
            for (int j = 0; j < D; j++) {
                long a = (37L * i + 11 * j + i / 7) % 101;
                long b = (53L * t + 7 * j + 5) % 101;
                d2 += (a - b) * (a - b);
            }
            if (mejor < 0 || d2 < mejor) { mejor = d2; idx = i; }
        }
        if (idx % 3 == t % 3) aciertos++;
        suma_idx += idx;
    }
    printf("aciertos=%ld suma_idx=%ld\n", aciertos, suma_idx);
    return 0;
}
`,
    hints: [
      "Cada punto de prueba es independiente: repartirlos evita tener que combinar mínimos parciales entre hilos.",
      "Las variables §mejor§ e §idx§ se declaran dentro del bucle (privadas). §aciertos§ y §suma_idx§ necesitan §reduction(+:...)§.",
    ],
    editorial: md`
## Estrategia
- **Paralelizar pruebas (elegido):** $N_{te}$ tareas independientes de costo $N_{tr}D$ cada una; sin sincronización dentro. Granularidad gruesa → alta eficiencia mientras $N_{te}\gg p$.
- Paralelizar entrenamiento: cada hilo obtiene un mínimo parcial y hay que **reducir** por (distancia, índice): sobrecosto en cada punto de prueba.

## Complejidad
$T_s=\Theta(N_{te}N_{tr}D)$; $T_p=\Theta(N_{te}N_{tr}D/p)$.

**Escalabilidad débil:** si dobla $N_{te}$ y $p$, $T_p$ se mantiene constante (la carga por hilo es la misma); si dobla $N_{tr}$ y $p$, también, pero con $N_{te}$ pequeño el reparto se desbalancea.`,
    tests: {
      static: [PAR, { re: "omp\\s+parallel\\s+for|omp\\s+for", want: true, msg: "Usa §parallel for§." }, { re: "reduction", want: true, msg: "Combina contadores con §reduction§." }],
      runs: [
        { stdin: "200 20 4\n", threads: 4, expect: [X("knn", 0)] },
        { stdin: "6000 3000 8\n", threads: 4, expect: [X("knn", 1)] },
      ],
    },
  },
];
