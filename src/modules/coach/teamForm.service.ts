import { matchSummaryService } from "../analytics/matchSummary.service.js";
import { CoachFormMatch, FormSymbol, TeamFormAnalysis } from "./coach.types.js";

function symbolFor(teamId: string, match: CoachFormMatch): FormSymbol | undefined {
  if (!match.result) return undefined;
  const goalsFor = match.homeTeamId === teamId ? match.result.homeGoals : match.result.awayGoals;
  const goalsAgainst = match.homeTeamId === teamId ? match.result.awayGoals : match.result.homeGoals;
  return goalsFor === goalsAgainst ? "Н" : goalsFor > goalsAgainst ? "В" : "П";
}

function streakLabel(form: FormSymbol[]): string {
  if (!form.length) return "нет данных";
  if (form[0] === "П") {
    const losses = form.findIndex((item) => item !== "П");
    const count = losses === -1 ? form.length : losses;
    return `${count} ${count === 1 ? "поражение" : count < 5 ? "поражения" : "поражений"} подряд`;
  }
  const unbeaten = form.findIndex((item) => item === "П");
  const count = unbeaten === -1 ? form.length : unbeaten;
  return `${count} ${count === 1 ? "матч" : count < 5 ? "матча" : "матчей"} без поражений`;
}

export function calculateTeamForm(teamId: string, matches: CoachFormMatch[]): TeamFormAnalysis {
  const completed = matches.filter((match) => match.result);
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let cleanSheets = 0;
  const form: FormSymbol[] = [];

  for (const match of completed) {
    const home = match.homeTeamId === teamId;
    const scored = home ? match.result!.homeGoals : match.result!.awayGoals;
    const conceded = home ? match.result!.awayGoals : match.result!.homeGoals;
    const symbol = symbolFor(teamId, match)!;
    goalsFor += scored;
    goalsAgainst += conceded;
    if (conceded === 0) cleanSheets += 1;
    if (symbol === "В") wins += 1;
    else if (symbol === "Н") draws += 1;
    else losses += 1;
    form.push(symbol);
  }

  return {
    played: completed.length,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    averageGoalsFor: completed.length ? goalsFor / completed.length : 0,
    averageGoalsAgainst: completed.length ? goalsAgainst / completed.length : 0,
    cleanSheets,
    form,
    streak: streakLabel(form)
  };
}

export const teamFormService = {
  async report(teamId: string) {
    const [matches, upcoming] = await Promise.all([
      matchSummaryService.recentForTeam(teamId, 5),
      matchSummaryService.upcomingForTeam(teamId, 5)
    ]);
    return { matches, upcoming, form: calculateTeamForm(teamId, matches) };
  }
};
