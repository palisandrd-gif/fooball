import { describe, expect, it } from "vitest";
import { coachAiHasUnsupportedClaims, coachFallbackAnalysis } from "../modules/coach/coachAiSafety.js";
import { CoachAiPayload } from "../modules/coach/coach.types.js";

const payload: CoachAiPayload = {
  match: { homeTeam: "Crystal Palace", awayTeam: "Arsenal", score: "1:2", date: "2026-05-24", league: "Premier League" },
  availableData: { score: true, statistics: false, events: false, lineups: false, xg: false },
  statistics: null,
  events: null,
  recentForm: {}
};

describe("Coach AI safety", () => {
  it("rejects unsupported xG, possession and shot claims", () => {
    expect(coachAiHasUnsupportedClaims("Arsenal имел xG 2.1", payload)).toBe(true);
    expect(coachAiHasUnsupportedClaims("Владение составило 62%", payload)).toBe(true);
    expect(coachAiHasUnsupportedClaims("Команда нанесла 18 ударов", payload)).toBe(true);
  });

  it("creates a score-only fallback without invented statistics", () => {
    const output = coachFallbackAnalysis(payload);
    expect(output).toContain("1:2");
    expect(output).not.toMatch(/xG|владение|удар/iu);
  });
});
