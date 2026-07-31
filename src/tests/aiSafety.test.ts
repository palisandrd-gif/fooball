import { describe, expect, it } from "vitest";
import { fallbackExplanation, hasUnsupportedClaims } from "../modules/ai/aiSafety.js";

const match = {
  homeTeam: "Arsenal",
  awayTeam: "Chelsea",
  homeGoals: 3,
  awayGoals: 1,
  date: "2026-01-01",
  league: "Premier League"
};

describe("AI explanation safety", () => {
  it("creates an explanation using only score facts", () => {
    const output = fallbackExplanation(match);
    expect(output).toContain("3:1");
    expect(output).toContain("Без событийных данных");
    expect(hasUnsupportedClaims(output)).toBe(false);
  });

  it.each([
    "Arsenal dominated xG 2.4 to 0.4",
    "Команда нанесла 18 ударов",
    "Владение составило 64%",
    "Arsenal контролировал центр поля"
  ])("rejects unsupported model claim: %s", (output) => {
    expect(hasUnsupportedClaims(output)).toBe(true);
  });
});
