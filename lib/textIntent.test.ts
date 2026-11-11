import { describe, expect, it } from "vitest";
import { extractGuessOverride, isLikelyQuestion } from "./textIntent";

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

  it("treats 'is it <name>' disguised guesses as a guess, not a question", () => {
    expect(isLikelyQuestion("Is it Joan of Arc")).toBe(false);
    expect(isLikelyQuestion("Is it Joan of Arc?")).toBe(false);
    expect(isLikelyQuestion("is it Cristiano Ronaldo")).toBe(false);
  });

  it("still treats genuine 'is it ...' questions as questions", () => {
    expect(isLikelyQuestion("Is it true they won an Oscar?")).toBe(true);
    expect(isLikelyQuestion("Is it a man")).toBe(true);
    expect(isLikelyQuestion("Is it still alive")).toBe(true);
  });

  it("treats 'Will <Surname>' as a guess, not a question", () => {
    expect(isLikelyQuestion("Will Smith")).toBe(false);
    expect(isLikelyQuestion("Will Ferrell")).toBe(false);
  });

  it("still treats genuine 'will ...' questions as questions", () => {
    expect(isLikelyQuestion("Will he win an Oscar")).toBe(true);
    expect(isLikelyQuestion("Will she be in the next film?")).toBe(true);
  });
});

describe("extractGuessOverride", () => {
  it("extracts the name from disguised-guess phrasing", () => {
    expect(extractGuessOverride("Is it Joan of Arc")).toBe("Joan of Arc");
    expect(extractGuessOverride("Is it Joan of Arc?")).toBe("Joan of Arc");
    expect(extractGuessOverride("I think it's Cristiano Ronaldo")).toBe(
      "Cristiano Ronaldo",
    );
    expect(extractGuessOverride("My guess is Beyonce")).toBe("Beyonce");
    expect(extractGuessOverride("Could it be Elon Musk?")).toBe("Elon Musk");
  });

  it("returns null for genuine questions that happen to start similarly", () => {
    expect(extractGuessOverride("Is it true they won an Oscar?")).toBeNull();
    expect(extractGuessOverride("Is it a man?")).toBeNull();
    expect(extractGuessOverride("Is it still alive")).toBeNull();
  });

  it("returns null for plain text with no guess-intent phrase", () => {
    expect(extractGuessOverride("Thierry Henry")).toBeNull();
    expect(extractGuessOverride("Are they still alive?")).toBeNull();
  });
});
