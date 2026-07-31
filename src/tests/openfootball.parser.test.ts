import { describe, expect, it } from "vitest";
import { parseOpenFootballDataset } from "../modules/openfootball/openfootball.parser.js";

describe("parseOpenFootballDataset", () => {
  it("parses a finished match and creates a stable key", () => {
    const result = parseOpenFootballDataset(
      {
        name: "Premier League 2024/25",
        matches: [
          {
            round: "Matchday 1",
            date: "2024-08-17",
            time: "15:00",
            team1: "Arsenal FC",
            team2: "Chelsea FC",
            score: { ft: [3, 1], ht: [1, 0] }
          }
        ]
      },
      "EPL",
      "2024-25"
    );

    expect(result[0]).toMatchObject({
      homeNormalized: "arsenal",
      awayNormalized: "chelsea",
      status: "FINISHED",
      fullTime: [3, 1]
    });
    expect(result[0].externalKey).toHaveLength(64);
  });
});
