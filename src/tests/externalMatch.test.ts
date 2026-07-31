import { describe, expect, it } from "vitest";
import { externalMatchScore, isLikelySameMatch } from "../utils/externalMatch.js";

describe("external match linking", () => {
  it("links common provider variants", () => {
    const score = externalMatchScore("Manchester United FC", "Chelsea FC", "Manchester United", "Chelsea");
    expect(isLikelySameMatch(score)).toBe(true);
  });

  it("links Russian aliases to provider names", () => {
    const score = externalMatchScore("Бавария", "ПСЖ", "FC Bayern München", "Paris Saint-Germain FC");
    expect(isLikelySameMatch(score)).toBe(true);
  });

  it("does not link unrelated fixtures", () => {
    const score = externalMatchScore("Arsenal", "Chelsea", "Bayern München", "Borussia Dortmund");
    expect(isLikelySameMatch(score)).toBe(false);
  });

  it("does not accept a reversed fixture", () => {
    const score = externalMatchScore("Arsenal", "Chelsea", "Chelsea", "Arsenal");
    expect(isLikelySameMatch(score)).toBe(false);
  });
});
