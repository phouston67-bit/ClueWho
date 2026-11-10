import "server-only";
import rawPeople from "@/data/people.json";
import type { Category, Person } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

/**
 * Server-only accessors for the curated people dataset. Importing
 * "server-only" ensures this (and the facts/names it exposes) can never
 * accidentally end up in a client bundle.
 */

const PEOPLE: Person[] = rawPeople as unknown as Person[];

export function getAllPeople(): Person[] {
  return PEOPLE;
}

export function getPeopleByCategory(category: Category): Person[] {
  return PEOPLE.filter((p) => p.category === category);
}

export function getPersonById(id: string): Person | undefined {
  return PEOPLE.find((p) => p.id === id);
}

/**
 * Pick a uniformly random person, optionally restricted to a category and
 * avoiding ids the client says it has seen recently (so the same person
 * doesn't keep coming back up round after round). If excluding those ids
 * would leave nothing to pick from (e.g. the player has cycled through an
 * entire small category), the exclusion is dropped for this pick rather
 * than erroring, so the game can keep going - it just means a repeat is
 * briefly allowed once a whole category has been exhausted.
 */
export function pickRandomPerson(
  category?: Category,
  excludeIds: string[] = []
): Person {
  const basePool = category ? getPeopleByCategory(category) : PEOPLE;
  if (basePool.length === 0) {
    throw new Error(`No people available for category "${category}".`);
  }

  const excludeSet = new Set(excludeIds);
  const filteredPool = basePool.filter((p) => !excludeSet.has(p.id));
  const pool = filteredPool.length > 0 ? filteredPool : basePool;

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/** Resolve a "Surprise me" / arbitrary category selection into one of the real categories. */
export function resolveCategory(requested: string | undefined): Category | undefined {
  if (!requested || requested === "Surprise me") return undefined;
  return (CATEGORIES as readonly string[]).includes(requested)
    ? (requested as Category)
    : undefined;
}
