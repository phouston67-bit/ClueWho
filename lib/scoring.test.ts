import { describe, it, expect } from "vitest";
import {
  calculateRoundScore,
  getStreakMultiplier,
  SCORING_RULES,
} from "./scoring";

describe("getStreakMultiplier", () => {
  it("returns 1 for a zero streak", () => {
    expect(getStreakMultiplier(0)).toBe(1);
  });

  it("adds 10% per consecutive win", () => {
    expect(getStreakMultiplier(1)).toBeCloseTo(1.1);
    expect(getStreakMultiplier(3)).toBeCloseTo(1.3);
  });

  it("caps the bonus at +100% (2x total)", () => {
    expect(getStreakMultiplier(10)).toBeCloseTo(2.0);
    expect(getStreakMultiplier(25)).toBeCloseTo(2.0);
  });

  it("treats negative streaks as zero", () => {
    expect(getStreakMultiplier(-5)).toBe(1);
  });
});

describe("calculateRoundScore", () => {
  it("scores a fast, no-question, no-streak win near the base score", () => {
    const result = calculateRoundScore({
      questionsUsed: 0,
      elapsedSeconds: 0,
      wrongGuesses: 0,
      won: true,
      streakBeforeRound: 0,
    });
    expect(result.won).toBe(true);
    expect(result.finalScore).toBe(SCORING_RULES.BASE_SCORE);
    expect(result.newStreak).toBe(1);
  });

  it("subtracts per-question and per-second penalties", () => {
    const result = calculateRoundScore({
      questionsUsed: 3,
      elapsedSeconds: 20,
      wrongGuesses: 0,
      won: true,
      streakBeforeRound: 0,
    });
    // 1000 - (3*60) - (20*4) = 1000 - 180 - 80 = 740
    expect(result.questionPenalty).toBe(180);
    expect(result.timePenalty).toBe(80);
    expect(result.preMultiplierScore).toBe(740);
    expect(result.finalScore).toBe(740);
  });

  it("floors a winning round at MIN_SCORE_ON_WIN before the multiplier", () => {
    const result = calculateRoundScore({
      questionsUsed: 5,
      elapsedSeconds: 600,
      wrongGuesses: 0,
      won: true,
      streakBeforeRound: 0,
    });
    expect(result.preMultiplierScore).toBe(SCORING_RULES.MIN_SCORE_ON_WIN);
    expect(result.finalScore).toBe(SCORING_RULES.MIN_SCORE_ON_WIN);
  });

  it("applies wrong-guess penalties as extra effective seconds", () => {
    const withoutWrongGuesses = calculateRoundScore({
      questionsUsed: 0,
      elapsedSeconds: 10,
      wrongGuesses: 0,
      won: true,
      streakBeforeRound: 0,
    });
    const withWrongGuesses = calculateRoundScore({
      questionsUsed: 0,
      elapsedSeconds: 10,
      wrongGuesses: 2,
      won: true,
      streakBeforeRound: 0,
    });
    expect(withWrongGuesses.wrongGuessPenaltySeconds).toBe(20);
    expect(withWrongGuesses.finalScore).toBeLessThan(
      withoutWrongGuesses.finalScore
    );
  });

  it("applies the streak multiplier on top of the floored score", () => {
    const result = calculateRoundScore({
      questionsUsed: 5,
      elapsedSeconds: 600,
      wrongGuesses: 0,
      won: true,
      streakBeforeRound: 4,
    });
    // preMultiplierScore floored at 100, streak of 4 => 1.4x
    expect(result.preMultiplierScore).toBe(100);
    expect(result.streakMultiplier).toBeCloseTo(1.4);
    expect(result.finalScore).toBe(140);
  });

  it("scores a loss as 0 and resets the streak", () => {
    const result = calculateRoundScore({
      questionsUsed: 5,
      elapsedSeconds: 120,
      wrongGuesses: 3,
      won: false,
      streakBeforeRound: 6,
    });
    expect(result.finalScore).toBe(0);
    expect(result.newStreak).toBe(0);
    expect(result.won).toBe(false);
  });

  it("never returns a negative score for an extreme slow win", () => {
    const result = calculateRoundScore({
      questionsUsed: 5,
      elapsedSeconds: 100000,
      wrongGuesses: 50,
      won: true,
      streakBeforeRound: 0,
    });
    expect(result.finalScore).toBeGreaterThanOrEqual(
      SCORING_RULES.MIN_SCORE_ON_WIN
    );
  });
});
