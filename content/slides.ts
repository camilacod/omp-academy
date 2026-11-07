import type { Deck } from "@/lib/types";
import { decks1 } from "./slides-1";
import { decks2 } from "./slides-2";

export const decks: Deck[] = [...decks1, ...decks2];
export const deckById = (id: string) => decks.find((d) => d.id === id);
