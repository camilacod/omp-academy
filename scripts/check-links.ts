import { decks } from "../content/slides";
import { lessons } from "../content/lessons";
import { problems } from "../content/problems";
import { solved } from "../content/solved";
import { topics } from "../content/theory";

const ok = new Set<string>([
  ...lessons.map((l) => `/aprende/${l.id}`),
  ...problems.map((p) => `/problemas/${p.slug}`),
  ...solved.map((s) => `/resueltos/${s.slug}`),
  ...topics.map((t) => `/teoria/${t.id}`),
  ...decks.map((d) => `/diapos/${d.id}`),
]);
let bad = 0;
for (const d of decks) for (const l of d.links) if (!ok.has(l.href)) { console.log("ROTO", d.id, l.href); bad++; }
for (const l of lessons) if (l.slideDeck && !decks.find((d) => d.id === l.slideDeck)) { console.log("deck inexistente", l.id, l.slideDeck); bad++; }
console.log(bad ? `${bad} problemas` : "links OK", decks.map((d) => `${d.id}:${d.slides.length}`).join(" "));
import { PLAN } from "../lib/plan";
let bad2 = 0;
for (const d of PLAN) for (const it of d.items) if (!ok.has(it.href) && it.href !== "/teoria") { console.log("PLAN ROTO", d.date, it.href); bad2++; }
console.log(bad2 ? `plan: ${bad2} rotos` : "plan OK");
