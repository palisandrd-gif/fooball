import { describe, expect, it } from "vitest";
import {
  normalizeTeamName,
  similarityScore,
  transliterateCyrillic
} from "../utils/normalizeTeamName.js";
import { teamSearchScore } from "../utils/teamAliases.js";

describe("normalizeTeamName", () => {
  it("removes common club suffixes and punctuation", () => {
    expect(normalizeTeamName("Arsenal F.C.")).toBe("arsenal");
  });

  it("normalizes diacritics", () => {
    expect(normalizeTeamName("Atlético de Madrid CF")).toBe("atletico de madrid");
  });

  it("ranks an exact normalized match highest", () => {
    expect(similarityScore("Arsenal", "Arsenal FC")).toBe(100);
  });

  it("transliterates Russian team names", () => {
    expect(transliterateCyrillic("Арсенал")).toBe("arsenal");
    expect(normalizeTeamName("Манчестер Юнайтед")).toBe("manchester yunayted");
  });

  it("fuzzy-matches a Russian spelling to an English name", () => {
    expect(similarityScore("Челси", "Chelsea FC")).toBeGreaterThanOrEqual(45);
  });

  it.each([
    ["Бавария", "FC Bayern München"],
    ["ПСЖ", "Paris Saint-Germain FC"],
    ["Интер", "Internazionale Milano"],
    ["Ницца", "OGC Nice"]
  ])("matches Russian alias %s to %s", (query, team) => {
    expect(teamSearchScore(query, team)).toBe(100);
  });
});
