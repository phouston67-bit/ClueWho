/**
 * Pure scoring + streak math for ClueWho rounds.
 *
 * Kept free of any I/O so it can be unit tested in isolation and reused by
 * both the API routes (server authoritative score) and the client (optimistic
 * UI previews).
 */

export const SCORING_RULES = {
  /** Points every round starts with. */
  BASE_SCORE: 1000,
  /** Points subtracted per question the player used. */
  PER_QUESTION_PENALTY: 60,
  /** Points subtracted per second elapsed since the round started. */
  PER_SECOND_PENALTY: 4,
  /** Extra "effective seconds" added to the elapsed-time penalty per wrong guess. */
  WRONG_GUESS_PENALTY_SECONDS: 10,
  /** A correct guess always nets at least this many points. */
  MIN_SCORE_ON_WIN: 100,
  /** Streak multiplier granted per consecutive win, e.g. 0.1 = +10%. */
  STREAK_MULTIPLIER_STEP: 0.1,
  /** Maximum streak multiplier bonus, e.g. 1.0 = capped at +100% (2x total). */
  MAX_STREAK_MULTIPLIER_BONUS: 1.0,
  /** Maximum number of questions allowed per round. */
  MAX_QUESTIONS: 5,
} as const;

export interface ScoreInput {
  /** Number of questions asked before the round ended (0-5). */
  questionsUsed: number;
  /** Whole seconds elapsed between round start and the scoring event. */
  elapsedSeconds: number;
  /** Number of incorrect guesses submitted during the round. */
  wrongGuesses: number;
  /** Whether the round ended in a correct guess. */
  won: boolean;
  /** The player's consecutive-win streak *before* this round is applied. */
  streakBeforeRound: number;
}

export interface ScoreBreakdown {
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

/** Clamp a number between a minimum and maximum (inclusive). */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Compute the streak multiplier for a given number of consecutive wins
 * (not including the current round). Capped at MAX_STREAK_MULTIPLIER_BONUS.
 */
export function getStreakMultiplier(streakBeforeRound: number): number {
  const safeStreak = Math.max(0, streakBeforeRound);
  const bonus = Math.min(
    safeStreak * SCORING_RULES.STREAK_MULTIPLIER_STEP,
    SCORING_RULES.MAX_STREAK_MULTIPLIER_BONUS
  );
  return 1 + bonus;
}

/**
 * Compute the full score breakdown for a finished round.
 *
 * - Losing rounds (no correct guess within MAX_QUESTIONS) always score 0 and
 *   reset the streak to 0.
 * - Winning rounds are floored at MIN_SCORE_ON_WIN *before* the streak
 *   multiplier is applied, then the multiplier is applied on top.
 */
export function calculateRoundScore(input: ScoreInput): ScoreBreakdown {
  const questionsUsed = clamp(
    Math.round(input.questionsUsed),
    0,
    SCORING_RULES.MAX_QUESTIONS
  );
  const elapsedSeconds = Math.max(0, input.elapsedSeconds);
  const wrongGuesses = Math.max(0, Math.round(input.wrongGuesses));

  const questionPenalty = questionsUsed * SCORING_RULES.PER_QUESTION_PENALTY;
  const wrongGuessPenaltySeconds =
    wrongGuesses * SCORING_RULES.WRONG_GUESS_PENALTY_SECONDS;
  const effectiveSeconds = elapsedSeconds + wrongGuessPenaltySeconds;
  const timePenalty = Math.round(
    effectiveSeconds * SCORING_RULES.PER_SECOND_PENALTY
  );

  if (!input.won) {
    return {
      baseScore: SCORING_RULES.BASE_SCORE,
      questionPenalty,
      timePenalty,
      wrongGuessPenaltySeconds,
      preMultiplierScore: 0,
      streakMultiplier: 1,
      finalScore: 0,
      newStreak: 0,
      won: false,
    };
  }

  const rawScore = SCORING_RULES.BASE_SCORE - questionPenalty - timePenalty;
  const preMultiplierScore = Math.max(rawScore, SCORING_RULES.MIN_SCORE_ON_WIN);

  const newStreak = Math.max(0, input.streakBeforeRound) + 1;
  const streakMultiplier = getStreakMultiplier(input.streakBeforeRound);
  const finalScore = Math.round(preMultiplierScore * streakMultiplier);

  return {
    baseScore: SCORING_RULES.BASE_SCORE,
    questionPenalty,
    timePenalty,
    wrongGuessPenaltySeconds,
    preMultiplierScore,
    streakMultiplier,
    finalScore,
    newStreak,
    won: true,
  };
}
