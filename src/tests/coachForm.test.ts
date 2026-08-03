import { describe, expect, it } from "vitest";
import { calculateTeamForm } from "../modules/coach/teamForm.service.js";
import { CoachFormMatch } from "../modules/coach/coach.types.js";

const team = "arsenal";
const matches: CoachFormMatch[] = [
  { id: "1", homeTeamId: "palace", awayTeamId: team, homeTeam: { name: "Palace" }, awayTeam: { name: "Arsenal" }, result: { homeGoals: 1, awayGoals: 2 } },
  { id: "2", homeTeamId: team, awayTeamId: "burnley", homeTeam: { name: "Arsenal" }, awayTeam: { name: "Burnley" }, result: { homeGoals: 1, awayGoals: 0 } },
  { id: "3", homeTeamId: "city", awayTeamId: team, homeTeam: { name: "City" }, awayTeam: { name: "Arsenal" }, result: { homeGoals: 2, awayGoals: 1 } },
  { id: "4", homeTeamId: team, awayTeamId: "chelsea", homeTeam: { name: "Arsenal" }, awayTeam: { name: "Chelsea" }, result: { homeGoals: 0, awayGoals: 0 } }
];

describe("Coach team form", () => {
  it("counts home and away outcomes and goals correctly", () => {
    const result = calculateTeamForm(team, matches);
    expect(result).toMatchObject({
      played: 4,
      wins: 2,
      draws: 1,
      losses: 1,
      goalsFor: 4,
      goalsAgainst: 3,
      cleanSheets: 2,
      form: ["В", "В", "П", "Н"]
    });
  });

  it("describes the current unbeaten streak from newest matches", () => {
    expect(calculateTeamForm(team, matches).streak).toBe("2 матча без поражений");
  });
});
