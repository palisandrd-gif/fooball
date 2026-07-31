import { describe, expect, it } from "vitest";
import { normalizeTeamName, similarityScore } from "../utils/normalizeTeamName.js";

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
});
