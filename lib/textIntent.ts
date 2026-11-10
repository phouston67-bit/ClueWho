const QUESTION_STARTERS = [
  "who",
  "what",
  "when",
  "where",
  "why",
  "how",
  "is",
  "are",
  "was",
  "were",
  "do",
  "does",
  "did",
  "has",
  "have",
  "had",
  "can",
  "could",
  "will",
  "would",
  "should",
];

/**
 * Decides whether free text typed into the shared ask/guess box reads as a
 * yes/no question (so it should be sent to the AI) or as a guess at the
 * secret person's name. Pure and unit-testable so the heuristic can evolve
 * without touching UI code.
 */
export function isLikelyQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.endsWith("?")) return true;

  const firstWord = trimmed
    .toLowerCase()
    .split(/\s+/)[0]
    ?.replace(/[^a-z']/g, "");

  if (firstWord && QUESTION_STARTERS.includes(firstWord)) return true;

  // Multiple words with no leading question word is still much more likely
  // to be a question ("plays a sport professionally") than a full name,
  // but names can be multi-word too (e.g. "Thierry Henry"). Short inputs
  // (<=4 words) default to a guess; longer, sentence-like input defaults
  // to a question.
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  return wordCount > 4;
}
