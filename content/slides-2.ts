import type { Deck } from "@/lib/types";
import { md, code } from "@/lib/md";

// Resúmenes propios de la Unidad 5 (algoritmos paralelos). Fórmulas en LaTeX (KaTeX).

export const decks2: Deck[] = [
  {
    id: "u5-1",
    unit: "U5.1",
    title: "Algoritmos para EDP: Laplace, Poisson, calor y onda",
    pdf: "U5.1 Algoritmos-EDP",
    intro: md`Las ecuaciones diferenciales parciales se resuelven discretizando el dominio en una malla. Cada punto depende de sus vecinos, lo que da un patrón de **stencil** ideal para paralelizar con **descomposición de dominio** y **halos**.`,
    slides: [
      {
        title: "Qué es una EDP y para qué sirve",
        note: "Diapos 4–5",
        bullets: [
          md`Una EDP relaciona una función con sus **derivadas parciales**; modela cambios continuos en física, fluidos, biología, química…`,
          md`Ejemplos: ecuaciones de calor, difusión y onda. La incógnita es una función u(x, y) (o u(x, t)).`,
        ],
        formula: String.raw`\frac{\partial u}{\partial x}(x,y)+\frac{\partial u}{\partial y}(x,y)=0`,
      },
      {
        title: "Diferencias finitas",
        note: "Diapo 6",
        bullets: [
          md`Se reemplaza la derivada por una **diferencia entre puntos vecinos** de la malla; la justificación es la **serie de Taylor** alrededor de x₀.`,
          md`La primera derivada usa la diferencia **centrada** (error O(δ²)); la segunda derivada usa tres puntos.`,
        ],
        formula: String.raw`u'(x_0)\approx\frac{u(x_0+\delta)-u(x_0-\delta)}{2\delta},\qquad u''(x_0)\approx\frac{u(x_0+\delta)-2u(x_0)+u(x_0-\delta)}{\delta^2}`,
      },
      {
        title: "Tipos de EDP",
        note: "Diapos 7–8",
        bullets: [
          md`**Elípticas** (Laplace, Poisson): estado de **equilibrio**, sin tiempo; se resuelve el sistema completo.`,
          md`**Parabólicas** (calor/difusión): evolucionan en el tiempo y se suavizan.`,
          md`**Hiperbólicas** (onda): evolucionan en el tiempo y propagan perturbaciones a velocidad finita c.`,
        ],
        formula: String.raw`\underbrace{u_{xx}+u_{yy}=S}_{\text{elíptica}}\quad \underbrace{u_t=D\,u_{xx}}_{\text{parabólica}}\quad \underbrace{u_{tt}=c^2u_{xx}}_{\text{hiperbólica}}`,
      },
      {
        title: "Laplace: discretización",
        note: "Diapos 9–11",
        bullets: [
          md`Modelo de flujo de calor y viscosidad; u es la variable (p. ej. temperatura) y x, y las coordenadas.`,
          md`Con malla regular de paso h y descartando el término de error, la solución en cada punto interior es el **promedio de sus 4 vecinos**.`,
          md`Se itera: u nueva = u vieja + Δu. En código es un doble bucle con **dos matrices** (§u§ y §uold§): método de **Jacobi**.`,
        ],
        formula: String.raw`u^{n+1}_{i,j}=\frac{u^n_{i+1,j}+u^n_{i-1,j}+u^n_{i,j+1}+u^n_{i,j-1}}{4}`,
        code: code`
for (i = 1; i <= NR; i++)
  for (j = 1; j <= NC; j++)
    u[i][j] = 0.25 * (uold[i-1][j] + uold[i+1][j]
                    + uold[i][j-1] + uold[i][j+1]);
`,
      },
      {
        title: "Condiciones de frontera",
        note: "Diapos 12–13 y 23–24",
        bullets: [
          md`Se fijan los valores en el borde: p. ej. u(0,y)=0, u(L,y)=u_max·sin(πy/L), u(x,0)=u(x,L)=0, y u⁰=0 en el interior.`,
          md`Pueden representar voltajes (internos o externos) o temperaturas: 100° en lados opuestos y 0° en los otros dos, o varias fuentes de calor con paredes a 0°.`,
          md`Los vecinos que caen en la frontera son **valores conocidos** que pasan al lado derecho del sistema.`,
        ],
      },
      {
        title: "Laplace como sistema lineal",
        note: "Diapos 14–18",
        bullets: [
          md`Cada punto interior aporta una ecuación: −4u(i,j) + los 4 vecinos = 0.`,
          md`Si un vecino está en la frontera, su valor conocido se mueve al otro lado (p. ej. −4u₂,₄ + u₃,₄ + u₂,₃ + u₂,₅ = u₁,₄).`,
          md`Resultado: **n ecuaciones con n incógnitas** (una por punto interior); los métodos iterativos evitan resolver el sistema denso.`,
        ],
        formula: String.raw`-4u_{i,j}+u_{i-1,j}+u_{i+1,j}+u_{i,j-1}+u_{i,j+1}=0`,
      },
      {
        title: "Jacobi en 1D: secuencial y con MPI",
        note: "Diapos 19–20",
        bullets: [
          md`Secuencial: mientras el error sea mayor que la tolerancia, copia §u_old§ y actualiza cada punto interior con el promedio de sus dos vecinos; el error es el **máximo** cambio.`,
          md`MPI: §Scatter§ reparte los trozos (con **2 celdas fantasma** por proceso). En cada iteración se intercambian los bordes con el vecino izquierdo y derecho (§Send/Recv§), se calcula y se usa §Allreduce(MAX)§ para el error global. Al final §Gather§.`,
          md`Es el esquema de **halos 1D**: comunicación O(1) por proceso por iteración.`,
        ],
        code: code`
while (error > tol && iter < max_iter) {
  u_old = u;  error = 0.0;
  for (int i = 1; i < N - 1; ++i) {
    u[i]  = 0.5 * (u_old[i-1] + u_old[i+1]);
    error = std::max(error, std::abs(u[i] - u_old[i]));
  }
  iter++;
}
`,
      },
      {
        title: "Poisson: la fuente S",
        note: "Diapos 25–26",
        bullets: [
          md`Poisson es Laplace con **fuente** S(x,y) (masa, carga o calor). Describe potenciales (gravedad, electrostática) en equilibrio; es de tipo elíptico.`,
          md`Condiciones de frontera: **Dirichlet** (valor u = f) o **Neumann** (derivada normal = g).`,
          md`Discretizado da un sistema lineal con N_x·N_y incógnitas; en 3D con malla 1000³ llegan a 10⁹ ecuaciones.`,
        ],
        formula: String.raw`\frac{1}{h^2}\left(u_{i+1,j}+u_{i-1,j}+u_{i,j+1}+u_{i,j-1}-4u_{i,j}\right)=S_{i,j}`,
      },
      {
        title: "Jacobi vs Gauss–Seidel y complejidad",
        note: "Diapos 27–28",
        bullets: [
          md`**Jacobi**: la iteración k+1 usa solo valores de la iteración k (guarda una copia): **totalmente paralelizable**.`,
          md`**Gauss–Seidel**: usa el valor nuevo apenas está disponible (misma pasada): converge más rápido, pero tiene **dependencias** (hay que hacerlo en tablero rojo-negro para paralelizar).`,
          md`Se repite hasta que diff = max|u^{k+1} − u^k| ≤ ε. Complejidad **T(n) = k·m·N²** (k iteraciones, m operaciones por nodo, N puntos por dimensión).`,
        ],
        formula: String.raw`u^{k+1}_{i,j}=\tfrac14\left(u^k_{i+1,j}+u^k_{i-1,j}+u^k_{i,j+1}+u^k_{i,j-1}-h^2S_{i,j}\right)`,
      },
      {
        title: "Descomposición de dominio",
        note: "Diapos 29–32",
        bullets: [
          md`Se divide la malla en **subdominios** (uno por proceso). Cada proceso necesita los **bordes** de sus vecinos: halos.`,
          md`Dominios no rectangulares: se pueden encerrar en rectángulos (más memoria) o descomponer con cuidado; se necesita **igual número de puntos por proceso** para el balance de carga.`,
          md`Aumentar los puntos de malla por sí solo es poco eficiente; lo bueno es **subdominios compactos** (poca superficie respecto al volumen).`,
          md`Ejemplo real: descomposición en el código PIC **Smilei**.`,
        ],
      },
      {
        title: "Parabólica en paralelo",
        note: "Diapos 33–36",
        bullets: [
          md`La solución es u(x,t): se paraleliza **el espacio**; **el tiempo es secuencial** (cada paso necesita el anterior).`,
          md`Cada proceso toma uno (o pocos) subdominios con **igual trabajo** y se minimiza la comunicación nodo a nodo (§MPI_Send/Recv§).`,
          md`Las derivadas en los bordes del subdominio necesitan puntos del vecino: **intercambio P2P** en 1D (2 vecinos) y en 2D (4 vecinos).`,
        ],
        formula: String.raw`u_t=-D\,u_{xx}\ ;\qquad u_x\approx\frac{u_{i+1}-u_{i-1}}{2h}`,
      },
      {
        title: "Hiperbólica: ecuación de onda",
        note: "Diapos 37–38",
        bullets: [
          md`Una cuerda oscilante evoluciona en el tiempo con u_tt = c² u_xx.`,
          md`Al discretizar se despeja el **paso futuro** a partir del presente y del **paso pasado** (esquema de tres niveles temporales).`,
          md`Paralelización igual que la parabólica: dominio espacial dividido y halos en cada paso; el tiempo avanza secuencialmente.`,
        ],
        formula: String.raw`u(x,t{+}1)=2u(x,t)-u(x,t{-}1)+\frac{c^2\delta t^2}{\delta x^2}\left(u(x{+}1,t)-2u(x,t)+u(x{-}1,t)\right)`,
      },
    ],
    links: [
      { label: "Lección: Ecuación del calor", href: "/aprende/edp-calor" },
      { label: "Reto: Laplace con Jacobi", href: "/problemas/laplace-jacobi" },
      { label: "Reto: Calor con fuente", href: "/problemas/calor-fuente" },
      { label: "Resuelto: Calor optimizado", href: "/resueltos/calor-optimizado" },
      { label: "Teoría: EDP", href: "/teoria/edp" },
    ],
  },
  {
    id: "u5-2",
    unit: "U5.2",
    title: "Algoritmos de ordenamiento paralelo",
    pdf: "U5.2 Algoritmos-ordenamiento",
    intro: md`Del ordenamiento secuencial al paralelo: modelo con p = n y p < n, compare-exchange, ranking, quicksort paralelo de Sanders, mergesort, odd-even de Batcher y ordenamiento bitónico, con su **span** y su **Tp** (Brent).`,
    slides: [
      {
        title: "Ordenamiento secuencial: complejidades",
        note: "Diapos 5–7",
        bullets: [
          md`**Bubble**: O(n²) promedio y peor, O(n) mejor, estable. **Selection**: O(n²) siempre, inestable. **Insertion**: O(n²), O(n) mejor, estable.`,
          md`**Heapsort** O(n log n) en todos los casos, inestable. **Mergesort** O(n log n) siempre, estable. **Quicksort** O(n log n) promedio y mejor, O(n²) peor, inestable.`,
          md`Cota inferior por comparaciones: Ω(n log n).`,
        ],
      },
      {
        title: "Ordenamiento paralelo con p = n",
        note: "Diapo 8",
        bullets: [
          md`El mejor secuencial por comparaciones cuesta O(n log n).`,
          md`Con n procesos y un **merge óptimo** se resuelve en O(log n)·T_merge, con T_merge a su vez logarítmico: del orden de log² n.`,
          md`Se asume modelo PRAM de comparaciones; con comunicación real hay que sumar T_comm.`,
        ],
        formula: String.raw`T_{seq}=T_{comp}\,n\log n+O(n)`,
      },
      {
        title: "Compare-exchange",
        note: "Diapos 9–10",
        bullets: [
          md`Operación básica: comparar dos valores y dejarlos en orden (mínimo a un lado, máximo al otro).`,
          md`**Caso 1** (un envío): P₁ envía A a P₂; P₂ compara con B y devuelve el mínimo a P₁.`,
          md`**Caso 2** (intercambio mutuo en paralelo): P₁ envía A, P₂ envía B; luego P₁ se queda con min(A,B) y P₂ con max(A,B). Así **ambos** trabajan a la vez.`,
        ],
      },
      {
        title: "Caso p < n",
        note: "Diapos 11–13",
        bullets: [
          md`n elementos y p procesos: n/p por proceso. Primero se ordena **localmente** (n/p log(n/p)).`,
          md`Después, la operación básica es **merge-split**: dos procesos se intercambian sus bloques, mezclan y uno conserva la mitad inferior y el otro la superior.`,
          md`Tiempo = cómputo local + comunicación.`,
        ],
        formula: String.raw`T_{par}=O\!\left(\frac{n}{p}\log\frac{n}{p}\right)+T_{comm}`,
      },
      {
        title: "Ranking en paralelo: algoritmo 1",
        note: "Diapo 14",
        bullets: [
          md`Método **rápido pero poco eficiente**: n² procesos comparan todos los pares (i, j) y guardan el booleano A[i] ≥ A[j].`,
          md`El **rango** de i es la suma de la fila i; con ese rango, A[i] va a la posición M[i].`,
          md`T∞ = O(log n) (la suma por reducción) pero el **trabajo es O(n²)**, mucho más que el secuencial → eficiencia baja.`,
        ],
        formula: String.raw`M[i]=\sum_{j=1}^{n}[A[i]\ge A[j]],\quad T_\infty=O(\log n),\quad W=O(n^2)`,
      },
      {
        title: "Ranking en paralelo: algoritmo 2",
        note: "Diapos 15–17",
        bullets: [
          md`p procesos en una malla **√p × √p**, cada uno con n/√p elementos.`,
          md`Pasos: **gossip/broadcast** del input por columna y por fila → ordenar localmente → calcular el ranking de los elementos de la fila respecto a los de la columna → **reduce** por fila.`,
          md`Con p = 1024, α = 10⁻⁵ s, β = 10⁻⁸ s, T_comp = 10⁻⁸ s y n/p = 32 el término de comunicación y el de cómputo salen del orden de décimas de milisegundo.`,
        ],
        formula: String.raw`T_p(n,p)=O\!\left(\log\sqrt p\,\big(\alpha+\beta\tfrac{n}{\sqrt p}\big)+T_{comp}\tfrac{n\log n}{\sqrt p}\right)`,
      },
      {
        title: "Quicksort secuencial",
        note: "Diapos 18–19",
        bullets: [
          md`Divide y vencerás: elige un **pivote**, reparte en menores y mayores, y ordena recursivamente cada lado.`,
          md`Promedio y mejor caso O(n log n); peor caso O(n²) (pivote siempre extremo).`,
        ],
        code: code`
QS(d[], p):
  if p == 1: return
  k = selecciona_pivot(d, v)
  // reordena: d0 < ... < dk = v < ... < d(p-1)
  QS(d[0..k-1], k)
  QS(d[k+1..p-1], p-k-1)
`,
      },
      {
        title: "Quicksort paralelo (n = p)",
        note: "Diapos 20–22",
        bullets: [
          md`El algoritmo de **Peter Sanders** es el mejor quicksort paralelo de propósito general.`,
          md`Cada proceso guarda 1 elemento. Se elige un **pivote aleatorio** y se difunde (**broadcast**); cada uno marca si su valor ≤ pivote; una **suma de prefijos** numera los menores y los mayores; se calcula p′ (número de menores) y los elementos se envían a su partición.`,
          md`Después los procesos se dividen en **dos grupos** y se repite en cada uno. Cada nivel cuesta O(log p) (broadcast + prefijos): T(p) = T(p/2) + log p.`,
        ],
        formula: String.raw`T(p)=T(p/2)+\log p\ \Rightarrow\ T_p(n,p)\in O(\log^2 p)`,
      },
      {
        title: "Quicksort paralelo (n > p)",
        note: "Diapo 23",
        bullets: [
          md`Cada proceso recibe n/p elementos y los ordena localmente: O((n/p) log(n/p)).`,
          md`El movimiento de datos entre procesos cuesta O(log p (α + (n/p)β)) por nivel, y el span del esquema PRAM es O(log² p).`,
        ],
        formula: String.raw`T_p(n,p)=O\!\left(\frac{n\log n}{p}+\log p\left(\alpha+\frac{n}{p}\beta\right)+\alpha\log^2p\right)`,
      },
      {
        title: "Mergesort paralelo",
        note: "Diapos 24–27",
        bullets: [
          md`Mezclar dos secuencias ordenadas A (r elementos) y B (s elementos) en una secuencia ordenada C de r+s elementos.`,
          md`Supuestos del desarrollo: tamaños iguales r = s = n y n potencia de 2. n = 1: la salida es trivial. n = 2: tres procesos comparan (P₁ el menor de ambos, P₂ el mayor, P₃ los intermedios).`,
          md`Ejemplo con A = {3,5,7,9} y B = {2,4,6,8}: cada grupo se mezcla con una red de comparadores.`,
        ],
      },
      {
        title: "Odd-even mergesort de Batcher",
        note: "Diapos 28–32",
        bullets: [
          md`Se mezclan en paralelo los elementos **impares** de A y B (→ D) y los **pares** (→ E); luego c₁ = d₁, c₂ₙ = eₙ y, para cada i: c₂ᵢ = min(dᵢ₊₁, eᵢ), c₂ᵢ₊₁ = max(dᵢ₊₁, eᵢ).`,
          md`El sort ordena las dos mitades en paralelo y mezcla: T∞(n) = T∞(n/2) + O(log n) → **O(log² n)**.`,
          md`Trabajo O(n log² n) con la red de Batcher (la diapo cita O(n log n) con un two-way-merge óptimo); modelo **CREW**.`,
        ],
        formula: String.raw`c_{2i}=\min(d_{i+1},e_i),\qquad c_{2i+1}=\max(d_{i+1},e_i)`,
      },
      {
        title: "Ordenamiento bitónico",
        note: "Diapos 33–36",
        bullets: [
          md`Una secuencia **bitónica** crece y luego decrece. Compare-exchange entre a_i y a_{i+n/2} produce **dos secuencias bitónicas**, donde todos los elementos de una son menores que los de la otra.`,
          md`**BitonicSort**: ordena una mitad ascendente y otra descendente **en paralelo** y llama a **BitonicMerge** (§for i pardo CompareExchange§ + dos merges recursivos).`,
          md`T∞(n) = T∞(n/2) + O(log n) = **O(log² n)**. Se parte de pares (siempre bitónicos) y se unen en listas cada vez más grandes.`,
        ],
        formula: String.raw`T_\infty(n)=T_\infty(n/2)+O(\log n)=O(\log^2 n)`,
      },
      {
        title: "Heapsort",
        note: "Diapos 37–38",
        bullets: [
          md`O(n log n). Usa un **heap** (árbol binario donde cada nodo es ≥ sus hijos): se extrae la raíz (el mayor) y se reacomoda.`,
          md`**Difícil de paralelizar**: la extracción es inherentemente secuencial (cada paso depende del anterior).`,
        ],
      },
      {
        title: "Tabla resumen secuencial / span / Brent",
        note: "Diapos 39–40",
        bullets: [
          md`**Bubble y bucket**: Ts = O(n²), span O(n), Tp = O(n²/p + p). **Merge, Quick y Bitónico**: Ts = O(n log n), span O(log² n), Tp = O(n log n / p + log² p). **Heapsort**: sin versión paralela práctica.`,
          md`Para ordenar en paralelo hay que considerar el **cálculo local** y **minimizar la comunicación** (Unidad 6: rendimiento).`,
          md`La figura final (Axtmann & Sanders, 2020) compara tiempos para 262 144 núcleos y distintas distribuciones de entrada.`,
        ],
        formula: String.raw`T_p(n)=O\!\left(\frac{n\log n}{p}+\log^2 p\right)`,
      },
    ],
    links: [
      { label: "Lección: Ordenamiento", href: "/aprende/ordenamiento" },
      { label: "Lección: Quicksort con tareas", href: "/aprende/quicksort-tareas" },
      { label: "Reto: Ranking sort", href: "/problemas/ranking-sort" },
      { label: "Resuelto: Quicksort y escalabilidad", href: "/resueltos/quicksort-escalabilidad" },
      { label: "Resuelto: Mergesort y escalabilidad", href: "/resueltos/mergesort-escalabilidad" },
      { label: "Resuelto: Bitónico y topologías", href: "/resueltos/bitonico-topologias" },
      { label: "Resuelto: HykSort vs ranking", href: "/resueltos/hyksort-vs-ranking" },
    ],
  },
  {
    id: "u5-3",
    unit: "U5.3",
    title: "Algoritmos de búsqueda y optimización discreta",
    pdf: "U5.3 Algoritmos-busqueda",
    intro: md`Búsqueda lineal y binaria, DFS, **branch and bound**, IDA*, y los esquemas **PWS**, **DTS** y clusters para paralelizar la búsqueda en árboles, con su análisis Tp, S y E.`,
    slides: [
      {
        title: "Modelos de búsqueda y de optimización",
        note: "Diapos 5–7",
        bullets: [
          md`**Búsqueda**: dado S = {x₀,…,x_{n−1}}, hallar x con P(x)=1 evaluando candidatos.`,
          md`**Optimización discreta**: tupla (S, f) con f: S → ℝ; se busca x_opt tal que f(x_opt) ≤ f(x) para todo x, sujeto a g(x) ≥ 0.`,
          md`**Mínimo global** (mejor de todo S) vs **mínimo local** (mejor en una vecindad). Hallar el global es difícil; la mayoría de métodos hallan locales. Para el global se prueban varios puntos de partida.`,
        ],
      },
      {
        title: "Estrategias de paralelización",
        note: "Diapo 8",
        bullets: [
          md`**Linear search** → particionar los datos. **Binary search** → múltiples consultas (p−1 pivotes).`,
          md`**DFS** → paralelismo de subárboles. **Branch and bound** → distribución de subproblemas.`,
          md`**Backtracking** → exploración de ramas. **A\*** → expansión de estados.`,
        ],
      },
      {
        title: "Búsqueda lineal paralela",
        note: "Diapo 10",
        bullets: [
          md`Secuencial: T₁(n) = Θ(n). Se divide el vector entre p procesadores (n/p cada uno) y se combinan con una **reducción OR**.`,
          md`En PRAM: un proceso por elemento marca §encontrado[i] = (A[i] == x)§ y se hace REDUCE_OR → T∞ = O(log n).`,
          md`Con OpenMP: §reduction(||:enc)§ o una bandera con §cancel§ para cortar al encontrarlo.`,
        ],
        formula: String.raw`T_p(n)=O\!\left(\frac{n}{p}+\log n\right)`,
      },
      {
        title: "Búsqueda binaria paralela",
        note: "Diapos 11–12",
        bullets: [
          md`En cada iteración se eligen **p−1 pivotes** que dividen el intervalo en **p regiones**; los p−1 procesadores comparan a la vez y se queda la región que puede contener x.`,
          md`El tamaño evoluciona n → n/p → n/p² → … → 1: k = log_p n iteraciones.`,
          md`Speedup sobre la binaria secuencial: Θ(log₂ n) / Θ(log_p n) = Θ(log p). La **eficiencia es baja**: Θ(log p / p).`,
        ],
        formula: String.raw`T_p(n)=\Theta(\log_p n),\quad S_p=\Theta(\log p),\quad E_p=\Theta\!\left(\frac{\log p}{p}\right)`,
      },
      {
        title: "DFS: primero en profundidad",
        note: "Diapos 13–16",
        bullets: [
          md`Se expande el nodo **más recientemente generado**; si no hay éxito se hace **backtrack**. Ventaja: memoria **lineal en la profundidad**.`,
          md`Con n nodos y costo constante por nodo: Ts(n) = Θ(n).`,
          md`Casos: **8-puzzle** (ruta de costo mínimo en un grafo de estados) y **crucigrama** (problema de decisión: elegir la palabra más larga con letras ya asignadas).`,
        ],
        code: code`
DFS(v):
  procesar(v)
  para cada hijo u de v:
    DFS(u)
`,
      },
      {
        title: "DFS paralelo",
        note: "Diapos 17–18",
        bullets: [
          md`Las llamadas a los hijos son concurrentes y un §SYNC()§ (**taskwait**) espera a las tareas hijas antes de que el padre retorne.`,
          md`Trabajo W(n) = 2W(n/2) + Θ(1) = Θ(n). Span T∞(n) = T∞(n/2) + Θ(1) = Θ(log n) (árbol balanceado).`,
          md`En general con altura h: Tp = O(n/p + h). En grafos: O((n+m)/p + h).`,
          md`En **memoria compartida** conviene generar tareas desde los **niveles altos** del árbol: crearlas es barato y así se evita el exceso de tareas diminutas.`,
        ],
        formula: String.raw`T_p(n)=O\!\left(\frac{n}{p}+h\right)`,
      },
      {
        title: "Branch and bound",
        note: "Diapos 19–21",
        bullets: [
          md`DFS orientado a la **mejor solución**: cada vez que se halla una mejor, se actualiza la cota y se **podan** las ramas que no pueden mejorarla.`,
          md`Con factor de ramificación b y profundidad d: Nexp ≤ Σ bⁱ = Θ(b^d). Si la poda es efectiva, Nexp = α·b^d con 0 < α ≤ 1.`,
          md`En paralelo: Tp = Θ(Nexp/p) + Θ(d). Speedup y eficiencia dependen del cociente p·d / b^d.`,
        ],
        formula: String.raw`T_p=\Theta\!\left(\frac{N_{exp}}{p}\right)+\Theta(d),\quad E_p=O\!\left(\frac{1}{1+p\,d/b^d}\right)`,
      },
      {
        title: "Ejemplo: programación lineal entera 0-1",
        note: "Diapos 22–23",
        bullets: [
          md`Minimizar f(x) = cᵀx con x ∈ {0,1}ⁿ sujeto a Ax ≥ b. Ejemplo con 4 variables: f = 2x₁ + x₂ − x₃ − 2x₄ y tres restricciones.`,
          md`El árbol de búsqueda asigna variables una a una; el **límite inferior** (relajación) permite descartar nodos cuyo costo mínimo posible ya supera el mejor conocido.`,
        ],
      },
      {
        title: "Búsqueda iterativa profundizadora e IDA*",
        note: "Diapos 24–25",
        bullets: [
          md`**ID-DFS**: DFS con un **límite de profundidad** que se incrementa hasta hallar solución; combina memoria lineal con exploración por niveles.`,
          md`**IDA\***: usa un límite de **costo** f(x) = g(x) + h(x) (costo recorrido + heurística). Tras cada fallo el nuevo umbral es el menor f que excedió el anterior.`,
          md`Si h es **admisible** (no sobreestima), IDA* halla la solución óptima.`,
        ],
        formula: String.raw`f(x)=g(x)+h(x)`,
      },
      {
        title: "Tabla de complejidad (búsqueda)",
        note: "Diapo 26",
        bullets: [
          md`**Lineal**: Ts = O(n), T∞ = O(log n), Tp = O(n/p + log n), escalabilidad buena.`,
          md`**Binaria**: Ts = O(log n), T∞ = O(log_p n), moderada. **DFS**: Ts = O(n), Tp = O(n/p + d), buena.`,
          md`**B&B**: Ts = O(b^d), Tp = O(b^d/p + d), alta/variable. **IDA\***: Ts = O(K·b^d), Tp = O(K·b^d/p + K·d), con K iteraciones.`,
        ],
      },
      {
        title: "Descomposición del dominio de búsqueda",
        note: "Diapos 27–30",
        bullets: [
          md`Se reparte el espacio de búsqueda entre procesadores para explorar varios **subárboles** a la vez.`,
          md`Problema: los subárboles tienen **tamaños distintos** (difíciles de estimar) → **desbalance** y necesidad de balanceo dinámico.`,
          md`Si p = b^k, se expande secuencialmente hasta el nivel k y cada proceso busca desde ahí: Tp = O(b^k + b^{d−k}).`,
          md`Con árboles desbalanceados conviene bajar más niveles para que cada proceso reciba **muchos subárboles**.`,
        ],
        formula: String.raw`p=b^k,\qquad T_p=O\!\left(b^k+b^{\,d-k}\right)`,
      },
      {
        title: "Parallel Window Search (PWS)",
        note: "Diapos 31–32",
        bullets: [
          md`(Powley & Korf 1991). Cada proceso recibe **una copia del árbol** con un **umbral de costo distinto** B_i = B + iΔ y corre IDA* local.`,
          md`Hay que esperar (§TASKWAIT§) a que **todos terminen** su búsqueda local; entre las soluciones halladas se elige la de menor costo. Si ninguna, el nuevo B es el menor siguiente umbral.`,
          md`El **tiempo lo determina el proceso que más demora**.`,
        ],
        code: code`
B = h(s);  solucion = vacio
mientras solucion vacio:
  para i en 0..p-1 en paralelo:
    Bi = B + i*Delta
    (sol_i, c_i, next_i) = DFSLimitado(s, Bi)
  TASKWAIT
  si existe sol_i: devolver la de menor c_i
  B = min(next_i)
`,
      },
      {
        title: "Distributed Tree Search (DTS)",
        note: "Diapos 33–34",
        bullets: [
          md`(Kumar & Rao 1990). Todos los procesos usan el **mismo umbral de costo B**, pero cada uno recibe un **subárbol distinto**.`,
          md`Se define el nivel k = ⌈log_b p⌉ donde se particiona; hasta ese nivel el cálculo es **secuencial** (GenerarFrontera), luego cada proceso hace DFS limitado desde un nodo de la frontera.`,
          md`Al final: la mejor solución entre todos y el siguiente umbral.`,
        ],
        code: code`
k = ceil(log_b p)
F = GenerarFrontera(s, k, B)
para i en 0..|F|-1 en paralelo:
  (sol_i, c_i, next_i) = DFSLimitado(F[i], B)
TASKWAIT
devolver el de menor c_i, y next = min(next_i)
`,
      },
      {
        title: "Búsqueda iterativa adaptiva y comparación",
        note: "Diapos 35–37",
        bullets: [
          md`(Cook 1997) **Clusters** de procesos: cada cluster tiene su umbral y se reparte entre sus procesos. **1 cluster = DTS; p clusters = PWS.**`,
          md`**DTS**: bueno para árboles **bien balanceados**. **PWS**: óptimo para búsquedas heurísticas **profundas**. **Clusters**: mejor en **multinodo**.`,
          md`Speedup depende de dónde está la solución: S = 1 + 1/(a(b−1)), con a la fracción de nodos expandidos antes de hallarla (p. ej. p = 10, b = 6, d = 10).`,
        ],
        formula: String.raw`E_{DTS}=O\!\left(\frac{1}{1+\frac{p\,b^k+p\log p}{b^d}}\right),\quad E_{PWS}=O\!\left(\frac{1}{1+\frac{p\,b^m+p\log p}{b^d}}\right)`,
      },
      {
        title: "Participación 9: cómo se resuelve",
        note: "Diapos 38–41",
        bullets: [
          md`Se da un DAG con el árbol de búsqueda y tres soluciones parciales s₁, s₂, s₃. Se pide contar los **pasos (aristas)** hasta encontrar la solución global.`,
          md`**(a) PWS**: cada proceso tiene un umbral (niveles m = 1, 2, 3). Todos deben **terminar** su búsqueda local; el costo es el del proceso **más lento**.`,
          md`**(b) DTS**: se particiona en dos momentos (m = 1 y m = 2) con el **mismo costo** para todos; se cuentan los pasos del proceso crítico.`,
          md`**(c)** Speedup S = Ts / Tp y eficiencia E = S / p para cada esquema; se compara cuál da mayor speedup y cuál mayor eficiencia y se explica.`,
        ],
        formula: String.raw`S=\frac{T_s}{T_p},\qquad E=\frac{S}{p}`,
      },
      {
        title: "Descomposición funcional y reparto de tareas",
        note: "Diapos 42–47",
        bullets: [
          md`Se asigna **una tarea a cada procesador** optimizando tiempos locales. En OpenMP: §taskwait§, §barrier§, §depend§, §taskyield§, §untied§.`,
          md`En búsqueda, si un proceso halla la solución, **todos terminan**: consulta de una variable compartida con §atomic§ y §cancel taskgroup§.`,
          md`Para repartir trabajo: **ARR** (round robin asíncrono: contador por procesador, Tcomm = O(p² log W)), **GRR** (contador global: O(p log W) pero **cuello de botella**) y **RP** (polling aleatorio: O(p log p log W), sin cuello de botella).`,
        ],
        formula: String.raw`T_{comm}=O\big(V(p)\log W\big)`,
      },
    ],
    links: [
      { label: "Lección: Búsqueda", href: "/aprende/busqueda" },
      { label: "Reto: Primer índice", href: "/problemas/primer-indice" },
      { label: "Reto: BFS por niveles", href: "/problemas/bfs-niveles" },
      { label: "Teoría: Búsqueda", href: "/teoria/busqueda" },
    ],
  },
  {
    id: "u5-4",
    unit: "U5.4",
    title: "Algoritmos paralelos en grafos",
    pdf: "U5.4 Algoritmos-grafos",
    intro: md`Técnicas fundamentales (**pointer jumping**, **prefijos paralelos**, **coloreo**) y los algoritmos clásicos **Prim**, **Dijkstra** y **Floyd–Warshall** con su análisis de trabajo, span, speedup y eficiencia.`,
    slides: [
      {
        title: "Grafos y componentes",
        note: "Diapos 3–7",
        bullets: [
          md`Los grafos modelan metros, tráfico aéreo, redes sociales… Un grafo no conexo se separa en **componentes conexas**.`,
          md`Las redes grandes suelen tener una **supercomponente** (fracción significativa de los nodos); es raro que convivan dos porque tienden a fundirse.`,
        ],
      },
      {
        title: "Pointer jumping",
        note: "Diapos 9–10",
        bullets: [
          md`Un árbol dirigido tiene raíz r si todo v alcanza r. **Pointer jumping**: cada nodo reemplaza su sucesor por el **sucesor de su sucesor**, duplicando la distancia que salta en cada ronda.`,
          md`Con altura máxima h se necesitan **O(log h)** rondas de O(1): T∞ = O(log h), W = O(n log h).`,
          md`La raíz apunta a sí misma (loop) para que el algoritmo termine.`,
        ],
        code: code`
para 1 <= i <= n en paralelo:
  S(i) = P(i)
  mientras S(i) != S(S(i)):
    S(i) = S(S(i))
`,
        formula: String.raw`T_\infty=O(\log h),\qquad W=O(n\log h)`,
      },
      {
        title: "Prefijos paralelos sobre un bosque",
        note: "Diapo 11",
        bullets: [
          md`Si cada vértice i lleva un peso W(i) (con W(raíz) = 0), pointer jumping calcula la **suma de pesos de i hasta la raíz**.`,
          md`Antes de saltar, se suma el peso del nodo al que se salta: W(i) += W(S(i)); luego S(i) = S(S(i)).`,
          md`Misma complejidad que pointer jumping.`,
        ],
        code: code`
mientras S(i) != S(S(i)):
  W(i) = W(i) + W(S(i))
  S(i) = S(S(i))
`,
      },
      {
        title: "Coloreo de grafos",
        note: "Diapos 12–15",
        bullets: [
          md`Aplicaciones: asignar **frecuencias**, horarios de clases, el problema de seguridad del museo.`,
          md`Coloreo k: c: V → {0,…,k−1} con c(i) ≠ c(j) si (i,j) ∈ E. Se parte del coloreo inicial c(i) = i.`,
          md`**Cole–Vishkin**: para cada i, sea k la posición del **bit menos significativo en que c(i) y c(S(i)) difieren**; el nuevo color es c′(i) = 2k + (bit k de c(i)). T∞ = O(1), W = O(n).`,
          md`El nuevo coloreo sigue siendo **válido** (vecinos con colores distintos).`,
        ],
        formula: String.raw`c'(i)=2k+c(i)_k`,
      },
      {
        title: "3-coloreo optimizado",
        note: "Diapos 16–18",
        bullets: [
          md`Aplicar Cole–Vishkin repetidamente mientras t > 3 bits: t bits pasan a ⌈log t⌉ + 1 bits, el número de colores decrece **exponencialmente**.`,
          md`Teorema: un ciclo dirigido se 3-colorea en **O(log* n)** pasos con trabajo O(n log* n).`,
          md`Para pasar de 6 colores a 3: los vértices con color 3, 4 y 5 **se recolorean uno por clase**, tomando el menor color de {0,1,2} distinto de sus dos vecinos (cada clase es independiente, por eso se hace en paralelo).`,
        ],
        formula: String.raw`\log^{(i)}x=\log\!\big(\log^{(i-1)}x\big)`,
      },
      {
        title: "Prim (MST) secuencial",
        note: "Diapo 19",
        bullets: [
          md`**Árbol recubridor mínimo** de un grafo conexo, no dirigido y ponderado: agrega en cada paso el vértice fuera del árbol más cercano a él.`,
          md`Mantiene V_T (árbol) y d(v) (distancia mínima al árbol). Termina cuando V_T = V.`,
          md`Con matriz de adyacencia: Ts = Θ(n²).`,
        ],
      },
      {
        title: "Prim en paralelo",
        note: "Diapos 20–24",
        bullets: [
          md`V se divide en **p grupos de n/p vértices consecutivos**; el vector de distancias se particiona igual.`,
          md`En cada paso: cada proceso halla su **mínimo local**, una **reducción** (árbol binario) obtiene el mínimo global, ese vértice entra al MST (broadcast en memoria distribuida) y cada proceso **actualiza sus distancias** localmente.`,
          md`W(n) = n·Θ(n) = Θ(n²); T∞ = Θ(n log n); **Tp = O(n²/p + n log p)** para n ≫ p; E = O(1/(1 + p log p / n)), así que para E = O(1) hace falta **n = Ω(p log p)**.`,
          md`Prim paralelo es más eficiente con grafos **densos/completos**. Con heap binario Ts = O(m log n) y con heap de Fibonacci O(m + n log n).`,
        ],
        formula: String.raw`T_p=O\!\left(\frac{n^2}{p}+n\log p\right),\qquad E=O\!\left(\frac{1}{1+\frac{p\log p}{n}}\right)`,
      },
      {
        title: "Dijkstra (camino mínimo desde un origen)",
        note: "Diapos 25–27",
        bullets: [
          md`Camino más corto desde un vértice a todos los demás; mantiene el conjunto de vértices con distancia final conocida y agrega el **más cercano al origen**.`,
          md`**Paralelización idéntica a Prim**: matriz particionada por bloques, mínimo local + reducción global, broadcast del nodo elegido y del vector l actualizado.`,
          md`Por eso su rendimiento paralelo es **el mismo que Prim**: Tp = O(n²/p + n log p).`,
        ],
      },
      {
        title: "Todos los pares: Floyd–Warshall",
        note: "Diapos 28–32",
        bullets: [
          md`Calcula las rutas más cortas entre **todos los pares**. Idea: d^(k)(i,j) es la mejor ruta que solo usa como intermedios los vértices {1,…,k}: o no pasa por k, o se parte en i→k y k→j.`,
          md`Tres bucles anidados (k, i, j): Ts = O(n³). El bucle k debe ser **secuencial**.`,
        ],
        formula: String.raw`d^{(k)}_{i,j}=\min\!\left(d^{(k-1)}_{i,j},\ d^{(k-1)}_{i,k}+d^{(k-1)}_{k,j}\right)`,
        code: code`
para k = 1..n:
  para i = 1..n:
    para j = 1..n:
      d[i][j] = min(d[i][j], d[i][k] + d[k][j])
`,
      },
      {
        title: "Floyd paralelo: PRAM y bloques 2D",
        note: "Diapos 33–38",
        bullets: [
          md`**PRAM**: las n iteraciones de k son secuenciales; las n² actualizaciones de cada etapa en paralelo. W = Θ(n³), **T∞ = Θ(n)**, Tp = Θ(n³/p + n).`,
          md`**Con comunicación**: D^(k) se divide en p bloques de n/√p × n/√p. En la iteración k, quienes tienen la **fila k** la envían a su columna de procesos y quienes tienen la **columna k** la envían a su fila (broadcast de n²/p elementos entre √p procesos).`,
          md`Tp = O(n³/p) + O((n²/p) log p). Speedup S = O(p/(1 + (log p)/n)); E = O(1/(1 + (log p)/n)): casi 1 si n ≫ log p.`,
        ],
        formula: String.raw`T_p=O\!\left(\frac{n^3}{p}\right)+O\!\left(\frac{n^2}{p}\log p\right),\qquad E=O\!\left(\frac{1}{1+\frac{\log p}{n}}\right)`,
      },
    ],
    links: [
      { label: "Lección: Grafos", href: "/aprende/grafos" },
      { label: "Reto: Dijkstra", href: "/problemas/dijkstra" },
      { label: "Reto: BFS por niveles", href: "/problemas/bfs-niveles" },
      { label: "Teoría: Grafos", href: "/teoria/grafos" },
    ],
  },
];
