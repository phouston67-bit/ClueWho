/**
 * Lightweight, dependency-free fuzzy string matching used to check a
 * player's free-text guess against a secret person's name (and aliases).
 *
 * Uses the Sorensen-Dice coefficient over character bigrams, which is a
 * fast, well-understood similarity metric that tolerates minor typos,
 * missing middle names, and punctuation differences without needing an
 * external npm package.
 */

/** Normalize a string for comparison: lowercase, strip diacritics/punctuation, collapse whitespace. */
export function normalize(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(input: string): string[] {
  const clean = input.replace(/\s+/g, "");
  if (clean.length < 2) return clean.length === 1 ? [clean] : [];
  const grams: string[] = [];
  for (let i = 0; i < clean.length - 1; i++) {
    grams.push(clean.slice(i, i + 2));
  }
  return grams;
}

/**
 * Sorensen-Dice similarity between two strings, in the range [0, 1].
 * 1 means identical (after normalization), 0 means no shared bigrams.
 */
export function diceCoefficient(a: string, b: string): number {
  const normA = normalize(a);
  const normB = normalize(b);
  if (normA === normB) return 1;
  if (normA.length === 0 || normB.length === 0) return 0;

  const bigramsA = bigrams(normA);
  const bigramsB = bigrams(normB);
  if (bigramsA.length === 0 || bigramsB.length === 0) {
    return normA === normB ? 1 : 0;
  }

  const counts = new Map<string, number>();
  for (const gram of bigramsA) {
    counts.set(gram, (counts.get(gram) ?? 0) + 1);
  }

  let intersectionSize = 0;
  for (const gram of bigramsB) {
    const count = counts.get(gram) ?? 0;
    if (count > 0) {
      intersectionSize++;
      counts.set(gram, count - 1);
    }
  }

  return (2 * intersectionSize) / (bigramsA.length + bigramsB.length);
}

/** Default similarity threshold above which a guess counts as "correct". */
export const GUESS_MATCH_THRESHOLD = 0.72;

/**
 * Returns true if `guess` is a close enough match to `name` (or one of
 * `aliases`) to be considered a correct guess. Short-circuits on an exact
 * normalized match or an unambiguous substring match for full names.
 */
export function isGuessMatch(
  guess: string,
  name: string,
  aliases: string[] = [],
  threshold: number = GUESS_MATCH_THRESHOLD
): boolean {
  const candidates = [name, ...aliases];
  const normGuess = normalize(guess);
  if (!normGuess) return false;

  return candidates.some((candidate) => {
    const normCandidate = normalize(candidate);
    if (!normCandidate) return false;
    if (normGuess === normCandidate) return true;
    // Reward a guess that is a full, unambiguous substring of a multi-word
    // name (e.g. guessing a well-known mononym or a close variant).
    if (
      normGuess.length >= 4 &&
      (normCandidate.includes(normGuess) || normGuess.includes(normCandidate))
    ) {
      return diceCoefficient(normGuess, normCandidate) >= threshold - 0.15;
    }
    return diceCoefficient(normGuess, normCandidate) >= threshold;
  });
}
