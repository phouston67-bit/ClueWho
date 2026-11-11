/**
 * Shared domain types for 10Clues, used across lib/, app/api/, and
 * components/.
 */

export const CATEGORIES = [
  "Football",
  "Stadiums",
  "TV & Film",
  "Musicians",
  "Athletes",
  "Historical Figures",
  "Scientists",
  "Politicians",
  "Business Leaders",
  "Landmarks",
  "Logos",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface PersonImage {
  /** Direct file URL on Wikimedia Commons (or a TODO placeholder before seeding). */
  commonsFileUrl: string;
  /** Human-readable license name, e.g. "CC BY-SA 4.0" or "Public domain". */
  license: string;
  /** Required attribution string to display alongside the image. */
  attribution: string;
  /** Wikimedia Commons page URL for the file, for linking out. */
  sourcePageUrl?: string;
}

export interface Person {
  /**
   * The "secret subject" of a round - almost always a famous person, but
   * also used for the "Landmarks", "Stadiums", and "Logos" categories, where
   * it represents a famous place/venue or brand instead. The shape (name,
   * facts, image, etc.) works identically either way, so the type keeps its
   * original name rather than forcing a wider rename across the codebase.
   */
  id: string;
  name: string;
  category: Category;
  /** Alternate names/aliases accepted as correct guesses. */
  aliases?: string[];
  /**
   * Short factual statements used ONLY server-side to ground the AI's
   * yes/no/sometimes/unclear answers. Never sent to the client pre-reveal.
   */
  facts: string[];
  /** A single family-friendly fun fact revealed to the player after the round. */
  revealFact: string;
  /**
   * Relative fame/obscurity within the category: 1 = iconic/universally
   * known, 2 = well-known, 3 = more niche/requires deeper category
   * knowledge. Drives streak-based difficulty scaling (see
   * lib/people.ts::pickRandomPerson) - rounds start easy and gradually
   * introduce more obscure picks as the player's streak grows. Defaults to
   * 2 (medium) when omitted.
   */
  difficulty?: 1 | 2 | 3;
  /** Wikidata QID, used by the seed script to resolve a licensed image. */
  wikidataId?: string;
  image: PersonImage;
}

/** The constrained answer enum the AI must respond with for every question. */
export const ANSWER_LABELS = ["Yes", "No", "Sometimes", "Unclear"] as const;
export type AnswerLabel = (typeof ANSWER_LABELS)[number];

export interface QuestionAnswer {
  question: string;
  answer: AnswerLabel;
  clarification?: string;
}

export interface ScoreBreakdownDTO {
  baseScore: number;
  questionPenalty: number;
  timePenalty: number;
  hintPenalty: number;
  wrongGuessPenaltySeconds: number;
  preMultiplierScore: number;
  streakMultiplier: number;
  finalScore: number;
  newStreak: number;
  won: boolean;
}
