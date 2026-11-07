import { md, code } from "@/lib/md";
import type { Problem } from "@/lib/types";
import { X, N } from "./problem-helpers";

const PAR = { re: "omp\\s+parallel", want: true, msg: "Falta una directiva §#pragma omp parallel§." };

export const problems1: Problem[] = [
  {
    slug: "matvec",
    title: "Producto matriz-vector",
    topic: "worksharing",
    diff: "facil",
    source: "Guía U4.2 · work-sharing",
    statement: md`
Dada una matriz $A$ de $n\times n$ con $A_{ij} = ((i+j) \bmod 10) + 1$ y un vector $x_j = (j \bmod 5) + 1$, calcula $y = Ax$.

**Entrada:** un entero $n$.
**Salida:** una línea §y0=<y[0]> y_last=<y[n-1]> total=<suma de y>§.

Paraleliza el cálculo con OpenMP. La matriz no se almacena: usa la fórmula.`,
    starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    int n;
    scanf("%d", &n);
    std::vector<long> x(n), y(n);
    for (int j = 0; j < n; j++) x[j] = j % 5 + 1;

    // TODO: paraleliza el bucle adecuado
    for (int i = 0; i < n; i++) {
        long acc = 0;
        for (int j = 0; j < n; j++) acc += (long)((i + j) % 10 + 1) * x[j];
        y[i] = acc;
    }

    long total = 0;
    for (int i = 0; i < n; i++) total += y[i];
    printf("y0=%ld y_last=%ld total=%ld\n", y[0], y[n - 1], total);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    int n;
    scanf("%d", &n);
    std::vector<long> x(n), y(n);
    for (int j = 0; j < n; j++) x[j] = j % 5 + 1;

    #pragma omp parallel for
    for (int i = 0; i < n; i++) {
        long acc = 0;
        for (int j = 0; j < n; j++) acc += (long)((i + j) % 10 + 1) * x[j];
        y[i] = acc;
    }

    long total = 0;
    for (int i = 0; i < n; i++) total += y[i];
    printf("y0=%ld y_last=%ld total=%ld\n", y[0], y[n - 1], total);
    return 0;
}
`,
    hints: [
      "Cada fila $i$ es independiente de las demás: ¿qué bucle conviene repartir?",
      "Paraleliza el bucle **externo** (§i§). El acumulador §acc§ se declara dentro del bucle, así que ya es privado.",
    ],
    editorial: md`
## Idea
Cada $y_i$ depende sólo de la fila $i$ de $A$ y de $x$ (de sólo lectura): las $n$ filas son **independientes**. Se paraleliza el bucle externo con §parallel for§ (§schedule(static)§ basta: el costo por fila es uniforme).

Paralelizar el bucle interno sería un error de granularidad: crearías una región paralela (y una reducción) por cada fila.

## Complejidad
| Métrica | Valor |
|---|---|
| $T_s$ | $\Theta(n^2)$ |
| $T_\infty$ | $\Theta(n)$ (una fila) |
| $T_p$ | $\Theta(n^2/p + \text{overhead})$ |
| Speedup / eficiencia | $S\approx p$, $E\approx 1$ si $n \gg p$ |
`,
    tests: {
      static: [PAR, { re: "omp\\s+parallel\\s+for|omp\\s+for", want: true, msg: "Usa §parallel for§ sobre el bucle de filas." }],
      runs: [
        { stdin: "4\n", threads: 4, expect: [X("matvec", 0)], label: "caso pequeño" },
        { stdin: "3000\n", threads: 4, expect: [X("matvec", 1)], label: "n = 3000" },
      ],
    },
  },
  {
    slug: "amdahl-calc",
    title: "Calculadora de speedup y eficiencia",
    topic: "fundamentos",
    diff: "facil",
    source: "Parcial 2026-I · P2.1",
    statement: md`
Un programa tiene tiempo secuencial $T_s$ y una fracción paralelizable $f$. Con $p$ procesadores (ley de Amdahl):

$$T_p = T_s\left(1-f+\frac{f}{p}\right),\quad S = \frac{T_s}{T_p},\quad E = \frac{S}{p}.$$

**Entrada:** §Ts f p§ (reales y entero).
**Salida:** §Tp=<..> S=<..> E=<..>§ con 2 decimales.`,
    starter: code`
#include <cstdio>

int main() {
    double Ts, f;
    int p;
    scanf("%lf %lf %d", &Ts, &f, &p);
    // TODO: calcula Tp, S y E
    double Tp = 0, S = 0, E = 0;
    printf("Tp=%.2f S=%.2f E=%.2f\n", Tp, S, E);
    return 0;
}
`,
    solution: code`
#include <cstdio>

int main() {
    double Ts, f;
    int p;
    scanf("%lf %lf %d", &Ts, &f, &p);
    double Tp = Ts * ((1.0 - f) + f / p);
    double S = Ts / Tp;
    double E = S / p;
    printf("Tp=%.2f S=%.2f E=%.2f\n", Tp, S, E);
    return 0;
}
`,
    hints: ["La parte serial $(1-f)$ no se divide entre $p$.", "$S = T_s / T_p$ y $E = S / p$."],
    editorial: md`
## Idea
Fórmula directa. Con $T_s=1000$, $f=0.95$:

| $p$ | $T_p$ | $S$ | $E$ |
|---|---|---|---|
| 10 | 145 | 6.90 | 0.69 |
| 100 | 59.5 | 16.81 | 0.17 |

Con 10× más procesadores el speedup sólo se multiplica por 2.4: el tope es $1/(1-f)=20$. La eficiencia cae 4×: pagas más recursos por una ganancia pequeña.

## Complejidad
$O(1)$. Lo importante es la **interpretación**: Amdahl limita el escalamiento fuerte (problema fijo).`,
    tests: {
      runs: [
        { stdin: "1000 0.95 10\n", expect: [X("amdahl-calc", 0)] },
        { stdin: "1000 0.95 100\n", expect: [X("amdahl-calc", 1)] },
        { stdin: "50 0.5 4\n", expect: [X("amdahl-calc", 2)] },
      ],
    },
  },
  {
    slug: "energia-cluster",
    title: "Costo energético de un clúster",
    topic: "fundamentos",
    diff: "medio",
    source: "Parcial 2026-I · P2",
    statement: md`
La energía consumida por $p$ nodos de potencia $P_{nodo}$ (kW) durante $T_p$ segundos es $E_{kWh} = p\,P_{nodo}\,T_p/3600$, y el costo $C = E_{kWh}\cdot c_e$.

Con Amdahl: $T_p = T_s(1-f+f/p)$.

**Entrada:** §Ts f p Pnodo ce§.
**Salida:** §S=<..> E=<..> kWh=<..> usd=<..>§ (S y E con 2 decimales; kWh y usd con 3).

Observa: $E_{kWh} = P_{nodo}T_s/(E\cdot 3600)$, el costo es inversamente proporcional a la eficiencia.`,
    starter: code`
#include <cstdio>

int main() {
    double Ts, f, Pn, ce;
    int p;
    scanf("%lf %lf %d %lf %lf", &Ts, &f, &p, &Pn, &ce);
    // TODO: Tp (Amdahl), S, E, energía en kWh y costo
    double S = 0, E = 0, kwh = 0, usd = 0;
    printf("S=%.2f E=%.2f kWh=%.3f usd=%.3f\n", S, E, kwh, usd);
    return 0;
}
`,
    solution: code`
#include <cstdio>

int main() {
    double Ts, f, Pn, ce;
    int p;
    scanf("%lf %lf %d %lf %lf", &Ts, &f, &p, &Pn, &ce);
    double Tp = Ts * ((1.0 - f) + f / p);
    double S = Ts / Tp;
    double E = S / p;
    double kwh = p * Pn * Tp / 3600.0;
    double usd = kwh * ce;
    printf("S=%.2f E=%.2f kWh=%.3f usd=%.3f\n", S, E, kwh, usd);
    return 0;
}
`,
    hints: ["El tiempo en la fórmula de energía va en **horas**: divide los segundos entre 3600."],
    editorial: md`
## Idea
$p=10$: $T_p=145$ s, $E_{kWh}=10\cdot0.3\cdot145/3600=0.121$, costo $0.018$ USD.
$p=100$: $T_p=59.5$ s, $E_{kWh}=0.496$, costo $0.074$ USD.

Con 10× más nodos el programa es sólo 2.4× más rápido, pero **gasta 4× más energía**: la eficiencia cayó de 0.69 a 0.17.

## Complejidad
$O(1)$. Conclusión de examen: en escalamiento fuerte hay un punto óptimo de $p$ donde el costo energético deja de justificar la ganancia de velocidad.`,
    tests: {
      runs: [
        { stdin: "1000 0.95 10 0.3 0.15\n", expect: [X("energia-cluster", 0)] },
        { stdin: "1000 0.95 100 0.3 0.15\n", expect: [X("energia-cluster", 1)] },
      ],
    },
  },
  {
    slug: "histograma",
    title: "Histograma paralelo",
    topic: "sincronizacion",
    diff: "facil",
    source: "PD04 2025-II · Ej. 1",
    statement: md`
Genera $N$ datos $x_i = \big((2654435761\,i)\gg 8\big) \bmod B$ (usa §long long§ para evitar desbordes) y cuenta cuántos caen en cada uno de los $B$ bins.

**Entrada:** §N B§ ($B \le 64$).
**Salida:** una línea con los $B$ conteos separados por espacio y luego §total=<suma>§ (debe ser $N$).

Paraleliza con §reduction§ sobre el arreglo, §atomic§ o locks por bin. Todas son válidas; piensa cuál es más eficiente.`,
    starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    long long N;
    int B;
    scanf("%lld %d", &N, &B);
    long H[64] = {0};

    // TODO: paraleliza evitando la condición de carrera sobre H
    for (long long i = 0; i < N; i++) {
        int b = (int)(((2654435761LL * i) >> 8) % B);
        H[b]++;
    }

    long total = 0;
    for (int b = 0; b < B; b++) {
        printf("%ld ", H[b]);
        total += H[b];
    }
    printf("total=%ld\n", total);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    long long N;
    int B;
    scanf("%lld %d", &N, &B);
    long H[64] = {0};

    #pragma omp parallel for reduction(+:H[:64])
    for (long long i = 0; i < N; i++) {
        int b = (int)(((2654435761LL * i) >> 8) % B);
        H[b]++;
    }

    long total = 0;
    for (int b = 0; b < B; b++) {
        printf("%ld ", H[b]);
        total += H[b];
    }
    printf("total=%ld\n", total);
    return 0;
}
`,
    hints: [
      "Todos los hilos incrementan el mismo §H[b]§: eso es una carrera de datos.",
      "Con §reduction(+:H[:64])§ cada hilo tiene su propio histograma y se suman al final.",
      "Alternativa: §#pragma omp atomic§ antes de §H[b]++§ (más lento si hay pocos bins: mucha contención).",
    ],
    editorial: md`
## Estrategias
| Estrategia | Ventaja | Desventaja |
|---|---|---|
| §critical§ | trivial | serializa todo: $S\approx 1$ |
| §atomic§ | barato por incremento | contención si hay pocos bins |
| §reduction(+:H[:B])§ | sin contención; combinación al final | memoria $O(pB)$ |

## Complejidad
- $T_s=\Theta(N)$.
- Con reducción: $T_p=\Theta(N/p + B\log p)$ (cada hilo recorre $N/p$ datos y se combinan $p$ histogramas de $B$ bins).
- Eficiencia alta cuando $N/p \gg B\log p$.

**PRAM:** $N$ procesadores calculan su bin; los conteos se obtienen con una suma por bin (CREW, $O(\log N)$) o con ARBITRARY/PRIORITY-CRCW acumulativo.`,
    tests: {
      static: [PAR, { re: "reduction|atomic|critical|omp_set_lock|omp_lock", want: true, msg: "Protege el incremento (reduction, atomic o locks)." }],
      runs: [
        { stdin: "1000 5\n", threads: 4, expect: [X("histograma", 0)], label: "N pequeño" },
        { stdin: "4000000 16\n", threads: 4, expect: [X("histograma", 1)], label: "N grande, 16 bins" },
        { stdin: "3000000 3\n", threads: 8, expect: [X("histograma", 2)], label: "pocos bins, 8 hilos" },
      ],
    },
  },
  {
    slug: "schedule-costos",
    title: "Bucle irregular: elige el schedule",
    topic: "worksharing",
    diff: "medio",
    source: "U4.2 · schedule",
    statement: md`
Cada iteración $i$ ejecuta §trabajo(i)§ cuyo costo es muy desigual: cada 64 iteraciones hay una **pesada** (40 000 pasos) y el resto son ligeras (400 pasos).

Calcula la suma (módulo $2^{64}$) de los resultados. **Entrada:** $n$. **Salida:** §suma=<valor>§.

Un reparto estático por bloques contiguos deja hilos ociosos. Usa una política de §schedule§ que balancee la carga (**dynamic** o **guided**).`,
    starter: code`
#include <cstdio>
#include <omp.h>

static unsigned long long trabajo(long i) {
    int pasos = (i % 64 == 0) ? 40000 : 400;
    unsigned long long x = (unsigned long long)i + 1;
    for (int k = 0; k < pasos; k++) x = x * 6364136223846793005ULL + 1442695040888963407ULL;
    return x >> 33;
}

int main() {
    long n;
    scanf("%ld", &n);
    unsigned long long suma = 0;

    // TODO: paraleliza con una política de schedule que equilibre la carga
    for (long i = 0; i < n; i++) suma += trabajo(i);

    printf("suma=%llu\n", suma);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <omp.h>

static unsigned long long trabajo(long i) {
    int pasos = (i % 64 == 0) ? 40000 : 400;
    unsigned long long x = (unsigned long long)i + 1;
    for (int k = 0; k < pasos; k++) x = x * 6364136223846793005ULL + 1442695040888963407ULL;
    return x >> 33;
}

int main() {
    long n;
    scanf("%ld", &n);
    unsigned long long suma = 0;

    #pragma omp parallel for schedule(dynamic, 16) reduction(+:suma)
    for (long i = 0; i < n; i++) suma += trabajo(i);

    printf("suma=%llu\n", suma);
    return 0;
}
`,
    hints: [
      "La suma de §unsigned long long§ es asociativa módulo $2^{64}$: puedes usar §reduction(+:suma)§.",
      "Con §schedule(static)§ un mismo hilo puede recibir todas las iteraciones pesadas consecutivas. Prueba §dynamic§ con chunk pequeño.",
    ],
    editorial: md`
## Idea
El costo por iteración es irregular, así que el reparto estático desbalancea. §dynamic, c§ entrega bloques de $c$ iteraciones bajo demanda; un chunk grande reduce overhead, uno pequeño equilibra mejor. §guided§ empieza con bloques grandes y los reduce.

## Complejidad
Trabajo total $W=\sum c_i$. Con reparto ideal $T_p\approx W/p$. Con static el tiempo es el del hilo más cargado: $\max_t W_t \ge W/p$. Con dynamic el desbalance está acotado por el costo de **un chunk**: $T_p \le W/p + c\cdot c_{max}$ más el overhead de la cola.`,
    tests: {
      static: [PAR, { re: "schedule\\s*\\(\\s*(dynamic|guided)", want: true, msg: "Usa §schedule(dynamic[,c])§ o §schedule(guided)§." }, { re: "reduction\\s*\\(\\s*\\+\\s*:\\s*suma", want: true, msg: "Acumula con §reduction(+:suma)§." }],
      runs: [
        { stdin: "100\n", threads: 4, expect: [X("schedule-costos", 0)] },
        { stdin: "30000\n", threads: 4, expect: [X("schedule-costos", 1)] },
      ],
    },
  },
  {
    slug: "cartera",
    title: "Gradiente de una cartera financiera",
    topic: "sincronizacion",
    diff: "medio",
    source: "PD04 2026-II · Ej. 1",
    statement: md`
Una cartera de $M$ activos se evalúa bajo $N$ escenarios. Con $X_{ij} = ((31i + 17j) \bmod 100)/100$ y pérdida $L_i = ((13i) \bmod 7) - 1$, el gradiente es

$$G_j = \frac1N\sum_{i=0}^{N-1} L_i\,X_{ij},\qquad j=0,\dots,M-1.$$

**Entrada:** §N M§ ($M \le 32$).
**Salida:** §G0=<..> G1=<..> G2=<..> sumG=<..>§ con 6 decimales (los tres primeros $G_j$ y $\sum_j G_j$).

Paraleliza sobre los **escenarios** ($N\gg M$) sin condiciones de carrera.`,
    starter: code`
#include <cstdio>
#include <cmath>
#include <omp.h>

int main() {
    long N;
    int M;
    scanf("%ld %d", &N, &M);
    double G[32] = {0};

    // TODO: paraleliza el bucle de escenarios sin carreras sobre G
    for (long i = 0; i < N; i++) {
        double L = (double)((13 * i) % 7) - 1.0;
        for (int j = 0; j < M; j++) {
            double X = (double)((31 * i + 17 * j) % 100) / 100.0;
            G[j] += L * X;
        }
    }

    double sum = 0;
    for (int j = 0; j < M; j++) { G[j] /= N; sum += G[j]; }
    printf("G0=%.6f G1=%.6f G2=%.6f sumG=%.6f\n", G[0], G[1], G[2], sum);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <cmath>
#include <omp.h>

int main() {
    long N;
    int M;
    scanf("%ld %d", &N, &M);
    double G[32] = {0};

    #pragma omp parallel for reduction(+:G[:32])
    for (long i = 0; i < N; i++) {
        double L = (double)((13 * i) % 7) - 1.0;
        for (int j = 0; j < M; j++) {
            double X = (double)((31 * i + 17 * j) % 100) / 100.0;
            G[j] += L * X;
        }
    }

    double sum = 0;
    for (int j = 0; j < M; j++) { G[j] /= N; sum += G[j]; }
    printf("G0=%.6f G1=%.6f G2=%.6f sumG=%.6f\n", G[0], G[1], G[2], sum);
    return 0;
}
`,
    hints: [
      "Hay tres opciones: §critical§/§atomic§ en cada §G[j] +=§, acumuladores privados por hilo, o §reduction§ sobre el arreglo.",
      "§reduction(+:G[:32])§ da a cada hilo un §G§ privado inicializado en 0 y los suma al final: sin contención.",
    ],
    editorial: md`
## Comparación de estrategias
| Estrategia | Ventajas | Desventajas |
|---|---|---|
| §critical§ en la actualización | simple | serializa: $T_p\approx T_s$ |
| §atomic§ por componente | granular | $NM$ operaciones atómicas con contención |
| acumuladores privados / §reduction(+:G[:M])§ | sin contención | memoria $O(pM)$ + combinación |

## Complejidad (estrategia elegida: reducción de arreglo)
- $T_s=\Theta(NM)$
- Cada hilo procesa $N/p$ escenarios: $\Theta(NM/p)$.
- Combinación de $p$ copias de tamaño $M$: $\Theta(M\log p)$.
- $T_p=\Theta\!\left(\dfrac{NM}{p}+M\log p\right)$, speedup $S=\dfrac{NM}{NM/p+M\log p}$.
- **Isoeficiencia:** $T_o=pT_p-T_s = pM\log p$; $NM = K\,pM\log p \Rightarrow N=\Theta(p\log p)$.`,
    tests: {
      static: [PAR, { re: "reduction|atomic|critical|private", want: true, msg: "Evita la carrera sobre §G§ (reduction, atomic o acumuladores privados)." }],
      runs: [
        { stdin: "1000 4\n", threads: 4, expect: N("cartera", 0, 1e-6) },
        { stdin: "600000 32\n", threads: 4, expect: N("cartera", 1, 1e-5) },
      ],
    },
  },
  {
    slug: "gradiente-logistico",
    title: "Regresión logística: un paso de gradiente en paralelo",
    topic: "sincronizacion",
    diff: "medio",
    source: "PD04 2025-II · Ej. 1",
    statement: md`
Entrena un modelo logístico de $d$ características con $n$ muestras. Datos: $X_{ij}=((7i+3j) \bmod 11 - 5)/5$, $y_i = 1$ si $(7i \bmod 11) > 5$, si no $0$. Pesos iniciales $w=0$, tasa $\eta=1$ y **5 iteraciones** de descenso de gradiente:

$$p_i=\sigma(w^\top x_i),\quad \nabla_j=\frac1n\sum_i (p_i-y_i)X_{ij},\quad w\leftarrow w-\eta\nabla.$$

La pérdida es $-\frac1n\sum_i [y_i\ln(p_i+\varepsilon)+(1-y_i)\ln(1-p_i+\varepsilon)]$ con $\varepsilon=10^{-12}$.

**Entrada:** §n d§ ($d\le16$). **Salida:** §loss=<..> w0=<..> w1=<..>§ (6 decimales, después de la última actualización; la pérdida es la de la **última** pasada).

Parelaliza el bucle sobre muestras ($n\gg d$) con una sola cláusula §reduction§ que cubra la pérdida y el gradiente.`,
    starter: code`
#include <cstdio>
#include <cmath>
#include <omp.h>

int main() {
    int n, d;
    scanf("%d %d", &n, &d);
    const double eta = 1.0, eps = 1e-12;
    double w[16] = {0};
    double loss = 0;

    for (int it = 0; it < 5; it++) {
        double grad[16] = {0};
        loss = 0;
        // TODO: paraleliza este bucle (pérdida y gradiente son acumuladores compartidos)
        for (int i = 0; i < n; i++) {
            double z = 0;
            for (int j = 0; j < d; j++) z += w[j] * (((7 * i + 3 * j) % 11) - 5) / 5.0;
            double p = 1.0 / (1.0 + exp(-z));
            double y = ((7 * i) % 11 > 5) ? 1.0 : 0.0;
            double err = p - y;
            loss -= y * log(p + eps) + (1 - y) * log(1 - p + eps);
            for (int j = 0; j < d; j++) grad[j] += err * (((7 * i + 3 * j) % 11) - 5) / 5.0;
        }
        for (int j = 0; j < d; j++) w[j] -= eta * grad[j] / n;
        loss /= n;
    }
    printf("loss=%.6f w0=%.6f w1=%.6f\n", loss, w[0], w[1]);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <cmath>
#include <omp.h>

int main() {
    int n, d;
    scanf("%d %d", &n, &d);
    const double eta = 1.0, eps = 1e-12;
    double w[16] = {0};
    double loss = 0;

    for (int it = 0; it < 5; it++) {
        double grad[16] = {0};
        loss = 0;
        #pragma omp parallel for reduction(+:loss, grad[:16])
        for (int i = 0; i < n; i++) {
            double z = 0;
            for (int j = 0; j < d; j++) z += w[j] * (((7 * i + 3 * j) % 11) - 5) / 5.0;
            double p = 1.0 / (1.0 + exp(-z));
            double y = ((7 * i) % 11 > 5) ? 1.0 : 0.0;
            double err = p - y;
            loss -= y * log(p + eps) + (1 - y) * log(1 - p + eps);
            for (int j = 0; j < d; j++) grad[j] += err * (((7 * i + 3 * j) % 11) - 5) / 5.0;
        }
        for (int j = 0; j < d; j++) w[j] -= eta * grad[j] / n;
        loss /= n;
    }
    printf("loss=%.6f w0=%.6f w1=%.6f\n", loss, w[0], w[1]);
    return 0;
}
`,
    hints: [
      "Se paraleliza el bucle de **muestras** ($n\\gg d$), no el de características: hay mucho más trabajo y menos sincronización.",
      "Una sola cláusula puede reducir un escalar y un arreglo: §reduction(+:loss, grad[:16])§.",
    ],
    editorial: md`
## Tres versiones del enunciado original
1. **§reduction§** (la mejor): copias privadas de §loss§ y §grad§ → sin contención.
2. **§critical§**: un bloque que suma el gradiente local: correcto pero serializa $n$ secciones.
3. **§atomic§** por componente: $nd$ operaciones atómicas; mejor que critical pero con contención.

## Complejidad por iteración
- $T_s=\Theta(nd)$ (la exponencial es $O(1)$).
- $T_p=\Theta(nd/p + d\log p)$.
- Para 5 iteraciones se multiplica por 5; las regiones paralelas se crean 5 veces (overhead $O(p)$ cada una).
- Escalabilidad: $E\approx 1$ cuando $n \gg p\log p$.`,
    tests: {
      static: [PAR, { re: "reduction", want: true, msg: "Usa §reduction§ para acumular §loss§ y §grad§." }],
      runs: [
        { stdin: "1000 4\n", threads: 4, expect: N("gradiente-logistico", 0, 1e-6) },
        { stdin: "200000 12\n", threads: 4, expect: N("gradiente-logistico", 1, 1e-5) },
      ],
    },
  },
  {
    slug: "promedio-mayores",
    title: "Posiciones mayores al promedio",
    topic: "sincronizacion",
    diff: "medio",
    source: "PD04 2026-I · Ej. 3",
    statement: md`
Dada la matriz $A$ de $N\times N$ con $A_{ij}=(131i+71j) \bmod 1000$, calcula el promedio y guarda en un arreglo todas las posiciones $(i,j)$ con $A_{ij} >$ promedio. El orden de las posiciones **no** importa.

**Entrada:** $N$.
**Salida:** §k=<cantidad> sumpos=<suma de i*N+j de las posiciones guardadas>§.

La segunda fase (guardar posiciones) debe paralelizarse con §atomic capture§ para obtener un índice único en el arreglo.`,
    starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    int N;
    scanf("%d", &N);
    std::vector<int> A((size_t)N * N);
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) A[(size_t)i * N + j] = (131 * i + 71 * j) % 1000;

    long long sum = 0;
    // TODO: paraleliza el cálculo de la suma
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) sum += A[(size_t)i * N + j];
    double prom = (double)sum / ((double)N * N);

    std::vector<int> pos_i((size_t)N * N), pos_j((size_t)N * N);
    int k = 0;
    // TODO: paraleliza usando #pragma omp atomic capture para obtener el índice
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            if (A[(size_t)i * N + j] > prom) {
                pos_i[k] = i;
                pos_j[k] = j;
                k++;
            }

    long long sumpos = 0;
    for (int t = 0; t < k; t++) sumpos += (long long)pos_i[t] * N + pos_j[t];
    printf("k=%d sumpos=%lld\n", k, sumpos);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    int N;
    scanf("%d", &N);
    std::vector<int> A((size_t)N * N);
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) A[(size_t)i * N + j] = (131 * i + 71 * j) % 1000;

    long long sum = 0;
    #pragma omp parallel for collapse(2) reduction(+:sum)
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++) sum += A[(size_t)i * N + j];
    double prom = (double)sum / ((double)N * N);

    std::vector<int> pos_i((size_t)N * N), pos_j((size_t)N * N);
    int k = 0;
    #pragma omp parallel for collapse(2)
    for (int i = 0; i < N; i++)
        for (int j = 0; j < N; j++)
            if (A[(size_t)i * N + j] > prom) {
                int idx;
                #pragma omp atomic capture
                idx = k++;
                pos_i[idx] = i;
                pos_j[idx] = j;
            }

    long long sumpos = 0;
    for (int t = 0; t < k; t++) sumpos += (long long)pos_i[t] * N + pos_j[t];
    printf("k=%d sumpos=%lld\n", k, sumpos);
    return 0;
}
`,
    hints: [
      "La primera fase es una reducción: §collapse(2) reduction(+:sum)§.",
      "En la segunda, §k++§ es un *leer-y-avanzar*: si dos hilos leen el mismo §k§ escriben en la misma posición.",
      "§#pragma omp atomic capture§ seguido de §idx = k++;§ reserva una posición única de forma indivisible.",
    ],
    editorial: md`
## Idea
1. **Suma** con §reduction(+:sum)§ y §collapse(2)§ para repartir las $N^2$ celdas.
2. **Posiciones**: cada hilo que encuentra un elemento mayor reserva un índice con §atomic capture§ (lectura + incremento indivisibles) y escribe en su casilla.

## Análisis del overhead
- Regiones paralelas: $O(p)$ cada una; reducción: $O(\log p)$.
- Si $M$ elementos superan el promedio, el atomic se ejecuta $M$ veces: costo $O(M)$ con constante alta por contención ($M\le N^2$).
- $T_p = O\!\left(\dfrac{N^2}{p} + \log p + M\right)$.

El resultado es correcto aunque el **orden** de las posiciones cambie entre ejecuciones (por eso la salida usa una suma, no la lista).`,
    tests: {
      static: [PAR, { re: "atomic\\s+capture", want: true, msg: "Usa §#pragma omp atomic capture§ para reservar el índice." }, { re: "reduction\\s*\\(\\s*\\+", want: true, msg: "La suma del promedio debe ser una §reduction(+:...)§." }],
      runs: [
        { stdin: "10\n", threads: 4, expect: [X("promedio-mayores", 0)] },
        { stdin: "1500\n", threads: 4, expect: [X("promedio-mayores", 1)] },
        { stdin: "2000\n", threads: 8, expect: [X("promedio-mayores", 2)] },
      ],
    },
  },
  {
    slug: "inventario",
    title: "Inventario con auditoría consistente",
    topic: "sincronizacion",
    diff: "medio",
    source: "PD04 2026-II · Ej. 3",
    statement: md`
Un almacén tiene 10 000 unidades. Cada despacho hace §disponibles--§ y §despachados++§; el invariante es §disponibles + despachados == 10000§. Cada 50 despachos un auditor revisa el invariante y cuenta una **inconsistencia** si no se cumple.

Procesa los 10 000 despachos en paralelo de forma que el invariante se cumpla **siempre**, incluso para el auditor.

**Salida esperada:** §inconsistencias=0 disponibles=0 despachados=10000§.

Restricción: usa **un único** construct de exclusión mutua (§critical§) para el par de variables. Proteger cada variable por separado con §atomic§ **no** basta: otro hilo puede observar el estado entre las dos actualizaciones.`,
    starter: code`
#include <cstdio>
#include <omp.h>

int main() {
    int disponibles = 10000, despachados = 0, inconsistencias = 0;

    // TODO: sincroniza para que el invariante se cumpla siempre
    #pragma omp parallel for
    for (int i = 0; i < 10000; i++) {
        disponibles--;
        despachados++;
        if (i % 50 == 0) {
            if (disponibles + despachados != 10000) inconsistencias++;
        }
    }
    printf("inconsistencias=%d disponibles=%d despachados=%d\n", inconsistencias, disponibles, despachados);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <omp.h>

int main() {
    int disponibles = 10000, despachados = 0, inconsistencias = 0;

    #pragma omp parallel for
    for (int i = 0; i < 10000; i++) {
        #pragma omp critical(inventario)
        {
            disponibles--;
            despachados++;
        }
        if (i % 50 == 0) {
            #pragma omp critical(inventario)
            {
                if (disponibles + despachados != 10000) inconsistencias++;
            }
        }
    }
    printf("inconsistencias=%d disponibles=%d despachados=%d\n", inconsistencias, disponibles, despachados);
    return 0;
}
`,
    hints: [
      "Los dos decrementos/incrementos forman una **unidad lógica**: otro hilo no debe verla a medias.",
      "Usa §critical§ con el **mismo nombre** en el despacho y en la auditoría (así se excluyen mutuamente).",
    ],
    editorial: md`
## ¿Por qué no basta proteger las escrituras?
El auditor **lee** las dos variables. Si las escrituras son atómicas pero independientes, el auditor puede leer entre §disponibles--§ y §despachados++§ y ver una suma de 9999. La exclusión mutua debe cubrir **escrituras y lectura** con el mismo lock.

## Costo y alternativa
- Un critical por despacho serializa las 10 000 operaciones: $T_p\approx T_s+\text{overhead}$.
- Alternativa: **contadores privados** por hilo (§reduction§) que se combinan al final, y auditar sólo al final o bajo critical con poca frecuencia. En este problema la consistencia continua exige sincronizar; si basta consistencia *eventual*, la reducción elimina la contención.`,
    tests: {
      static: [PAR, { re: "omp\\s+critical", want: true, msg: "Usa §#pragma omp critical§." }, { re: "omp\\s+atomic", want: false, msg: "No uses §atomic§ separados: usa un solo §critical§ para el par de variables." }],
      runs: [
        { threads: 4, expect: [X("inventario", 0)] },
        { threads: 8, expect: [X("inventario", 1)] },
      ],
    },
  },
  {
    slug: "triangulo-roto",
    title: "Triángulo roto con Monte Carlo",
    topic: "datos",
    diff: "medio",
    source: "PD04 2025-II · Ej. 2",
    statement: md`
Dos puntos aleatorios $u,v\in[0,1]$ dividen un segmento en tres partes. Estima:
- $P(\text{triángulo})$: $\max(s_1,s_2,s_3)<0.5$.
- $P(\text{obtuso}\mid\text{triángulo})$: $2s_{max}^2>s_1^2+s_2^2+s_3^2$.

Con **8 000 000** pruebas por defecto. Cada hilo debe usar su **propia semilla** con §rand_r§ (no uses §rand()§: tiene estado global compartido).

**Salida:** §P(triangulo)=<..> P(obtuso)=<..>§ con 4 decimales.`,
    starter: code`
#include <cstdio>
#include <cstdlib>
#include <algorithm>
#include <omp.h>

int main() {
    const long n = 8000000;
    long tri = 0, obt = 0;
    unsigned seed = 12345;

    // TODO: paraleliza con semilla privada por hilo y reduction
    for (long k = 0; k < n; k++) {
        double u = rand_r(&seed) / (double)RAND_MAX;
        double v = rand_r(&seed) / (double)RAND_MAX;
        double s1 = std::min(u, v), s2 = std::abs(u - v), s3 = 1.0 - std::max(u, v);
        double m = std::max(s1, std::max(s2, s3));
        if (m < 0.5) {
            tri++;
            if (2 * m * m > s1 * s1 + s2 * s2 + s3 * s3) obt++;
        }
    }
    printf("P(triangulo)=%.4f P(obtuso)=%.4f\n", (double)tri / n, (double)obt / tri);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <cstdlib>
#include <cmath>
#include <algorithm>
#include <omp.h>

int main() {
    const long n = 8000000;
    long tri = 0, obt = 0;

    #pragma omp parallel reduction(+:tri, obt)
    {
        unsigned seed = 12345u + 7919u * omp_get_thread_num();
        #pragma omp for
        for (long k = 0; k < n; k++) {
            double u = rand_r(&seed) / (double)RAND_MAX;
            double v = rand_r(&seed) / (double)RAND_MAX;
            double s1 = std::min(u, v), s2 = std::fabs(u - v), s3 = 1.0 - std::max(u, v);
            double m = std::max(s1, std::max(s2, s3));
            if (m < 0.5) {
                tri++;
                if (2 * m * m > s1 * s1 + s2 * s2 + s3 * s3) obt++;
            }
        }
    }
    printf("P(triangulo)=%.4f P(obtuso)=%.4f\n", (double)tri / n, (double)obt / tri);
    return 0;
}
`,
    hints: [
      "Si todos los hilos comparten §seed§ hay carrera (y resultados correlacionados). Declara la semilla **dentro** de la región paralela.",
      "Inicializa la semilla con algo que dependa del hilo: §omp_get_thread_num()§.",
      "Usa §#pragma omp parallel reduction(+:tri,obt)§ y dentro §#pragma omp for§.",
    ],
    editorial: md`
## Resultados teóricos
$P(\text{triángulo}) = 1/4$. Condicionado a que haya triángulo, $P(\text{acutángulo}) = 4(3\ln 2-2)\approx 0.318$, así que $P(\text{obtuso}\mid\text{triángulo})\approx 0.682$.

## Ventajas del enfoque
- Las iteraciones son **independientes**: paralelismo perfecto (*embarrassingly parallel*).
- Semilla privada → sin carreras y sin sincronización dentro del bucle.
- Sólo hay overhead de creación de hilos y de la reducción $O(\log p)$.

## Complejidad
$T_s=\Theta(n)$, $T_p=\Theta(n/p+\log p)$, $E\approx 1$ si $n\gg p\log p$. El error estadístico decrece como $1/\sqrt n$ y **no** depende de $p$ (los resultados paralelo y secuencial coinciden *estadísticamente*, no bit a bit).`,
    tests: {
      static: [PAR, { re: "rand_r", want: true, msg: "Usa §rand_r(&seed)§." }, { re: "(?<![_\\w])rand\\s*\\(", want: false, msg: "No uses §rand()§: tiene estado global compartido." }, { re: "reduction", want: true, msg: "Cuenta con §reduction(+:tri,obt)§." }],
      runs: [
        {
          threads: 4,
          expect: [
            { kind: "num", re: "P\\(triangulo\\)=([0-9.]+)", value: 0.25, tol: 0.003 },
            { kind: "num", re: "P\\(obtuso\\)=([0-9.]+)", value: 0.6822, tol: 0.006 },
          ],
        },
        {
          threads: 2,
          expect: [
            { kind: "num", re: "P\\(triangulo\\)=([0-9.]+)", value: 0.25, tol: 0.003 },
            { kind: "num", re: "P\\(obtuso\\)=([0-9.]+)", value: 0.6822, tol: 0.006 },
          ],
        },
      ],
    },
  },
  {
    slug: "suma-prefijos",
    title: "Suma de prefijos en dos pasadas",
    topic: "sincronizacion",
    diff: "dificil",
    source: "U2 PRAM · adaptado a OpenMP",
    statement: md`
Dado $a_i=(7i+3)\bmod 11$ para $i<n$, calcula la **suma de prefijos inclusiva** $s_i=\sum_{k\le i}a_k$ en paralelo.

**Entrada:** $n$. **Salida:** §last=<s[n-1]> mid=<s[n/2]> check=<(suma de todos los s_i) mod 1000000007>§.

Un bucle con dependencia $s_i=s_{i-1}+a_i$ no se puede paralelizar directamente. Usa el algoritmo de **dos pasadas**:
1. Cada hilo calcula la suma de prefijos **local** de su bloque y guarda el total del bloque.
2. Un solo hilo calcula los desplazamientos (prefijos de los totales de bloque).
3. Cada hilo suma su desplazamiento a su bloque.`,
    starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    long n;
    scanf("%ld", &n);
    std::vector<long> a(n), s(n);
    for (long i = 0; i < n; i++) a[i] = (7 * i + 3) % 11;

    // TODO: implementa el algoritmo de dos pasadas con una región parallel
    //   - bloque [lo,hi) por hilo, prefijos locales
    //   - barrier + single para los desplazamientos
    //   - sumar el desplazamiento a cada bloque
    long acc = 0;
    for (long i = 0; i < n; i++) { acc += a[i]; s[i] = acc; }

    const long MOD = 1000000007;
    long check = 0;
    for (long i = 0; i < n; i++) check = (check + s[i]) % MOD;
    printf("last=%ld mid=%ld check=%ld\n", s[n - 1], s[n / 2], check);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    long n;
    scanf("%ld", &n);
    std::vector<long> a(n), s(n);
    for (long i = 0; i < n; i++) a[i] = (7 * i + 3) % 11;

    std::vector<long> part(129, 0);
    #pragma omp parallel num_threads(4)
    {
        int t = omp_get_thread_num(), T = omp_get_num_threads();
        long lo = n * t / T, hi = n * (t + 1) / T;
        long acc = 0;
        for (long i = lo; i < hi; i++) { acc += a[i]; s[i] = acc; }
        part[t + 1] = acc;
        #pragma omp barrier
        #pragma omp single
        for (int k = 1; k <= T; k++) part[k] += part[k - 1];
        long off = part[t];
        for (long i = lo; i < hi; i++) s[i] += off;
    }

    const long MOD = 1000000007;
    long check = 0;
    for (long i = 0; i < n; i++) check = (check + s[i]) % MOD;
    printf("last=%ld mid=%ld check=%ld\n", s[n - 1], s[n / 2], check);
    return 0;
}
`,
    hints: [
      "Reparte el arreglo en bloques contiguos con §lo = n*t/T§, §hi = n*(t+1)/T§ usando §omp_get_thread_num()§ y §omp_get_num_threads()§.",
      "Guarda el total de cada bloque en §part[t+1]§; luego un solo hilo hace el prefijo de §part§.",
      "Entre las dos fases necesitas una barrera: §single§ ya la incluye al final, pero antes de §single§ todos deben haber escrito su total (§barrier§).",
    ],
    editorial: md`
## Idea
$p$ bloques de tamaño $n/p$:
1. Pasada 1: prefijos locales — $O(n/p)$.
2. Prefijo de los $p$ totales (secuencial por un hilo) — $O(p)$.
3. Pasada 2: sumar el desplazamiento — $O(n/p)$.

## Complejidad
- $T_s=\Theta(n)$.
- Trabajo paralelo $2n$ (el doble), $T_p=\Theta(2n/p + p)$.
- Speedup $S\approx p/2$ para $n\gg p^2$: el algoritmo no es *work-optimal* constante-exacto pero sí $\Theta(n)$ de trabajo.
- Versión PRAM (Hillis-Steele / Blelloch) logra $T_\infty=O(\log n)$ con $n$ procesadores.`,
    tests: {
      static: [PAR, { re: "omp_get_thread_num", want: true, msg: "Calcula el bloque de cada hilo con §omp_get_thread_num()§." }, { re: "omp\\s+(barrier|single)", want: true, msg: "Necesitas §barrier§/§single§ entre las dos pasadas." }],
      runs: [
        { stdin: "10\n", threads: 4, expect: [X("suma-prefijos", 0)], label: "n pequeño" },
        { stdin: "1000003\n", threads: 4, expect: [X("suma-prefijos", 1)], label: "n no divisible" },
        { stdin: "8000000\n", threads: 4, expect: [X("suma-prefijos", 2)], label: "n grande" },
      ],
    },
  },
];
