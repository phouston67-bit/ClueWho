import { describe, expect, it } from "vitest";
import { isLikelyQuestion } from "./textIntent";

describe("isLikelyQuestion", () => {
  it("treats trailing question marks as questions", () => {
    expect(isLikelyQuestion("Are they still alive?")).toBe(true);
    expect(isLikelyQuestion("alive?")).toBe(true);
  });

  it("treats common question-starter words as questions", () => {
    expect(isLikelyQuestion("Is he an actor")).toBe(true);
    expect(isLikelyQuestion("does she play tennis")).toBe(true);
    expect(isLikelyQuestion("Has he won an Oscar")).toBe(true);
    expect(isLikelyQuestion("Was she born in France")).toBe(true);
    expect(isLikelyQuestion("Who is this")).toBe(true);
  });

  it("treats short name-like input as a guess", () => {
    expect(isLikelyQuestion("Thierry Henry")).toBe(false);
    expect(isLikelyQuestion("Henry")).toBe(false);
    expect(isLikelyQuestion("Cristiano Ronaldo")).toBe(false);
    expect(isLikelyQuestion("Messi")).toBe(false);
  });

  it("treats long sentence-like input without a question word as a question", () => {
    expect(isLikelyQuestion("plays a sport professionally for a living")).toBe(
      true,
    );
  });

  it("treats empty input as not a question", () => {
    expect(isLikelyQuestion("")).toBe(false);
    expect(isLikelyQuestion("   ")).toBe(false);
  });
});
