/**
 * Shared domain types for ClueWho, used across lib/, app/api/, and
 * components/.
 */

export const CATEGORIES = [
  "TV & Film",
  "Musicians",
  "Athletes",
  "Football",
  "Historical Figures",
  "Scientists",
  "Politicians",
  "Business Leaders",
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
  wrongGuessPenaltySeconds: number;
  preMultiplierScore: number;
  streakMultiplier: number;
  finalScore: number;
  newStreak: number;
  won: boolean;
}
