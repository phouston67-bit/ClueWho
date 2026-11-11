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
 * Maximum difficulty tier unlocked at a given consecutive-win streak.
 * Rounds start easy (only iconic, difficulty-1 picks) and gradually widen
 * to include more obscure people as the player's streak grows, so the
 * challenge ramps up the longer a streak runs.
 */
export function difficultyCapForStreak(streakBeforeRound: number): 1 | 2 | 3 {
  if (streakBeforeRound >= 4) return 3;
  if (streakBeforeRound >= 2) return 2;
  return 1;
}

/**
 * Pick a uniformly random person, optionally restricted to a category and
 * avoiding ids the client says it has seen recently (so the same person
 * doesn't keep coming back up round after round). Also biased toward more
 * iconic (lower-difficulty) people early in a streak, widening to include
 * more obscure people as the streak grows (see difficultyCapForStreak).
 *
 * Both constraints are soft: if applying them would leave nothing to pick
 * from (e.g. a small category has been fully cycled, or every remaining
 * person is harder than the current cap), they're relaxed one at a time
 * rather than erroring, so the game can always keep going.
 */
export function pickRandomPerson(
  category?: Category,
  excludeIds: string[] = [],
  streakBeforeRound: number = 0
): Person {
  const basePool = category ? getPeopleByCategory(category) : PEOPLE;
  if (basePool.length === 0) {
    throw new Error(`No people available for category "${category}".`);
  }

  const maxDifficulty = difficultyCapForStreak(streakBeforeRound);
  const excludeSet = new Set(excludeIds);
  const byDifficulty = basePool.filter((p) => (p.difficulty ?? 2) <= maxDifficulty);

  const pool =
    [
      byDifficulty.filter((p) => !excludeSet.has(p.id)),
      byDifficulty,
      basePool.filter((p) => !excludeSet.has(p.id)),
      basePool,
    ].find((candidates) => candidates.length > 0) ?? basePool;

  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}

/** Resolve an "All Categories" / arbitrary category selection into one of the real categories. */
export function resolveCategory(requested: string | undefined): Category | undefined {
  if (!requested || requested === "Surprise me" || requested === "All Categories") return undefined;
  return (CATEGORIES as readonly string[]).includes(requested)
    ? (requested as Category)
    : undefined;
}
