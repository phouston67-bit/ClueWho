import { describe, it, expect } from "vitest";
import { isGuessMatch, diceCoefficient, normalize } from "./similarity";

describe("normalize", () => {
  it("lowercases, strips accents and punctuation, collapses whitespace", () => {
    expect(normalize("Kylian Mbappé!")).toBe("kylian mbappe");
    expect(normalize("  Thierry   Henry ")).toBe("thierry henry");
  });
});

describe("isGuessMatch", () => {
  it("matches the exact full name", () => {
    expect(isGuessMatch("Thierry Henry", "Thierry Henry")).toBe(true);
  });

  it("allows a surname-only guess for a multi-word name", () => {
    expect(isGuessMatch("Henry", "Thierry Henry")).toBe(true);
  });

  it("allows a first-name-only guess for a multi-word name", () => {
    expect(isGuessMatch("Thierry", "Thierry Henry")).toBe(true);
  });

  it("tolerates a minor typo in a surname-only guess", () => {
    expect(isGuessMatch("Henri", "Thierry Henry")).toBe(true);
    expect(isGuessMatch("Mbape", "Kylian Mbappé")).toBe(true);
  });

  it("matches a well-known mononym exactly", () => {
    expect(isGuessMatch("Pele", "Pelé")).toBe(true);
    expect(isGuessMatch("pele", "Pelé")).toBe(true);
  });

  it("rejects an unrelated guess", () => {
    expect(isGuessMatch("Beckham", "Thierry Henry")).toBe(false);
    expect(isGuessMatch("Messi", "Thierry Henry")).toBe(false);
  });

  it("rejects a too-short/ambiguous guess even if it's a substring", () => {
    expect(isGuessMatch("he", "Thierry Henry")).toBe(false);
  });

  it("matches a listed alias", () => {
    expect(isGuessMatch("Ronaldo de Assis Moreira", "Ronaldinho", ["Ronaldo de Assis Moreira"])).toBe(
      true
    );
  });
});

describe("diceCoefficient", () => {
  it("returns 1 for identical strings", () => {
    expect(diceCoefficient("messi", "messi")).toBe(1);
  });

  it("returns 0 for completely dissimilar strings", () => {
    expect(diceCoefficient("messi", "xyz")).toBe(0);
  });
});
