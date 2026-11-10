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

/** Pick a uniformly random person, optionally restricted to a category. */
export function pickRandomPerson(category?: Category): Person {
  const pool = category ? getPeopleByCategory(category) : PEOPLE;
  if (pool.length === 0) {
    throw new Error(`No people available for category "${category}".`);
  }
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
