import { teamSearchScore } from "./teamAliases.js";

export function externalMatchScore(
  homeTeam: string,
  awayTeam: string,
  candidateHomeTeam: string,
  candidateAwayTeam: string
): number {
  return teamSearchScore(homeTeam, candidateHomeTeam) + teamSearchScore(awayTeam, candidateAwayTeam);
}

export function isLikelySameMatch(score: number): boolean {
  return score >= 120;
}
