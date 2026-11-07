import { md, code } from "@/lib/md";
import type { Lesson } from "@/lib/types";

export const lessons3: Lesson[] = [
  {
    id: "quicksort-tareas",
    title: "Quicksort con tareas y cutoff",
    unit: "U4.3 · PD04 2025-I",
    minutes: 16,
    summary: "El caso completo del curso: task + taskwait + cutoff y por qué el overhead importa.",
    slideDeck: "u4-3",
    topic: "tareas",
    intro: md`
## Caso completo (PD04 2025-I)

Quicksort divide el arreglo en dos mitades **independientes** alrededor del pivote: ideal para tareas.

§§§cpp
if (left < j) {
    #pragma omp task shared(a) firstprivate(left, j) if (j - left + 1 > kCutoff)
    qs(a, left, j);
}
if (i < right) {
    #pragma omp task shared(a) firstprivate(i, right) if (right - i + 1 > kCutoff)
    qs(a, i, right);
}
#pragma omp taskwait
§§§

- Cada mitad se ordena en una tarea. §a§ es §shared§, los límites §firstprivate§.
- **Cutoff** con §if(...)§: si el segmento es pequeño, la tarea se ejecuta inmediatamente sin encolarse. Sin esto, millones de tareas diminutas cuestan más que ordenar.
- En §main§: §parallel§ + §single§ + la primera llamada.
- Con 1 hilo la versión con tareas es **más lenta** que la secuencial (overhead de crear tareas); la primera partición de todo el arreglo es secuencial, lo que limita el speedup (Amdahl).

## Complejidad

Secuencial: $T_s = O(n \log n)$. PRAM (n = p): $T_p = O(\log^2 p)$. Con $n/p$ elementos por proceso: $T_p(n,p) = O\!\left(\frac{n\log n}{p} + \log p\,(\alpha + \tfrac{n}{p}\beta) + \alpha\log^2 p\right)$.

Eficiencia: $E_{QS} = O\!\left(\dfrac{1}{1 + \frac{p\log p}{n\log n} + \frac{\log p}{\log n} + \frac{p\log^2 p}{n\log n}}\right)$.
`,
    checkpoints: [
      {
        id: "qsort",
        title: "Paraleliza qs() con tareas",
        task: md`Paraleliza §qs()§ creando **una tarea por mitad** (con §shared(a)§ y §firstprivate§ de los límites), un **cutoff** §if(...)§ de 2048 elementos y un §taskwait§ al final. En §main§ falta la región §parallel§ + §single§. Debe imprimir §ordenado=1§.`,
        starter: code`
#include <cstdio>
#include <utility>
#include <vector>
#include <omp.h>
using namespace std;

const int kCutoff = 2048;

void qs(vector<int>& a, int left, int right) {
    int i = left, j = right;
    int pivot = a[(left + right) / 2];
    while (i <= j) {
        while (a[i] < pivot) i++;
        while (a[j] > pivot) j--;
        if (i <= j) { swap(a[i], a[j]); i++; j--; }
    }
    // TODO: una tarea por mitad (shared(a), firstprivate de los límites, if(...)) y taskwait
    if (left < j) qs(a, left, j);
    if (i < right) qs(a, i, right);
}

int main() {
    const int N = 300000;
    vector<int> a(N);
    unsigned x = 12345;
    for (int i = 0; i < N; i++) { x = x * 1103515245u + 12345u; a[i] = (x >> 16) % 1000; }

    // TODO: región paralela + single para la primera llamada
    qs(a, 0, N - 1);

    bool ok = true;
    for (int i = 1; i < N; i++) if (a[i - 1] > a[i]) ok = false;
    printf("ordenado=%d\n", ok ? 1 : 0);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <utility>
#include <vector>
#include <omp.h>
using namespace std;

const int kCutoff = 2048;

void qs(vector<int>& a, int left, int right) {
    int i = left, j = right;
    int pivot = a[(left + right) / 2];
    while (i <= j) {
        while (a[i] < pivot) i++;
        while (a[j] > pivot) j--;
        if (i <= j) { swap(a[i], a[j]); i++; j--; }
    }
    if (left < j) {
        #pragma omp task shared(a) firstprivate(left, j) if (j - left + 1 > kCutoff)
        qs(a, left, j);
    }
    if (i < right) {
        #pragma omp task shared(a) firstprivate(i, right) if (right - i + 1 > kCutoff)
        qs(a, i, right);
    }
    #pragma omp taskwait
}

int main() {
    const int N = 300000;
    vector<int> a(N);
    unsigned x = 12345;
    for (int i = 0; i < N; i++) { x = x * 1103515245u + 12345u; a[i] = (x >> 16) % 1000; }

    #pragma omp parallel num_threads(4)
    #pragma omp single
    qs(a, 0, N - 1);

    bool ok = true;
    for (int i = 1; i < N; i++) if (a[i - 1] > a[i]) ok = false;
    printf("ordenado=%d\n", ok ? 1 : 0);
    return 0;
}
`,
        hints: [
          "Las dos llamadas recursivas son independientes: cada una puede ser una tarea.",
          "Cutoff: §if (j - left + 1 > kCutoff)§ para la izquierda y §if (right - i + 1 > kCutoff)§ para la derecha.",
        ],
        tests: {
          static: [
            { re: "omp\\s+task\\b[^\\n]*if\\s*\\(", want: true, msg: "Las tareas necesitan el cutoff §if(...)§." },
            { re: "omp\\s+taskwait", want: true, msg: "Falta §taskwait§." },
            { re: "omp\\s+single", want: true, msg: "Falta §single§ en §main§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "ordenado=1" }] }],
        },
      },
    ],
  },

  {
    id: "metricas",
    title: "Speedup, eficiencia, Amdahl y Gustafson",
    unit: "Fundamentos · U2.1",
    minutes: 10,
    summary: "Las fórmulas que siempre caen en el examen, calculadas en código.",
    slideDeck: "u4-5",
    topic: "fundamentos",
    intro: md`
## Métricas

Con $T_s$ el tiempo secuencial y $T_p$ el tiempo con $p$ hilos o procesos:

$$S(p) = \frac{T_s}{T_p} \qquad E(p) = \frac{S(p)}{p}$$

## Amdahl (escalado fuerte, tamaño fijo)

Si una fracción $f_s$ es secuencial y $f_p = 1 - f_s$ paralelizable:

$$S(p) = \frac{1}{f_s + f_p/p} \le \frac{1}{f_s}$$

## Gustafson (escalado débil, el problema crece con p)

$$S(p) = f_s + f_p\,p = p - f_s(p-1)$$

Ejemplo del repaso: con 1000 procesos y un programa 50 % paralelizable, Amdahl da $S\approx 2$ y $E\approx 0.002$; Gustafson da $S\approx 500$ y $E\approx 0.5$.

## Energía (parcial 2026-I)

$E_{kWh} = p \cdot P_{nodo} \cdot T_p$ (con $T_p$ en horas). Como $T_p = T_s/(pE)$, se cumple $E_{kWh} = P_{nodo} T_s / E$: **más ineficiencia, más energía**.

> Regla práctica: paralelizar agrega costos extra (overhead): crear hilos, sincronizar. Solo conviene si el trabajo útil es mucho mayor.
`,
    checkpoints: [
      {
        id: "speedup",
        title: "Speedup y eficiencia",
        task: md`Con $T_s = 8.0$ s y $T_p = 2.5$ s usando $p = 4$ hilos, calcula $S$ y $E$ e imprímelos con 2 decimales en el formato §S=3.20 E=0.80§.`,
        starter: code`
#include <cstdio>

int main() {
    double Ts = 8.0, Tp = 2.5;
    int p = 4;
    double S = 0, E = 0;   // TODO
    printf("S=%.2f E=%.2f\n", S, E);
    return 0;
}
`,
        solution: code`
#include <cstdio>

int main() {
    double Ts = 8.0, Tp = 2.5;
    int p = 4;
    double S = Ts / Tp;
    double E = S / p;
    printf("S=%.2f E=%.2f\n", S, E);
    return 0;
}
`,
        hints: ["S = Ts / Tp; E = S / p."],
        tests: { runs: [{ expect: [{ kind: "exact", value: "S=3.20 E=0.80" }] }] },
      },
      {
        id: "amdahl",
        title: "Amdahl vs Gustafson",
        task: md`Un programa con **95 %** paralelizable. Para $p = 10$ y $p = 100$ imprime el speedup de Amdahl y su eficiencia (§amdahl p=10 S=6.90 E=0.69§), y el speedup de Gustafson (§gustafson p=10 S=9.55§). Ya están los §printf§; implementa las funciones.`,
        starter: code`
#include <cstdio>

double amdahl(double fp, int p)    { return 0; /* TODO */ }
double gustafson(double fp, int p) { return 0; /* TODO */ }

int main() {
    double fp = 0.95;
    int ps[2] = {10, 100};
    for (int k = 0; k < 2; k++) {
        int p = ps[k];
        double S = amdahl(fp, p);
        printf("amdahl p=%d S=%.2f E=%.2f\n", p, S, S / p);
        printf("gustafson p=%d S=%.2f\n", p, gustafson(fp, p));
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>

double amdahl(double fp, int p)    { return 1.0 / ((1.0 - fp) + fp / p); }
double gustafson(double fp, int p) { return (1.0 - fp) + fp * p; }

int main() {
    double fp = 0.95;
    int ps[2] = {10, 100};
    for (int k = 0; k < 2; k++) {
        int p = ps[k];
        double S = amdahl(fp, p);
        printf("amdahl p=%d S=%.2f E=%.2f\n", p, S, S / p);
        printf("gustafson p=%d S=%.2f\n", p, gustafson(fp, p));
    }
    return 0;
}
`,
        hints: ["Amdahl: 1 / (fs + fp/p). Gustafson: fs + fp·p, con fs = 1 - fp."],
        tests: {
          runs: [{ expect: [{ kind: "exact", value: "amdahl p=10 S=6.90 E=0.69\ngustafson p=10 S=9.55\namdahl p=100 S=16.81 E=0.17\ngustafson p=100 S=95.05" }] }],
        },
      },
    ],
  },

  {
    id: "hibrido",
    title: "Programación híbrida MPI + OpenMP",
    unit: "U4.5",
    minutes: 10,
    summary: "MPI entre nodos, OpenMP dentro: combinaciones, niveles de soporte de hilos y halos.",
    slideDeck: "u4-5",
    topic: "hibrido",
    intro: md`
## La idea

Un cluster tiene **nodos** (máquinas conectadas por red) y cada nodo tiene muchos **núcleos** con memoria compartida. Lo híbrido: **MPI entre nodos, OpenMP dentro de cada nodo**.

**Ventajas:** más escalabilidad (menos procesos MPI, menos mensajes), mejor balance (§schedule(dynamic)§ dentro del nodo) y mejor uso de memoria (menos datos duplicados). **Desventajas:** código más complejo, efectos NUMA, y durante la comunicación MPI el resto de hilos espera sin hacer nada.

Con un nodo de 8 núcleos: 1 proceso × 8 hilos, 2 × 4 o 4 × 2. Siempre $\text{procesos} \times \text{hilos} \approx \text{núcleos}$.

## Niveles de soporte de hilos

| Nivel | Quién llama a MPI |
|---|---|
| §MPI_THREAD_SINGLE§ | solo hay un hilo |
| §MPI_THREAD_FUNNELED§ | varios hilos, **solo el maestro** llama a MPI |
| §MPI_THREAD_SERIALIZED§ | cualquier hilo, de a uno |
| §MPI_THREAD_MULTIPLE§ | cualquier hilo, a la vez |

§§§cpp
MPI_Init_thread(&argc, &argv, MPI_THREAD_FUNNELED, &provisto);
#pragma omp parallel for reduction(+:local)
for (int i = 0; i < n_local; i++) local += trabajo(i);   // OpenMP en el nodo
MPI_Reduce(&local, &total, 1, MPI_DOUBLE, MPI_SUM, 0, MPI_COMM_WORLD); // MPI entre nodos
§§§

## Halos

Al dividir una malla entre procesos, cada uno guarda copias de las celdas de borde de sus vecinos (**halo**). En 3D con 1 celda de halo por lado, un subdominio $n^3$ se guarda como $(n+2)^3$. Cuanto más chico el subdominio, mayor la proporción de halo. Los hilos OpenMP dentro de un proceso comparten el subdominio y **no** necesitan halos entre ellos.
`,
    checkpoints: [
      {
        id: "combinaciones",
        title: "Combinaciones procesos × hilos",
        task: md`Para un nodo de **8 núcleos**, imprime todas las combinaciones §p x t§ con $p \cdot t = 8$, en orden creciente de $p$: §1x8§, §2x4§, §4x2§, §8x1§ (una por línea).`,
        starter: code`
#include <cstdio>

int main() {
    const int nucleos = 8;
    // TODO: recorre p = 1..nucleos y muestra los que dividen a nucleos
    return 0;
}
`,
        solution: code`
#include <cstdio>

int main() {
    const int nucleos = 8;
    for (int p = 1; p <= nucleos; p++)
        if (nucleos % p == 0)
            printf("%dx%d\n", p, nucleos / p);
    return 0;
}
`,
        hints: ["Si §nucleos % p == 0§, entonces §t = nucleos / p§."],
        tests: { runs: [{ expect: [{ kind: "exact", value: "1x8\n2x4\n4x2\n8x1" }] }] },
      },
      {
        id: "halo",
        title: "Proporción de halo en 3D",
        task: md`Para subdominios cúbicos de lado $n = 10, 20, 40$ con 1 celda de halo por lado, calcula las celdas de halo $(n+2)^3 - n^3$ y su porcentaje sobre $(n+2)^3$. Formato: §n=10 halo=728 42.1%§.`,
        starter: code`
#include <cstdio>

int main() {
    int ns[3] = {10, 20, 40};
    for (int k = 0; k < 3; k++) {
        long n = ns[k];
        long halo = 0;      // TODO
        double pct = 0;     // TODO
        printf("n=%ld halo=%ld %.1f%%\n", n, halo, pct);
    }
    return 0;
}
`,
        solution: code`
#include <cstdio>

int main() {
    int ns[3] = {10, 20, 40};
    for (int k = 0; k < 3; k++) {
        long n = ns[k];
        long total = (n + 2) * (n + 2) * (n + 2);
        long halo = total - n * n * n;
        double pct = 100.0 * halo / total;
        printf("n=%ld halo=%ld %.1f%%\n", n, halo, pct);
    }
    return 0;
}
`,
        hints: ["total = (n+2)^3; halo = total - n^3; pct = 100·halo/total."],
        tests: { runs: [{ expect: [{ kind: "exact", value: "n=10 halo=728 42.1%\nn=20 halo=2648 24.9%\nn=40 halo=10088 13.6%" }] }] },
      },
    ],
  },

  {
    id: "montecarlo",
    title: "Monte Carlo: vergonzosamente paralelo",
    unit: "PD04",
    minutes: 16,
    summary: "π y el triángulo roto con rand_r por hilo y contadores con reduction.",
    slideDeck: "u5-1",
    topic: "fundamentos",
    intro: md`
## Vergonzosamente paralelo

Cuando las iteraciones no se comunican entre sí, el paralelismo es "gratis". Monte Carlo es el ejemplo típico: cada muestra es independiente.

## El problema de rand()

§rand()§ usa un **estado global compartido**: todos los hilos se pelean por él (lento, y con riesgo de carrera). Solución: **semilla privada por hilo** con §rand_r(&seed)§, donde §seed§ se declara dentro de la región (cada hilo la suya, con valor distinto), y **reduction** para los contadores. Los resultados no coinciden bit a bit con el secuencial (otros números aleatorios), pero sí estadísticamente.

§§§cpp
#pragma omp parallel reduction(+:dentro)
{
    unsigned seed = 1234 + omp_get_thread_num();   // privada
    #pragma omp for
    for (long i = 0; i < N; i++) {
        double x = rand_r(&seed) / (double)RAND_MAX;
        ...
    }
}
§§§

## Broken triangle (PD04 2025-II)

Dos puntos aleatorios en $[0,1]$ dividen el intervalo en tres segmentos. Forman un triángulo si $\max(s_1,s_2,s_3) < 0.5$ (probabilidad **1/4**). Es obtuso si $2 s_{max}^2 > s_1^2+s_2^2+s_3^2$ (condicionado a que sea triángulo, ≈ **0.682**; el acutángulo es ≈ 0.318).

**Overhead:** crear la región paralela, la reducción final ($O(\log p)$) y el costo de generar los aleatorios. Con §atomic§ en cada acierto, 4 hilos pueden ir **más lento que el secuencial**; con §reduction§, $S\approx 3.1$.
`,
    checkpoints: [
      {
        id: "pi-mc",
        title: "π por Monte Carlo",
        task: md`Lanza **4 000 000** puntos en el cuadrado unidad y cuenta los que caen dentro del círculo ($x^2+y^2<1$): $\pi \approx 4\cdot dentro/N$. Usa **semilla privada por hilo** con §rand_r§ y §reduction(+:dentro)§. Imprime §pi~=3.14..§.`,
        starter: code`
#include <cstdio>
#include <cstdlib>
#include <omp.h>

int main() {
    const long N = 4000000;
    long dentro = 0;
    // TODO: región paralela con semilla privada (rand_r) y reduction
    for (long i = 0; i < N; i++) {
        double x = rand() / (double)RAND_MAX;
        double y = rand() / (double)RAND_MAX;
        if (x * x + y * y < 1.0) dentro++;
    }
    printf("pi~=%.4f\n", 4.0 * dentro / N);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <cstdlib>
#include <omp.h>

int main() {
    const long N = 4000000;
    long dentro = 0;
    #pragma omp parallel num_threads(4) reduction(+:dentro)
    {
        unsigned seed = 1234 + omp_get_thread_num();
        #pragma omp for
        for (long i = 0; i < N; i++) {
            double x = rand_r(&seed) / (double)RAND_MAX;
            double y = rand_r(&seed) / (double)RAND_MAX;
            if (x * x + y * y < 1.0) dentro++;
        }
    }
    printf("pi~=%.4f\n", 4.0 * dentro / N);
    return 0;
}
`,
        hints: ["Declara §unsigned seed§ **dentro** de la región paralela, con un valor distinto por hilo.", "Separa §parallel§ (con la semilla) y §for§ para que la semilla se cree una vez por hilo."],
        tests: {
          static: [
            { re: "rand_r", want: true, msg: "Usa §rand_r(&seed)§ con semilla privada." },
            { re: "reduction\\s*\\(\\s*\\+\\s*:\\s*dentro", want: true, msg: "Usa §reduction(+:dentro)§." },
          ],
          runs: [{ expect: [{ kind: "num", re: "pi~=([0-9.]+)", value: 3.14159, tol: 0.01 }] }],
        },
      },
      {
        id: "triangulo",
        title: "El triángulo roto",
        task: md`Genera dos puntos aleatorios $u,v\in[0,1]$; los segmentos son §min(u,v)§, §|u−v|§ y §1−max(u,v)§. Cuenta cuántas veces forman triángulo (§smax < 0.5§) y, de ésas, cuántas son obtusas (§2·smax² > s1²+s2²+s3²§). Con **4 000 000** pruebas, §rand_r§ privado y §reduction(+:tri,obt)§ imprime §P(triangulo)=0.25..§ y §P(obtuso|triangulo)=0.68..§.`,
        starter: code`
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <omp.h>

int main() {
    const long N = 4000000;
    long tri = 0, obt = 0;
    // TODO: paraleliza con semilla privada y reduction(+:tri,obt)
    unsigned seed = 99;
    for (long i = 0; i < N; i++) {
        double u = rand_r(&seed) / (double)RAND_MAX;
        double v = rand_r(&seed) / (double)RAND_MAX;
        double s1 = std::min(u, v), s2 = std::fabs(u - v), s3 = 1.0 - std::max(u, v);
        double smax = std::max(s1, std::max(s2, s3));
        if (smax < 0.5) {
            tri++;
            if (2.0 * smax * smax > s1 * s1 + s2 * s2 + s3 * s3) obt++;
        }
    }
    printf("P(triangulo)=%.4f\n", (double)tri / N);
    printf("P(obtuso|triangulo)=%.4f\n", (double)obt / tri);
    return 0;
}
`,
        solution: code`
#include <algorithm>
#include <cmath>
#include <cstdio>
#include <cstdlib>
#include <omp.h>

int main() {
    const long N = 4000000;
    long tri = 0, obt = 0;
    #pragma omp parallel num_threads(4) reduction(+:tri,obt)
    {
        unsigned seed = 99 + 7919 * omp_get_thread_num();
        #pragma omp for
        for (long i = 0; i < N; i++) {
            double u = rand_r(&seed) / (double)RAND_MAX;
            double v = rand_r(&seed) / (double)RAND_MAX;
            double s1 = std::min(u, v), s2 = std::fabs(u - v), s3 = 1.0 - std::max(u, v);
            double smax = std::max(s1, std::max(s2, s3));
            if (smax < 0.5) {
                tri++;
                if (2.0 * smax * smax > s1 * s1 + s2 * s2 + s3 * s3) obt++;
            }
        }
    }
    printf("P(triangulo)=%.4f\n", (double)tri / N);
    printf("P(obtuso|triangulo)=%.4f\n", (double)obt / tri);
    return 0;
}
`,
        hints: ["La semilla debe ser distinta por hilo: §seed = 99 + 7919*omp_get_thread_num()§.", "§reduction(+:tri,obt)§ acepta varias variables."],
        tests: {
          static: [{ re: "reduction\\s*\\(\\s*\\+\\s*:\\s*tri\\s*,\\s*obt", want: true, msg: "Usa §reduction(+:tri,obt)§." }],
          runs: [
            {
              expect: [
                { kind: "num", re: "P\\(triangulo\\)=([0-9.]+)", value: 0.25, tol: 0.01 },
                { kind: "num", re: "P\\(obtuso\\|triangulo\\)=([0-9.]+)", value: 0.6822, tol: 0.015 },
              ],
            },
          ],
        },
      },
    ],
  },

  {
    id: "edp-calor",
    title: "EDP: difusión de calor y Jacobi",
    unit: "U5.1 · PD05",
    minutes: 18,
    summary: "Paraleliza el espacio, nunca el tiempo. Esquema explícito, halos y reducción de error.",
    slideDeck: "u5-1",
    topic: "edp",
    intro: md`
## Diferencias finitas

$$\frac{\partial^2 u}{\partial x^2} \approx \frac{u_{i+1}-2u_i+u_{i-1}}{\Delta x^2}$$

**Ecuación parabólica (difusión):** el esquema explícito actualiza cada punto con sus vecinos del paso anterior:

$$T_i^{n+1} = T_i^n + r\,(T_{i-1}^n - 2T_i^n + T_{i+1}^n) + \Delta t\,Q(x_i,t), \qquad r = \frac{\kappa\,\Delta t}{\Delta x^2}$$

Estable si $r \le 0.5$ (PD05 usa $r = 0.4$).

> **La descomposición de dominio se aplica al espacio; el tiempo es secuencial** y no se puede paralelizar: el paso $n+1$ necesita el $n$ completo.

En OpenMP: el bucle **temporal** va fuera, el bucle **espacial** lleva §parallel for§ (cada punto de §Tnew§ solo lee §T§, no hay carrera), y al final §swap§. En MPI cada proceso necesita 1 valor de cada vecino por paso (halo).

## Jacobi (Laplace)

§u_new[i] = 0.5·(u_old[i-1] + u_old[i+1])§ repetido hasta que el error máximo $\max_i |u_{new}-u_{old}| \le \epsilon$. El error es una **reducción de máximo**: §reduction(max:err)§. Complejidad: $T(n) = k\,m\,N^2$ (k iteraciones, m operaciones por nodo, N nodos por dimensión en 2D).

## Optimizar el cálculo (PD05 2026-II)

La fuente $Q$ solo depende de $x$ (el tiempo solo la enciende o apaga). Evaluar $\exp()$ en cada paso para cada punto es desperdicio: **precalcúlala una vez**. Eso dio 4.1x **sin** paralelismo, y vectoriza el bucle. Lección: antes de paralelizar, ¿hay trabajo redundante que quitar?
`,
    checkpoints: [
      {
        id: "calor",
        title: "Paraleliza el espacio, no el tiempo",
        task: md`Barra de **N = 200** puntos a 20 °C con extremos fijos en 20. Durante los primeros 50 pasos hay una fuente gaussiana en el centro (ya precalculada en §f[i]§). El bucle temporal es secuencial: paraleliza **solo el bucle espacial** con §parallel for§ y haz §swap§ al final de cada paso. Imprime la temperatura máxima y la suma (§max=..§, §suma=..§).`,
        starter: code`
#include <cmath>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int N = 200, M = 300, PASOS_FUENTE = 50;
    const double r = 0.4, T0 = 20.0;
    vector<double> T(N, T0), Tn(N, T0), f(N);
    for (int i = 0; i < N; i++) {
        double x = i / (N - 1.0);
        f[i] = 0.5 * exp(-(x - 0.5) * (x - 0.5) / (2 * 0.05 * 0.05));
    }
    for (int n = 0; n < M; n++) {
        // TODO: paraleliza este bucle espacial
        for (int i = 1; i < N - 1; i++) {
            Tn[i] = T[i] + r * (T[i - 1] - 2 * T[i] + T[i + 1]) + (n < PASOS_FUENTE ? f[i] : 0.0);
        }
        Tn[0] = T0; Tn[N - 1] = T0;
        T.swap(Tn);
    }
    double mx = T0, suma = 0;
    for (int i = 0; i < N; i++) { mx = fmax(mx, T[i]); suma += T[i]; }
    printf("max=%.4f\n", mx);
    printf("suma=%.3f\n", suma);
    return 0;
}
`,
        solution: code`
#include <cmath>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int N = 200, M = 300, PASOS_FUENTE = 50;
    const double r = 0.4, T0 = 20.0;
    vector<double> T(N, T0), Tn(N, T0), f(N);
    for (int i = 0; i < N; i++) {
        double x = i / (N - 1.0);
        f[i] = 0.5 * exp(-(x - 0.5) * (x - 0.5) / (2 * 0.05 * 0.05));
    }
    for (int n = 0; n < M; n++) {
        #pragma omp parallel for num_threads(4)
        for (int i = 1; i < N - 1; i++) {
            Tn[i] = T[i] + r * (T[i - 1] - 2 * T[i] + T[i + 1]) + (n < PASOS_FUENTE ? f[i] : 0.0);
        }
        Tn[0] = T0; Tn[N - 1] = T0;
        T.swap(Tn);
    }
    double mx = T0, suma = 0;
    for (int i = 0; i < N; i++) { mx = fmax(mx, T[i]); suma += T[i]; }
    printf("max=%.4f\n", mx);
    printf("suma=%.3f\n", suma);
    return 0;
}
`,
        hints: ["§#pragma omp parallel for§ va dentro del bucle temporal, encima del bucle de §i§.", "No pongas §parallel for§ en el bucle de §n§: cada paso depende del anterior."],
        tests: {
          static: [{ re: "omp\\s+parallel\\s+for", want: true, msg: "Usa §#pragma omp parallel for§ en el bucle espacial." }],
          runs: [{ expect: [{ kind: "num", re: "max=([0-9.]+)", value: 33.9321, tol: 0.001 }, { kind: "num", re: "suma=([0-9.]+)", value: 4623.524, tol: 0.01 }] }],
        },
      },
      {
        id: "jacobi",
        title: "Jacobi con reduction(max:err)",
        task: md`Resuelve Laplace 1D con **N = 32** puntos, $u_0 = 0$, $u_{N-1} = 100$ por Jacobi hasta que el error máximo sea menor que $10^{-8}$. Paraleliza el bucle interior con §parallel for§ y calcula el error con §reduction(max:err)§. La solución exacta es lineal: §u[16]≈51.61§.`,
        starter: code`
#include <cmath>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int N = 32;
    vector<double> u(N, 0.0), un(N, 0.0);
    u[N - 1] = un[N - 1] = 100.0;
    double err = 1.0;
    int it = 0;
    while (err > 1e-8 && it < 200000) {
        err = 0.0;
        // TODO: paraleliza y reduce el máximo del error
        for (int i = 1; i < N - 1; i++) {
            un[i] = 0.5 * (u[i - 1] + u[i + 1]);
            err = fmax(err, fabs(un[i] - u[i]));
        }
        u.swap(un);
        it++;
    }
    printf("convergio=%d\n", err <= 1e-8 ? 1 : 0);
    printf("u[16]=%.2f\n", u[16]);
    return 0;
}
`,
        solution: code`
#include <cmath>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int N = 32;
    vector<double> u(N, 0.0), un(N, 0.0);
    u[N - 1] = un[N - 1] = 100.0;
    double err = 1.0;
    int it = 0;
    while (err > 1e-8 && it < 200000) {
        err = 0.0;
        #pragma omp parallel for num_threads(4) reduction(max:err)
        for (int i = 1; i < N - 1; i++) {
            un[i] = 0.5 * (u[i - 1] + u[i + 1]);
            err = fmax(err, fabs(un[i] - u[i]));
        }
        u.swap(un);
        it++;
    }
    printf("convergio=%d\n", err <= 1e-8 ? 1 : 0);
    printf("u[16]=%.2f\n", u[16]);
    return 0;
}
`,
        hints: ["§reduction(max:err)§ funciona con §fmax§ porque la combinación es el máximo."],
        tests: {
          static: [{ re: "reduction\\s*\\(\\s*max\\s*:\\s*err", want: true, msg: "Usa §reduction(max:err)§." }],
          runs: [{ expect: [{ kind: "exact", value: "convergio=1\nu[16]=51.61" }] }],
        },
      },
    ],
  },

  {
    id: "ordenamiento",
    title: "Ordenamiento: bitónico y mergesort",
    unit: "U5.2 · PD05",
    minutes: 18,
    summary: "Redes de comparación paralelas y mergesort con tareas; span, trabajo y Brent.",
    slideDeck: "u5-2",
    topic: "ordenamiento",
    intro: md`
## Complejidad secuencial vs paralela

| Algoritmo | Secuencial | Paralelo (span) | Brent: $T_p$ |
|---|---|---|---|
| Bubblesort | $O(n^2)$ | $O(n)$ | $O(n^2/p + p)$ |
| Mergesort | $O(n\log n)$ | $O(\log^2 n)$ | $O(\frac{n\log n}{p}+\log^2 p)$ |
| Quicksort | $O(n\log n)$ | $O(\log^2 n)$ | igual |
| Bitónico | $O(n\log^2 n)$ trabajo | $O(\log^2 n)$ | igual |
| Heapsort | $O(n\log n)$ | difícil de paralelizar | — |

**Brent:** $T_p \le W/p + T_\infty$ (trabajo entre p más el span).

Caso $p < n$: cada proceso ordena $n/p$ elementos localmente: $T_p = O(\frac{n}{p}\log\frac{n}{p}) + T_{comm}$.

## Ordenamiento bitónico

Una secuencia **bitónica** crece y luego decrece. Compare-exchange de $a_i$ con $a_{i+n/2}$ para todo $i$ la parte en dos secuencias bitónicas donde todos los de una son menores que los de la otra. Recursivo: $T_\infty(n) = T_\infty(n/2) + O(\log n) = O(\log^2 n)$.

Versión iterativa para $n=2^k$: tres bucles anidados; el bucle más interno (sobre $i$) tiene iteraciones **independientes** → §parallel for§. Los dos bucles externos (§k§, §j§) son **etapas secuenciales**: la barrera implícita del §parallel for§ las separa.

## Escalabilidad (PD05)

Con cómputo $O(\frac{n}{p}\log n)$ y comunicación $O(\frac{n}{\sqrt p})$ (malla) o $O(\frac{n}{p}\log^2 p)$ (hipercubo): **la malla escala mejor** (necesita menos trabajo para mantener $E$ constante). Hyksort (quicksort en hipercubo): $n\log n \propto p\log^2 p$.
`,
    checkpoints: [
      {
        id: "bitonic",
        title: "Red bitónica con parallel for",
        task: md`Ordena **16 384** enteros con la red bitónica iterativa. Los bucles §k§ y §j§ son secuenciales; paraleliza el bucle sobre §i§ (cada §i§ intercambia con §ixj = i^j§ solo si §ixj > i§). Debe imprimir §ordenado=1§.`,
        starter: code`
#include <cstdio>
#include <utility>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int N = 1 << 14;
    vector<int> a(N);
    unsigned x = 777;
    for (int i = 0; i < N; i++) { x = x * 1103515245u + 12345u; a[i] = (x >> 8) % 100000; }

    for (int k = 2; k <= N; k <<= 1) {
        for (int j = k >> 1; j > 0; j >>= 1) {
            // TODO: paraleliza este bucle
            for (int i = 0; i < N; i++) {
                int ixj = i ^ j;
                if (ixj > i) {
                    if ((i & k) == 0 && a[i] > a[ixj]) swap(a[i], a[ixj]);
                    if ((i & k) != 0 && a[i] < a[ixj]) swap(a[i], a[ixj]);
                }
            }
        }
    }
    bool ok = true;
    for (int i = 1; i < N; i++) if (a[i - 1] > a[i]) ok = false;
    printf("ordenado=%d\n", ok ? 1 : 0);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <utility>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int N = 1 << 14;
    vector<int> a(N);
    unsigned x = 777;
    for (int i = 0; i < N; i++) { x = x * 1103515245u + 12345u; a[i] = (x >> 8) % 100000; }

    for (int k = 2; k <= N; k <<= 1) {
        for (int j = k >> 1; j > 0; j >>= 1) {
            #pragma omp parallel for num_threads(4)
            for (int i = 0; i < N; i++) {
                int ixj = i ^ j;
                if (ixj > i) {
                    if ((i & k) == 0 && a[i] > a[ixj]) swap(a[i], a[ixj]);
                    if ((i & k) != 0 && a[i] < a[ixj]) swap(a[i], a[ixj]);
                }
            }
        }
    }
    bool ok = true;
    for (int i = 1; i < N; i++) if (a[i - 1] > a[i]) ok = false;
    printf("ordenado=%d\n", ok ? 1 : 0);
    return 0;
}
`,
        hints: ["Cada par (i, i^j) se toca una sola vez por etapa, así que las iteraciones no chocan.", "§#pragma omp parallel for§ sobre el bucle de §i§; la barrera implícita separa las etapas."],
        tests: {
          static: [{ re: "omp\\s+parallel\\s+for", want: true, msg: "Usa §parallel for§ sobre el bucle de §i§." }],
          runs: [{ expect: [{ kind: "exact", value: "ordenado=1" }] }],
        },
      },
      {
        id: "mergesort",
        title: "Mergesort con tareas",
        task: md`Paraleliza §msort§ con **dos tareas** (mitad izquierda y derecha), un cutoff §if(hi-lo > 4096)§ y §taskwait§ **antes** de mezclar. Imprime §ordenado=1§.`,
        starter: code`
#include <algorithm>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

void merge_(vector<int>& a, vector<int>& tmp, int lo, int mid, int hi) {
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i < mid) tmp[k++] = a[i++];
    while (j < hi) tmp[k++] = a[j++];
    for (k = lo; k < hi; k++) a[k] = tmp[k];
}

void msort(vector<int>& a, vector<int>& tmp, int lo, int hi) {
    if (hi - lo < 2) return;
    int mid = (lo + hi) / 2;
    // TODO: dos tareas con cutoff y taskwait antes del merge
    msort(a, tmp, lo, mid);
    msort(a, tmp, mid, hi);
    merge_(a, tmp, lo, mid, hi);
}

int main() {
    const int N = 400000;
    vector<int> a(N), tmp(N);
    unsigned x = 4242;
    for (int i = 0; i < N; i++) { x = x * 1103515245u + 12345u; a[i] = (x >> 8) % 1000000; }
    #pragma omp parallel num_threads(4)
    #pragma omp single
    msort(a, tmp, 0, N);
    printf("ordenado=%d\n", is_sorted(a.begin(), a.end()) ? 1 : 0);
    return 0;
}
`,
        solution: code`
#include <algorithm>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

void merge_(vector<int>& a, vector<int>& tmp, int lo, int mid, int hi) {
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];
    while (i < mid) tmp[k++] = a[i++];
    while (j < hi) tmp[k++] = a[j++];
    for (k = lo; k < hi; k++) a[k] = tmp[k];
}

void msort(vector<int>& a, vector<int>& tmp, int lo, int hi) {
    if (hi - lo < 2) return;
    int mid = (lo + hi) / 2;
    #pragma omp task shared(a, tmp) firstprivate(lo, mid) if (hi - lo > 4096)
    msort(a, tmp, lo, mid);
    #pragma omp task shared(a, tmp) firstprivate(mid, hi) if (hi - lo > 4096)
    msort(a, tmp, mid, hi);
    #pragma omp taskwait
    merge_(a, tmp, lo, mid, hi);
}

int main() {
    const int N = 400000;
    vector<int> a(N), tmp(N);
    unsigned x = 4242;
    for (int i = 0; i < N; i++) { x = x * 1103515245u + 12345u; a[i] = (x >> 8) % 1000000; }
    #pragma omp parallel num_threads(4)
    #pragma omp single
    msort(a, tmp, 0, N);
    printf("ordenado=%d\n", is_sorted(a.begin(), a.end()) ? 1 : 0);
    return 0;
}
`,
        hints: ["El §merge§ necesita las dos mitades ya ordenadas: ¿dónde va el §taskwait§?"],
        tests: {
          static: [
            { re: "omp\\s+task\\b[^\\n]*if\\s*\\(", want: true, msg: "Agrega el cutoff §if(...)§." },
            { re: "omp\\s+taskwait", want: true, msg: "Falta §taskwait§ antes del merge." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "ordenado=1" }] }],
        },
      },
    ],
  },

  {
    id: "busqueda",
    title: "Búsqueda paralela: lineal y DFS",
    unit: "U5.3",
    minutes: 14,
    summary: "Búsqueda con salida temprana, DFS con tareas, branch and bound y métricas del tema.",
    slideDeck: "u5-3",
    topic: "busqueda",
    intro: md`
## Modelos de búsqueda

Buscar en $S=\{x_0,\dots,x_{n-1}\}$ un elemento con $P(x_i)=1$. Estrategias de paralelización:

| Algoritmo | Estrategia |
|---|---|
| Lineal | partición de datos + reducción OR |
| Binaria | múltiples consultas ($p-1$ pivotes) |
| DFS | paralelismo de subárboles |
| Branch & Bound | distribución de subproblemas |
| Backtracking | exploración de ramas |

## Métricas (tabla de la unidad)

| | $T_s$ | $T_\infty$ | $T_p$ |
|---|---|---|---|
| lineal | $O(n)$ | $O(\log n)$ | $O(n/p+\log n)$ |
| binaria | $O(\log n)$ | $O(\log_p n)$ | $O(\log_p n)$ |
| DFS | $O(n)$ | $O(d)$ | $O(n/p + d)$ |
| B&B | $O(b^d)$ | $O(d)$ | $O(b^d/p + d)$ |

Binaria con $p$ procesadores: $S_p=\Theta(\log p)$, $E_p=\Theta(\log p/p)$.

## Búsqueda con salida temprana

Con §parallel for§ no se puede hacer §break§. Se usa una **bandera compartida** leída con §atomic read§ y escrita con §atomic write§ (o §cancel§, que requiere §OMP_CANCELLATION=true§). Pasar tasks: "si un proceso encuentra la solución, todos terminan".

## DFS paralelo con tareas

Una tarea por hijo, §taskwait§ antes de combinar: $W(n)=\Theta(n)$, $T_\infty=\Theta(\log n)$ en árbol balanceado, $T_p=O(n/p + h)$ con $h$ la altura. Con **cutoff por profundidad** se genera paralelismo en los niveles altos (donde el costo de crear tareas es bajo).

## DTS vs PWS

**DTS** (Distributed Tree Search): se parte en un nivel $k=\lceil\log_b p\rceil$ y cada proceso toma un subárbol con el **mismo** umbral. **PWS** (Parallel Window Search): cada proceso recorre **todo** el árbol con un umbral distinto (IDA*) y se espera al más lento. PWS es mejor en búsquedas heurísticas profundas, DTS en árboles bien balanceados.
`,
    checkpoints: [
      {
        id: "busqueda-lineal",
        title: "Búsqueda lineal con salida temprana",
        task: md`Busca el valor **3 777 777** (único) en §a[i] = i§ con 5 000 000 elementos. Cada iteración debe **leer una bandera** con §atomic read§ y saltarse el trabajo si otro hilo ya lo encontró; el que lo encuentra guarda la posición y levanta la bandera (§atomic write§). Imprime §pos=3777777§.`,
        starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int N = 5000000;
    const int objetivo = 3777777;
    vector<int> a(N);
    for (int i = 0; i < N; i++) a[i] = i;

    int pos = -1;
    int encontrado = 0;
    // TODO: parallel for con bandera (atomic read / atomic write)
    for (int i = 0; i < N; i++) {
        if (a[i] == objetivo) pos = i;
    }
    printf("pos=%d\n", pos);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int N = 5000000;
    const int objetivo = 3777777;
    vector<int> a(N);
    for (int i = 0; i < N; i++) a[i] = i;

    int pos = -1;
    int encontrado = 0;
    #pragma omp parallel for num_threads(4)
    for (int i = 0; i < N; i++) {
        int f;
        #pragma omp atomic read
        f = encontrado;
        if (f) continue;
        if (a[i] == objetivo) {
            #pragma omp critical
            pos = i;
            #pragma omp atomic write
            encontrado = 1;
        }
    }
    printf("pos=%d\n", pos);
    return 0;
}
`,
        hints: ["Lee la bandera con §#pragma omp atomic read§ (§f = encontrado;§) y sal del paso con §continue§.", "Al encontrarlo: guarda §pos§ y §#pragma omp atomic write§ §encontrado = 1;§."],
        tests: {
          static: [
            { re: "omp\\s+atomic\\s+read", want: true, msg: "Lee la bandera con §atomic read§." },
            { re: "omp\\s+atomic\\s+write", want: true, msg: "Escribe la bandera con §atomic write§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "pos=3777777" }] }],
        },
      },
      {
        id: "dfs",
        title: "DFS con tareas y cutoff por profundidad",
        task: md`Árbol binario implícito de **n = 2²⁰−1** nodos (hijos de §i§: §2i+1§ y §2i+2§), con valor §i % 7§. Suma todos los valores con un DFS recursivo: una **tarea** para el hijo izquierdo (solo si §depth < 8§), el derecho en el hilo actual y §taskwait§ antes de combinar. Imprime §suma=..§.`,
        starter: code`
#include <cstdio>
#include <omp.h>

const long n = (1L << 20) - 1;

long dfs(long i, int depth) {
    if (i >= n) return 0;
    long l, r;
    // TODO: tarea para el hijo izquierdo (if depth < 8), derecho aquí, taskwait
    l = dfs(2 * i + 1, depth + 1);
    r = dfs(2 * i + 2, depth + 1);
    return (i % 7) + l + r;
}

int main() {
    long s;
    #pragma omp parallel num_threads(4)
    #pragma omp single
    s = dfs(0, 0);
    printf("suma=%ld\n", s);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <omp.h>

const long n = (1L << 20) - 1;

long dfs(long i, int depth) {
    if (i >= n) return 0;
    long l = 0, r = 0;
    #pragma omp task shared(l) firstprivate(i, depth) if (depth < 8)
    l = dfs(2 * i + 1, depth + 1);
    r = dfs(2 * i + 2, depth + 1);
    #pragma omp taskwait
    return (i % 7) + l + r;
}

int main() {
    long s;
    #pragma omp parallel num_threads(4)
    #pragma omp single
    s = dfs(0, 0);
    printf("suma=%ld\n", s);
    return 0;
}
`,
        hints: ["§shared(l)§ para que la tarea escriba el resultado en la variable del padre.", "Sin §taskwait§ se suma antes de que §l§ esté listo."],
        tests: {
          static: [
            { re: "omp\\s+task\\b[^\\n]*if\\s*\\(", want: true, msg: "Usa cutoff §if(depth < 8)§." },
            { re: "omp\\s+taskwait", want: true, msg: "Falta §taskwait§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "suma=3145719" }] }],
        },
      },
    ],
  },

  {
    id: "grafos",
    title: "Grafos: Floyd y Prim en paralelo",
    unit: "U5.4",
    minutes: 18,
    summary: "Todos los pares de caminos mínimos con collapse y MST con reducción de mínimo.",
    slideDeck: "u5-4",
    topic: "grafos",
    intro: md`
## Floyd–Warshall

$$d^{(k)}_{i,j} = \min\bigl(d^{(k-1)}_{i,j},\; d^{(k-1)}_{i,k} + d^{(k-1)}_{k,j}\bigr)$$

Secuencial $T_s = O(n^3)$. En paralelo (PRAM): las $n$ iteraciones de $k$ son **secuenciales** (cada una usa la anterior) y las $n^2$ actualizaciones de cada etapa son independientes:

$$W = \Theta(n^3),\quad T_\infty=\Theta(n),\quad T_p=\Theta\!\left(\frac{n^3}{p}+n\right)$$

Con bloques 2D en MPI: $T_p = O\!\left(\frac{n^3}{p}\right)+O\!\left(\frac{n^2}{\sqrt p}\log p\right)$, $E = O\!\left(\dfrac{1}{1+\frac{\sqrt p \log p}{n}}\right)$.

En OpenMP: §k§ fuera, y §#pragma omp parallel for collapse(2)§ sobre §i,j§.

## Prim paralelo (MST)

En cada una de las $n$ iteraciones: (1) **búsqueda paralela del mínimo** $dist[v]$ entre los vértices fuera del árbol, (2) **reducción** para escoger el global, (3) insertar al MST, (4) **actualizar** $dist$ en paralelo.

$$W=\Theta(n^2),\quad T_\infty=\Theta(n\log n),\quad T_p=O\!\left(\frac{n^2}{p}+n\log p\right),\quad E=O\!\left(\frac{1}{1+\frac{p\log p}{n}}\right)$$

Para $E=O(1)$ se necesita $n=\Omega(p\log p)$. Dijkstra paralelo es idéntico en rendimiento. Prim es mejor en grafos **densos**.

## Pointer jumping y coloreo

**Pointer jumping:** $S(i)=S(S(i))$ hasta llegar a la raíz: $T_\infty=O(\log h)$, $W=O(n\log h)$. **3-coloreo de un ciclo** (Cole–Vishkin): $T_\infty=O(\log^* n)$.
`,
    checkpoints: [
      {
        id: "floyd",
        title: "Floyd con collapse(2)",
        task: md`Paraleliza Floyd–Warshall: el bucle de §k§ queda secuencial y el doble bucle §i,j§ se reparte con §parallel for collapse(2)§. Imprime la suma de todas las distancias (§suma=..§).`,
        starter: code`
#include <algorithm>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int n = 200;
    const long long INF = 1000000000LL;
    vector<vector<long long>> d(n, vector<long long>(n, INF));
    for (int i = 0; i < n; i++) {
        d[i][i] = 0;
        for (int j = 0; j < n; j++)
            if (i != j && (i + j) % 3 != 0) d[i][j] = ((i * 31 + j * 17) % 23) + 1;
    }
    for (int k = 0; k < n; k++) {
        // TODO: paraleliza i, j (k es secuencial)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                d[i][j] = min(d[i][j], d[i][k] + d[k][j]);
    }
    long long suma = 0;
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) suma += d[i][j];
    printf("suma=%lld\n", suma);
    return 0;
}
`,
        solution: code`
#include <algorithm>
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int main() {
    const int n = 200;
    const long long INF = 1000000000LL;
    vector<vector<long long>> d(n, vector<long long>(n, INF));
    for (int i = 0; i < n; i++) {
        d[i][i] = 0;
        for (int j = 0; j < n; j++)
            if (i != j && (i + j) % 3 != 0) d[i][j] = ((i * 31 + j * 17) % 23) + 1;
    }
    for (int k = 0; k < n; k++) {
        #pragma omp parallel for collapse(2) num_threads(4)
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                d[i][j] = min(d[i][j], d[i][k] + d[k][j]);
    }
    long long suma = 0;
    for (int i = 0; i < n; i++) for (int j = 0; j < n; j++) suma += d[i][j];
    printf("suma=%lld\n", suma);
    return 0;
}
`,
        hints: ["No paralelices §k§: la etapa §k§ usa los resultados de la etapa §k-1§.", "§#pragma omp parallel for collapse(2)§ sobre §i§ y §j§."],
        tests: {
          static: [{ re: "parallel\\s+for\\s+collapse\\s*\\(\\s*2", want: true, msg: "Usa §parallel for collapse(2)§." }],
          runs: [{ expect: [{ kind: "exact", value: "suma=176023" }] }],
        },
      },
      {
        id: "prim",
        title: "Prim: mínimo local + critical",
        task: md`En cada paso, encuentra en paralelo el vértice **fuera del MST** con menor §dist§: cada hilo calcula su mínimo local (§mejor_d§, §mejor_v§) y los combina en un único §critical§ (desempata por índice menor). Después actualiza §dist§ en un §parallel for§. Imprime el peso total (§mst=..§).`,
        starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int w(int i, int j) { return ((i * i + j * j + i * j) % 97) + 1; }

int main() {
    const int n = 300;
    const int INF = 1 << 30;
    vector<int> dist(n, INF);
    vector<char> in(n, 0);
    dist[0] = 0;
    long long total = 0;
    for (int it = 0; it < n; it++) {
        int u = -1, best = INF;
        // TODO: búsqueda paralela del mínimo (local por hilo + un critical)
        for (int v = 0; v < n; v++)
            if (!in[v] && (dist[v] < best || (dist[v] == best && v < u))) { best = dist[v]; u = v; }
        in[u] = 1;
        total += best;
        // TODO: actualización paralela de dist
        for (int v = 0; v < n; v++)
            if (!in[v] && w(u, v) < dist[v]) dist[v] = w(u, v);
    }
    printf("mst=%lld\n", total);
    return 0;
}
`,
        solution: code`
#include <cstdio>
#include <vector>
#include <omp.h>
using namespace std;

int w(int i, int j) { return ((i * i + j * j + i * j) % 97) + 1; }

int main() {
    const int n = 300;
    const int INF = 1 << 30;
    vector<int> dist(n, INF);
    vector<char> in(n, 0);
    dist[0] = 0;
    long long total = 0;
    for (int it = 0; it < n; it++) {
        int u = -1, best = INF;
        #pragma omp parallel num_threads(4)
        {
            int mejor_d = INF, mejor_v = -1;
            #pragma omp for nowait
            for (int v = 0; v < n; v++)
                if (!in[v] && (dist[v] < mejor_d || (dist[v] == mejor_d && v < mejor_v))) { mejor_d = dist[v]; mejor_v = v; }
            #pragma omp critical
            if (mejor_v >= 0 && (mejor_d < best || (mejor_d == best && mejor_v < u))) { best = mejor_d; u = mejor_v; }
        }
        in[u] = 1;
        total += best;
        #pragma omp parallel for num_threads(4)
        for (int v = 0; v < n; v++)
            if (!in[v] && w(u, v) < dist[v]) dist[v] = w(u, v);
    }
    printf("mst=%lld\n", total);
    return 0;
}
`,
        hints: ["Primer bloque: §parallel§ { mínimo local; §omp for§; §critical§ para combinar }.", "Segundo bloque: un §parallel for§ simple, cada §v§ es independiente."],
        tests: {
          static: [
            { re: "omp\\s+critical", want: true, msg: "Combina los mínimos locales con §critical§." },
            { re: "omp\\s+parallel\\s+for", want: true, msg: "Paraleliza también la actualización de §dist§." },
          ],
          runs: [{ expect: [{ kind: "exact", value: "mst=335" }] }],
        },
      },
    ],
  },
];
