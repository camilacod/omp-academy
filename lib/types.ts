export type Difficulty = "facil" | "medio" | "dificil";

export type Expect =
  | { kind: "exact"; value: string }
  | { kind: "sorted"; value: string }
  | { kind: "contains"; value: string }
  | { kind: "notContains"; value: string }
  | { kind: "regex"; value: string; flags?: string }
  | { kind: "num"; re: string; value: number; tol: number };

export interface RunSpec {
  stdin?: string;
  args?: string[];
  threads?: number;
  expect: Expect[];
  /** Descripción visible si falla (para tests ocultos de problemas) */
  label?: string;
}

export interface StaticRule {
  re: string;
  flags?: string;
  want: boolean;
  msg: string;
}

export interface TestSpec {
  static?: StaticRule[];
  runs: RunSpec[];
}

export interface Checkpoint {
  id: string;
  title: string;
  task: string; // markdown
  starter: string;
  solution: string;
  hints: string[];
  tests: TestSpec;
}

export interface Lesson {
  id: string;
  title: string;
  unit: string;
  minutes: number;
  summary: string;
  intro: string; // markdown (teoría)
  checkpoints: Checkpoint[];
  slideDeck?: string;
  topic?: string;
  widget?: "forkjoin" | "schedule";
}

export interface Question {
  id: string;
  type: "mc" | "tf" | "fill";
  diff: Difficulty;
  q: string; // markdown
  options?: string[];
  answer: number | boolean | string[]; // mc: índice; tf: boolean; fill: respuestas aceptadas
  explain: string;
}

export interface Card {
  id: string;
  front: string;
  back: string;
}

export interface Topic {
  id: string;
  title: string;
  icon: string;
  blurb: string;
  reading: string;
  questions: Question[];
  cards: Card[];
}

export interface Problem {
  slug: string;
  title: string;
  topic: string;
  diff: Difficulty;
  source: string;
  statement: string; // markdown
  starter: string;
  solution: string;
  hints: string[];
  editorial: string; // markdown (incl. complejidad)
  tests: TestSpec;
}

export interface DagNode {
  id: string;
  label: string;
  cost?: number;
}
export interface DagData {
  nodes: DagNode[];
  edges: [string, string][];
  critical?: string[];
  caption?: string;
}

export interface SolvedStep {
  title: string;
  body: string; // markdown
  code?: string;
  dag?: DagData;
}
export interface Solved {
  slug: string;
  title: string;
  source: string;
  topic: string;
  diff: Difficulty;
  statement: string;
  steps: SolvedStep[];
  complexity: { label: string; value: string }[];
  result: string;
}

export interface Slide {
  title: string;
  bullets: string[];
  code?: string;
  formula?: string;
  note?: string;
}
export interface Deck {
  id: string;
  unit: string;
  title: string;
  pdf: string; // nombre del PDF original (referencia, no se incluye)
  intro: string;
  slides: Slide[];
  links: { label: string; href: string }[];
}
