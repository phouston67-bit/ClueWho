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
 * Starter words that are themselves very common first names (chiefly
 * "Will", as in Will Smith/Will Ferrell). For these - and only these - a
 * short input is checked for a following pronoun/determiner (the word that
 * virtually always follows a *real* question: "Will he...", "Will it...")
 * before trusting the question classification; otherwise it's treated as a
 * guess at a name starting with that word.
 */
const AMBIGUOUS_NAME_STARTERS = new Set(["will"]);
const QUESTION_CONTINUATION_WORDS = new Set([
  "he",
  "she",
  "it",
  "they",
  "you",
  "i",
  "we",
  "there",
  "this",
  "that",
]);

/** Strips a leading word/punctuation down to lowercase letters for comparison. */
function cleanWord(word: string | undefined): string {
  return word?.toLowerCase().replace(/[^a-z']/g, "") ?? "";
}

// Phrases that explicitly signal "I'm naming my guess", even though they
// start with a word (e.g. "Is") that would otherwise read as a question.
// Each pattern's captured remainder is the actual guess text.
const GUESS_OVERRIDE_PATTERNS: RegExp[] = [
  /^is\s+it\s+(.+)$/i,
  /^is\s+(?:this|that|the\s+answer|the\s+person)\s+(.+)$/i,
  /^i\s+think\s+it'?s\s+(.+)$/i,
  /^i\s+think\s+it\s+is\s+(.+)$/i,
  /^my\s+guess\s+is\s+(.+)$/i,
  /^could\s+it\s+be\s+(.+)$/i,
  /^i\s+bet\s+it'?s\s+(.+)$/i,
  /^i\s+guess\s+(.+)$/i,
];

// If the extracted remainder starts with one of these words, the original
// text was a genuine yes/no question ("Is it true that...", "Is it a man?")
// rather than a disguised guess, so the override should NOT apply.
const NON_NAME_REMAINDER_STARTERS = new Set([
  "a",
  "an",
  "the",
  "true",
  "false",
  "real",
  "still",
  "currently",
  "famous",
  "someone",
  "something",
  "male",
  "female",
  "man",
  "woman",
  "alive",
  "dead",
  "fiction",
  "fictional",
  "related",
  "connected",
  "associated",
  "known",
  "considered",
  "born",
  "from",
  "part",
  "old",
  "young",
  "based",
]);

/**
 * Detects "disguised guess" phrasing like "Is it Joan of Arc", "I think
 * it's Cristiano Ronaldo", or "My guess is Beyonce" and, when found,
 * returns the extracted name to guess instead of the full phrase. Returns
 * null when the text doesn't match, or when the remainder looks like a
 * genuine yes/no question rather than a name (e.g. "Is it true..?").
 */
export function extractGuessOverride(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  for (const pattern of GUESS_OVERRIDE_PATTERNS) {
    const match = trimmed.match(pattern);
    if (!match) continue;

    const remainder = match[1].replace(/[?.!]+$/, "").trim();
    if (!remainder) continue;

    const words = remainder.split(/\s+/).filter(Boolean);
    if (words.length === 0 || words.length > 5) continue;
    if (NON_NAME_REMAINDER_STARTERS.has(cleanWord(words[0]))) continue;

    return remainder;
  }

  return null;
}

/**
 * Decides whether free text typed into the shared ask/guess box reads as a
 * yes/no question (so it should be sent to the AI) or as a guess at the
 * secret person's name. Pure and unit-testable so the heuristic can evolve
 * without touching UI code.
 */
export function isLikelyQuestion(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (extractGuessOverride(trimmed)) return false;
  if (trimmed.endsWith("?")) return true;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const firstWord = cleanWord(words[0]);

  if (firstWord && QUESTION_STARTERS.includes(firstWord)) {
    // "Will" doubles as a very common first name (Will Smith, Will
    // Ferrell). Only trust it as a real question if a short input is
    // followed by a pronoun/determiner the way real questions are
    // ("Will he...", "Will it..."); otherwise it's almost always a name.
    if (AMBIGUOUS_NAME_STARTERS.has(firstWord) && words.length <= 3) {
      const second = cleanWord(words[1]);
      if (!second || !QUESTION_CONTINUATION_WORDS.has(second)) {
        return false;
      }
    }
    return true;
  }

  // Multiple words with no leading question word is still much more likely
  // to be a question ("plays a sport professionally") than a full name,
  // but names can be multi-word too (e.g. "Thierry Henry"). Short inputs
  // (<=4 words) default to a guess; longer, sentence-like input defaults
  // to a question.
  return words.length > 4;
}
