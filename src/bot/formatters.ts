import { formatMatchDate } from "../utils/date.js";

interface MatchView {
  id: string;
  kickoffAt: Date;
  round: string | null;
  homeTeam: { name: string };
  awayTeam: { name: string };
  result?: { homeGoals: number; awayGoals: number } | null;
}

export function formatMatches(matches: MatchView[]): string {
  return matches
    .map((match) => {
      const score = match.result
        ? `${match.result.homeGoals}:${match.result.awayGoals}`
        : "матч не сыгран";
      const round = match.round ? ` · ${match.round}` : "";
      return `${formatMatchDate(match.kickoffAt)}${round}\n${match.homeTeam.name} — ${match.awayTeam.name} · ${score}`;
    })
    .join("\n\n");
}

export function resultLabel(homeGoals: number, awayGoals: number, home: string, away: string) {
  if (homeGoals === awayGoals) return "Ничья";
  return `Победитель: ${homeGoals > awayGoals ? home : away}`;
}
