import { md, code } from "@/lib/md";
import type { Problem } from "@/lib/types";
import { X, N } from "./problem-helpers";

const PAR = { re: "omp\\s+parallel", want: true, msg: "Falta una directiva §#pragma omp parallel§." };

export const problems3: Problem[] = [
  {
    slug: "calor-fuente",
    title: "Difusión de calor con fuente: versión optimizada",
    topic: "edp",
    diff: "medio",
    source: "PD05 2026-II · Ej. 1",
    statement: md`
Una barra de $n$ puntos empieza a 20 °C con extremos fijos a 20 °C. En cada paso (explícito, $r=0.25$, $\Delta t=0.1$):

$$u_i' = u_i + r\,(u_{i-1}-2u_i+u_{i+1}) + \Delta t\cdot s_i,\qquad s_i = F\,e^{-\frac{(i-c)^2}{2\sigma^2}},$$

con $c=\lfloor n/2\rfloor$ y $\sigma=n/50$. La fuente $s_i$ **no depende del tiempo**.

**Entrada:** §n pasos F§. **Salida:** §centro=<u[c]> suma=<Σu> max=<máx u>§ (centro y max con 6 decimales, suma con 4).

Paraleliza el paso de tiempo con §parallel for§ y dos buffers, y **optimiza**: calcula §s_i§ una sola vez, fuera del bucle de tiempo (el código inicial recalcula la exponencial en cada paso).`,
    starter: code`
#include <cstdio>
#include <cmath>
#include <vector>
#include <algorithm>
#include <omp.h>

int main() {
    int n, pasos;
    double F;
    scanf("%d %d %lf", &n, &pasos, &F);
    const double r = 0.25, dt = 0.1;
    const int c = n / 2;
    const double sigma = n / 50.0;
    std::vector<double> u(n, 20.0), v(n, 20.0);

    for (int t = 0; t < pasos; t++) {
        // TODO: paraleliza este bucle y evita recalcular la fuente en cada paso
        for (int i = 1; i < n - 1; i++) {
            double s = F * std::exp(-((double)(i - c) * (i - c)) / (2 * sigma * sigma));
            v[i] = u[i] + r * (u[i - 1] - 2 * u[i] + u[i + 1]) + dt * s;
        }
        v[0] = v[n - 1] = 20.0;
        std::swap(u, v);
    }

    double suma = 0, mx = u[0];
    for (int i = 0; i < n; i++) { suma += u[i]; mx = std::max(mx, u[i]); }
    printf("centro=%.6f suma=%.4f max=%.6f\n", u[c], suma, mx);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <cmath>
#include <vector>
#include <algorithm>
#include <omp.h>

int main() {
    int n, pasos;
    double F;
    scanf("%d %d %lf", &n, &pasos, &F);
    const double r = 0.25, dt = 0.1;
    const int c = n / 2;
    const double sigma = n / 50.0;
    std::vector<double> u(n, 20.0), v(n, 20.0), src(n, 0.0);

    #pragma omp parallel for
    for (int i = 0; i < n; i++)
        src[i] = dt * F * std::exp(-((double)(i - c) * (i - c)) / (2 * sigma * sigma));

    for (int t = 0; t < pasos; t++) {
        #pragma omp parallel for
        for (int i = 1; i < n - 1; i++)
            v[i] = u[i] + r * (u[i - 1] - 2 * u[i] + u[i + 1]) + src[i];
        v[0] = v[n - 1] = 20.0;
        std::swap(u, v);
    }

    double suma = 0, mx = u[0];
    for (int i = 0; i < n; i++) { suma += u[i]; mx = std::max(mx, u[i]); }
    printf("centro=%.6f suma=%.4f max=%.6f\n", u[c], suma, mx);
    return 0;
}
`,
    hints: [
      "Cada $u_i'$ depende sólo de $u$ (paso anterior): el bucle de $i$ es paralelo; el de tiempo **no** (cada paso necesita el anterior).",
      "Usa dos buffers §u§ y §v§ y §std::swap§ al final de cada paso.",
      "La fuente §s[i]§ es constante: guárdala en un arreglo antes del bucle de tiempo (y multiplícala ya por $\\Delta t$).",
    ],
    editorial: md`
## Optimización
El código no optimizado evalúa $e^{-(\cdot)}$ en cada punto y cada paso: $nT$ exponenciales. Precalcularlas cuesta $n$ (paralelizable) y reduce el costo por punto a **unas pocas sumas y productos**.

## Análisis de complejidad
Sea $c_e$ el costo de una exponencial y $c_s$ el de la actualización del stencil.

| Versión | $T_s$ | $T_p$ |
|---|---|---|
| No optimizada | $nT(c_s+c_e)$ | $\dfrac{nT(c_s+c_e)}{p}+T\log p$ |
| Optimizada | $nc_e + nTc_s$ | $\dfrac{nc_e+nTc_s}{p}+T\log p$ |

La mejora es $\dfrac{T(c_s+c_e)}{c_e+Tc_s}\xrightarrow{T\to\infty}1+\dfrac{c_e}{c_s}$. Con $c_e\approx 3c_s$ se obtiene $\approx 4\times$.

**Escalabilidad:** una barrera por paso ⇒ $T_o=pT\log p$ (+ ruptura de caché); para mantener $E$ constante $n=\Theta(p\log p)$.`,
    tests: {
      static: [PAR, { re: "omp\\s+parallel\\s+for|omp\\s+for", want: true, msg: "Paraleliza el bucle espacial con §parallel for§." }],
      runs: [
        { stdin: "200 100 10\n", threads: 4, expect: N("calor-fuente", 0, 1e-4) },
        { stdin: "20000 1500 10\n", threads: 4, expect: N("calor-fuente", 1, 1e-3) },
        { stdin: "5000 800 0\n", threads: 8, expect: N("calor-fuente", 2, 1e-4), label: "sin fuente (F = 0)" },
      ],
    },
  },
  {
    slug: "laplace-jacobi",
    title: "Jacobi 2D con residuo",
    topic: "edp",
    diff: "dificil",
    source: "U5.1 · EDP (Poisson/Laplace)",
    statement: md`
Resuelve $\nabla^2 u=0$ en una malla $n\times n$ con la fila superior a 100 y los demás bordes a 0 (interior inicial 0). Itera Jacobi exactamente §iters§ veces:

$$u^{new}_{ij}=\tfrac14\left(u_{i-1,j}+u_{i+1,j}+u_{i,j-1}+u_{i,j+1}\right),\ 1\le i,j\le n-2.$$

**Entrada:** §n iters§. **Salida:** §centro=<u[n/2][n/2]> res=<máx|u_new-u_old| de la última iteración>§ (6 decimales).

Paraleliza con §collapse(2)§ y §reduction(max:res)§ usando dos mallas (**doble buffer**).`,
    starter: code`
#include <cstdio>
#include <cmath>
#include <vector>
#include <algorithm>
#include <omp.h>

int main() {
    int n, iters;
    scanf("%d %d", &n, &iters);
    std::vector<double> a((size_t)n * n, 0.0), b((size_t)n * n, 0.0);
    for (int j = 0; j < n; j++) a[j] = b[j] = 100.0;   // fila superior
    double res = 0;

    for (int it = 0; it < iters; it++) {
        res = 0;
        // TODO: paraleliza con collapse(2) y reduction(max:res)
        for (int i = 1; i < n - 1; i++)
            for (int j = 1; j < n - 1; j++) {
                double nv = 0.25 * (a[(size_t)(i - 1) * n + j] + a[(size_t)(i + 1) * n + j] + a[(size_t)i * n + j - 1] + a[(size_t)i * n + j + 1]);
                res = std::max(res, std::fabs(nv - a[(size_t)i * n + j]));
                b[(size_t)i * n + j] = nv;
            }
        std::swap(a, b);
    }
    printf("centro=%.6f res=%.6f\n", a[(size_t)(n / 2) * n + n / 2], res);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <cmath>
#include <vector>
#include <algorithm>
#include <omp.h>

int main() {
    int n, iters;
    scanf("%d %d", &n, &iters);
    std::vector<double> a((size_t)n * n, 0.0), b((size_t)n * n, 0.0);
    for (int j = 0; j < n; j++) a[j] = b[j] = 100.0;
    double res = 0;

    for (int it = 0; it < iters; it++) {
        res = 0;
        #pragma omp parallel for collapse(2) reduction(max:res)
        for (int i = 1; i < n - 1; i++)
            for (int j = 1; j < n - 1; j++) {
                double nv = 0.25 * (a[(size_t)(i - 1) * n + j] + a[(size_t)(i + 1) * n + j] + a[(size_t)i * n + j - 1] + a[(size_t)i * n + j + 1]);
                res = std::max(res, std::fabs(nv - a[(size_t)i * n + j]));
                b[(size_t)i * n + j] = nv;
            }
        std::swap(a, b);
    }
    printf("centro=%.6f res=%.6f\n", a[(size_t)(n / 2) * n + n / 2], res);
    return 0;
}
`,
    hints: [
      "Cada celda nueva depende sólo de la malla **anterior**: las $(n-2)^2$ actualizaciones son independientes.",
      "El residuo es un máximo global: §reduction(max:res)§ lo combina sin carreras.",
      "Con §collapse(2)§ repartes $(n-2)^2$ iteraciones, no sólo $n-2$ filas.",
    ],
    editorial: md`
## Idea
Jacobi es un **stencil de 5 puntos** con doble buffer: paralelismo de datos perfecto en cada iteración, y una barrera implícita entre iteraciones. El residuo se obtiene con una reducción de máximo.

## Complejidad
- $T_s=\Theta(n^2 I)$ ($I$ iteraciones).
- $T_p=\Theta\!\left(\dfrac{n^2I}{p}+I\log p\right)$ en memoria compartida.
- En memoria distribuida (bloques $\sqrt{p}\times\sqrt{p}$): comunicación por iteración $O(n/\sqrt p)$ (halos) → $T_p=\Theta\!\left(\dfrac{n^2I}{p}+I\left(\alpha+\beta\dfrac{n}{\sqrt p}\right)\right)$.
- **Gauss-Seidel** converge ≈2× más rápido pero tiene dependencias: necesita *red-black* para paralelizar.`,
    tests: {
      static: [PAR, { re: "collapse", want: true, msg: "Usa §collapse(2)§." }, { re: "reduction\\s*\\(\\s*max", want: true, msg: "Usa §reduction(max:res)§." }],
      runs: [
        { stdin: "16 20\n", threads: 4, expect: N("laplace-jacobi", 0, 1e-6) },
        { stdin: "64 600\n", threads: 4, expect: N("laplace-jacobi", 1, 1e-5) },
        { stdin: "128 1500\n", threads: 4, expect: N("laplace-jacobi", 2, 1e-5) },
      ],
    },
  },
  {
    slug: "ranking-sort",
    title: "Ordenamiento por ranking",
    topic: "ordenamiento",
    diff: "medio",
    source: "U5.2 · ordenamiento / PD05 2024-II",
    statement: md`
Dado $a_i=(7919\,i+13)\bmod 10007$ ($i<n$, con **repetidos**), ordénalo con *ranking sort*: el rango de $a_i$ es la cantidad de $j$ con $a_j<a_i$ más la cantidad de $j<i$ con $a_j=a_i$ (desempate por índice, así los rangos son únicos). Coloca $a_i$ en §out[rango]§.

**Entrada:** $n$. **Salida:** §min=<..> med=<out[n/2]> max=<..> check=<Σ out[i]*(i+1) mod 1000000007>§.`,
    starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    int n;
    scanf("%d", &n);
    std::vector<long> a(n), out(n);
    for (int i = 0; i < n; i++) a[i] = (7919L * i + 13) % 10007;

    // TODO: paraleliza el cálculo de rangos (O(n^2))
    for (int i = 0; i < n; i++) {
        int rango = 0;
        for (int j = 0; j < n; j++)
            if (a[j] < a[i] || (a[j] == a[i] && j < i)) rango++;
        out[rango] = a[i];
    }

    const long MOD = 1000000007;
    long check = 0;
    for (int i = 0; i < n; i++) check = (check + out[i] % MOD * (i + 1)) % MOD;
    printf("min=%ld med=%ld max=%ld check=%ld\n", out[0], out[n / 2], out[n - 1], check);
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
    std::vector<long> a(n), out(n);
    for (int i = 0; i < n; i++) a[i] = (7919L * i + 13) % 10007;

    #pragma omp parallel for schedule(static)
    for (int i = 0; i < n; i++) {
        int rango = 0;
        for (int j = 0; j < n; j++)
            if (a[j] < a[i] || (a[j] == a[i] && j < i)) rango++;
        out[rango] = a[i];
    }

    const long MOD = 1000000007;
    long check = 0;
    for (int i = 0; i < n; i++) check = (check + out[i] % MOD * (i + 1)) % MOD;
    printf("min=%ld med=%ld max=%ld check=%ld\n", out[0], out[n / 2], out[n - 1], check);
    return 0;
}
`,
    hints: [
      "Cada elemento calcula su rango leyendo todo el arreglo: ¿hay escrituras compartidas? Cada §out[rango]§ es una posición **distinta** gracias al desempate.",
      "Paraleliza el bucle externo; §rango§ es local.",
    ],
    editorial: md`
## Idea
Todos los rangos se calculan en paralelo; como el desempate por índice hace que los rangos sean una **permutación**, las escrituras §out[rango]§ no colisionan.

## Complejidad
- $T_s=\Theta(n^2)$ (peor que $n\log n$).
- Con $p$ hilos: $T_p=\Theta(n^2/p)$. Speedup $\approx p$ pero **relativo al mejor secuencial** $n\log n$ es $S=\dfrac{n\log n}{n^2/p}=\dfrac{p\log n}{n}$, que es $<1$ para $p<n/\log n$.
- PRAM con $n^2$ procesadores: rangos en $O(1)$ (CRCW) / $O(\log n)$ (CREW).
- **Versión distribuida** (PD05 2024-II): $T_p=t_c\frac{n}{\sqrt p}\log n+\beta\log p\,\frac{n}{\sqrt p}+\alpha\log p$. La condición de isoeficiencia tiene dos términos, $t_c\log n\propto\beta\sqrt p\log p$ y $t_c\,n\log n\propto\alpha p\log p$; el primero domina, así que depende más del ancho de banda $\beta$ que de la latencia $\alpha$.`,
    tests: {
      static: [PAR, { re: "omp\\s+parallel\\s+for|omp\\s+for", want: true, msg: "Usa §parallel for§ en el bucle de rangos." }],
      runs: [
        { stdin: "20\n", threads: 4, expect: [X("ranking-sort", 0)] },
        { stdin: "16000\n", threads: 4, expect: [X("ranking-sort", 1)] },
      ],
    },
  },
  {
    slug: "primer-indice",
    title: "Primer índice de un valor",
    topic: "busqueda",
    diff: "medio",
    source: "U5.3 · búsqueda lineal",
    statement: md`
Sea $a_i=(2654435761\,i)\bmod 1000003$. Dado $n$ y un valor $x$, encuentra el **menor índice** $i<n$ con $a_i=x$, o $-1$ si no existe.

**Entrada:** §n x§. **Salida:** §indice=<i>§.

En un §parallel for§ no puedes usar §break§; en su lugar combina los hallazgos de cada hilo con §reduction(min:...)§ (el mínimo índice).`,
    starter: code`
#include <cstdio>
#include <climits>
#include <omp.h>

int main() {
    long n, x;
    scanf("%ld %ld", &n, &x);
    long best = LONG_MAX;

    // TODO: paraleliza la búsqueda; el resultado debe ser el MENOR índice
    for (long i = 0; i < n; i++) {
        unsigned long long a = (2654435761ULL * (unsigned long long)i) % 1000003ULL;
        if ((long)a == x) { best = i; break; }
    }
    printf("indice=%ld\n", best == LONG_MAX ? -1L : best);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <climits>
#include <omp.h>

int main() {
    long n, x;
    scanf("%ld %ld", &n, &x);
    long best = LONG_MAX;

    #pragma omp parallel for reduction(min:best)
    for (long i = 0; i < n; i++) {
        unsigned long long a = (2654435761ULL * (unsigned long long)i) % 1000003ULL;
        if ((long)a == x && i < best) best = i;
    }
    printf("indice=%ld\n", best == LONG_MAX ? -1L : best);
    return 0;
}
`,
    hints: [
      "Cada hilo tiene su propio §best§ parcial; al final se combinan con §min§.",
      "No puedes salir del bucle con §break§ en un §parallel for§ (sin §cancel§): déjalo recorrer todo.",
    ],
    editorial: md`
## Idea
Reducción de mínimo sobre los índices encontrados. Resultado idéntico al secuencial (siempre el menor índice) aunque los hilos exploren en cualquier orden.

## Complejidad
- $T_s=\Theta(n)$ en el peor caso, pero **depende de dónde esté** el valor (si está al inicio, el secuencial con §break§ es casi $O(1)$).
- Sin parada temprana: $T_p=\Theta(n/p+\log p)$ **siempre** recorre todo.
- Esto produce **anomalías de aceleración**: el speedup medido puede ser $<1$ (el secuencial paró pronto) o $>p$ (superlineal).
- Con §cancel§/bandera atómica se recupera la parada temprana a costa de consultar la bandera.`,
    tests: {
      static: [PAR, { re: "reduction\\s*\\(\\s*min|critical|atomic", want: true, msg: "Combina los hallazgos con §reduction(min:..)§ (o critical/atomic)." }, { re: "\\bbreak\\b", want: false, msg: "No uses §break§ dentro del §parallel for§ (no está permitido)." }],
      runs: [
        { stdin: "100 828518\n", threads: 4, expect: [X("primer-indice", 0)] },
        { stdin: "6000000 123456\n", threads: 4, expect: [X("primer-indice", 1)] },
        { stdin: "900000 2000000\n", threads: 4, expect: [X("primer-indice", 2)], label: "valor inexistente" },
        { stdin: "6000000 0\n", threads: 8, expect: [X("primer-indice", 3)], label: "primer elemento" },
      ],
    },
  },
  {
    slug: "bfs-niveles",
    title: "BFS paralelo por niveles",
    topic: "grafos",
    diff: "dificil",
    source: "U5.3-U5.4 · recorrido de grafos",
    statement: md`
Un grafo dirigido implícito de $n$ nodos tiene aristas $u\to(2u+1)\bmod n$, $u\to(3u+2)\bmod n$ y $u\to(u+7)\bmod n$. Haz un BFS desde el nodo 0.

**Entrada:** $n$. **Salida:** §niveles=<cantidad de niveles> alcanzados=<nodos alcanzados> suma_dist=<suma de distancias>§ (el nodo 0 es el nivel 0).

Paraleliza la expansión de cada **frontera**. Dos hilos pueden descubrir el mismo vecino a la vez: **reclama** cada nodo con §atomic capture§ (el primero lo marca y lo agrega a la siguiente frontera) y reserva su posición en la frontera también con §atomic capture§.`,
    starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>

int main() {
    long n;
    scanf("%ld", &n);
    std::vector<int> vis(n, 0), dist(n, -1);
    std::vector<long> cur, nxt(n);
    cur.push_back(0);
    vis[0] = 1;
    dist[0] = 0;
    int level = 0;

    while (!cur.empty()) {
        long cnt = 0;
        // TODO: paraleliza la expansión de la frontera (atomic capture para reclamar y para indexar)
        for (size_t k = 0; k < cur.size(); k++) {
            long u = cur[k];
            long nb[3] = {(2 * u + 1) % n, (3 * u + 2) % n, (u + 7) % n};
            for (int e = 0; e < 3; e++) {
                long v = nb[e];
                if (!vis[v]) {
                    vis[v] = 1;
                    dist[v] = level + 1;
                    nxt[cnt++] = v;
                }
            }
        }
        cur.assign(nxt.begin(), nxt.begin() + cnt);
        if (cnt) level++;
    }

    long alc = 0, suma = 0;
    for (long i = 0; i < n; i++) if (dist[i] >= 0) { alc++; suma += dist[i]; }
    printf("niveles=%d alcanzados=%ld suma_dist=%ld\n", level + 1, alc, suma);
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
    std::vector<int> vis(n, 0), dist(n, -1);
    std::vector<long> cur, nxt(n);
    cur.push_back(0);
    vis[0] = 1;
    dist[0] = 0;
    int level = 0;

    while (!cur.empty()) {
        long cnt = 0;
        #pragma omp parallel for schedule(dynamic, 64)
        for (size_t k = 0; k < cur.size(); k++) {
            long u = cur[k];
            long nb[3] = {(2 * u + 1) % n, (3 * u + 2) % n, (u + 7) % n};
            for (int e = 0; e < 3; e++) {
                long v = nb[e];
                int old;
                #pragma omp atomic capture
                { old = vis[v]; vis[v] = 1; }
                if (!old) {
                    dist[v] = level + 1;
                    long pos;
                    #pragma omp atomic capture
                    pos = cnt++;
                    nxt[pos] = v;
                }
            }
        }
        cur.assign(nxt.begin(), nxt.begin() + cnt);
        if (cnt) level++;
    }

    long alc = 0, suma = 0;
    for (long i = 0; i < n; i++) if (dist[i] >= 0) { alc++; suma += dist[i]; }
    printf("niveles=%d alcanzados=%ld suma_dist=%ld\n", level + 1, alc, suma);
    return 0;
}
`,
    hints: [
      "La carrera: dos hilos ven §vis[v]==0§ a la vez y ambos agregan §v§ a la frontera.",
      "Haz *leer-y-marcar* de forma indivisible: §#pragma omp atomic capture { old = vis[v]; vis[v] = 1; }§. Sólo el hilo con §old==0§ continúa.",
      "Para añadir a la siguiente frontera necesitas otro índice único: §#pragma omp atomic capture pos = cnt++;§.",
    ],
    editorial: md`
## Idea (BFS *level-synchronous*)
1. Frontera actual $F_\ell$ en un arreglo.
2. Cada hilo expande un subconjunto de $F_\ell$; **reclama** vecinos con *compare-and-swap* (aquí §atomic capture§).
3. Barrera implícita al terminar el §for§: la siguiente frontera está completa.

Las distancias son únicas aunque el **orden** de la frontera sea no determinista (por eso la salida usa sumas y conteos).

## Complejidad
- $T_s=\Theta(V+E)$.
- Con $D$ niveles: $T_p=\Theta\!\left(\dfrac{V+E}{p}+D\log p\right)$ + contención atómica.
- $T_\infty=\Theta(D\log V)$: el **diámetro** limita el paralelismo (grafos de diámetro grande escalan mal).`,
    tests: {
      static: [PAR, { re: "atomic\\s+capture|__sync|__atomic|critical", want: true, msg: "Reclama los nodos con §atomic capture§ (o un CAS/critical)." }],
      runs: [
        { stdin: "50\n", threads: 4, expect: [X("bfs-niveles", 0)] },
        { stdin: "2000000\n", threads: 4, expect: [X("bfs-niveles", 1)] },
        { stdin: "1500001\n", threads: 8, expect: [X("bfs-niveles", 2)] },
      ],
    },
  },
  {
    slug: "dijkstra",
    title: "Dijkstra denso en paralelo",
    topic: "grafos",
    diff: "dificil",
    source: "U5.4 · grafos",
    statement: md`
Grafo dirigido completo de $n$ nodos con peso $w(i,j)=((31i+17j)\bmod 97)+1$ ($i\ne j$). Calcula las distancias mínimas desde el nodo 0 con Dijkstra $O(n^2)$ (sin heap).

**Entrada:** $n$. **Salida:** §suma=<Σ dist> max=<máx dist>§.

Paraleliza las dos fases de cada iteración: (1) elegir el vértice no finalizado de menor distancia (**reducción de mínimo**) y (2) relajar las distancias de los demás (**parallel for**).`,
    starter: code`
#include <cstdio>
#include <vector>
#include <omp.h>

static inline long w(long i, long j) { return ((31 * i + 17 * j) % 97) + 1; }

int main() {
    int n;
    scanf("%d", &n);
    const long INF = 1L << 60;
    std::vector<long> dist(n, INF);
    std::vector<char> done(n, 0);
    dist[0] = 0;

    for (int it = 0; it < n; it++) {
        long bd = INF;
        int bv = -1;
        // TODO fase 1: mínimo (reducción) — cada hilo guarda su mejor (dist, vértice) y se combinan
        for (int v = 0; v < n; v++)
            if (!done[v] && dist[v] < bd) { bd = dist[v]; bv = v; }
        if (bv < 0) break;
        done[bv] = 1;
        // TODO fase 2: relajación en paralelo
        for (int v = 0; v < n; v++)
            if (!done[v] && v != bv) {
                long nd = bd + w(bv, v);
                if (nd < dist[v]) dist[v] = nd;
            }
    }

    long suma = 0, mx = 0;
    for (int i = 0; i < n; i++) { suma += dist[i]; if (dist[i] > mx) mx = dist[i]; }
    printf("suma=%ld max=%ld\n", suma, mx);
    return 0;
}
`,
    solution: code`
#include <cstdio>
#include <vector>
#include <omp.h>

static inline long w(long i, long j) { return ((31 * i + 17 * j) % 97) + 1; }

int main() {
    int n;
    scanf("%d", &n);
    const long INF = 1L << 60;
    std::vector<long> dist(n, INF);
    std::vector<char> done(n, 0);
    dist[0] = 0;

    for (int it = 0; it < n; it++) {
        long bd = INF;
        int bv = -1;
        #pragma omp parallel
        {
            long ld = INF;
            int lv = -1;
            #pragma omp for nowait
            for (int v = 0; v < n; v++)
                if (!done[v] && dist[v] < ld) { ld = dist[v]; lv = v; }
            #pragma omp critical
            {
                if (lv >= 0 && (ld < bd || (ld == bd && lv < bv))) { bd = ld; bv = lv; }
            }
        }
        if (bv < 0) break;
        done[bv] = 1;
        #pragma omp parallel for
        for (int v = 0; v < n; v++)
            if (!done[v] && v != bv) {
                long nd = bd + w(bv, v);
                if (nd < dist[v]) dist[v] = nd;
            }
    }

    long suma = 0, mx = 0;
    for (int i = 0; i < n; i++) { suma += dist[i]; if (dist[i] > mx) mx = dist[i]; }
    printf("suma=%ld max=%ld\n", suma, mx);
    return 0;
}
`,
    hints: [
      "Fase 1: cada hilo busca su mínimo local (§nowait§) y luego los combinas bajo un §critical§ breve (sólo $p$ entradas).",
      "Fase 2: cada §dist[v]§ lo escribe un solo hilo: es un §parallel for§ sin sincronización.",
      "Empata siempre por menor índice para que el resultado no dependa del orden de los hilos.",
    ],
    editorial: md`
## Idea
Dijkstra denso tiene $n$ iteraciones **secuenciales** (el siguiente vértice depende de la relajación previa). Dentro de cada iteración hay dos fases paralelas, de modo que hay $2n$ barreras.

## Complejidad
- $T_s=\Theta(n^2)$.
- $T_p=\Theta\!\left(\dfrac{n^2}{p}+n\log p\right)$.
- $T_o=pT_p-T_s=\Theta(pn\log p)$. Isoeficiencia: $n^2=K\,pn\log p\Rightarrow n=\Theta(p\log p)$, o sea $W=n^2=\Theta(p^2\log^2p)$.
- Prim tiene exactamente la misma estructura y costo (cambia la regla de relajación).`,
    tests: {
      static: [PAR],
      runs: [
        { stdin: "10\n", threads: 4, expect: [X("dijkstra", 0)] },
        { stdin: "2500\n", threads: 4, expect: [X("dijkstra", 1)] },
      ],
    },
  },
];
