import { formatMatchDate } from "../../utils/date.js";
import { matchDetailsService } from "../analytics/matchDetails.service.js";
import { matchSummaryService } from "../analytics/matchSummary.service.js";
import { coachAiService } from "./coachAi.service.js";
import { CoachAiPayload } from "./coach.types.js";

function resultSource(source: string): string {
  if (source === "STATSBOMB") return "Data source: StatsBomb Open Data";
  return "Источник результата: openfootball/football.json";
}

export const coachMatchService = {
  async report(matchId: string): Promise<string | undefined> {
    const match = await matchSummaryService.findFinishedMatch(matchId);
    if (!match?.result) return undefined;
    const details = await matchDetailsService.forMatch(matchId);
    const totalGoals = match.result.homeGoals + match.result.awayGoals;
    const difference = Math.abs(match.result.homeGoals - match.result.awayGoals);
    const winner = match.result.homeGoals === match.result.awayGoals
      ? "Ничья"
      : match.result.homeGoals > match.result.awayGoals
        ? match.homeTeam.name
        : match.awayTeam.name;
    const payload: CoachAiPayload = {
      match: {
        homeTeam: match.homeTeam.name,
        awayTeam: match.awayTeam.name,
        score: `${match.result.homeGoals}:${match.result.awayGoals}`,
        date: match.kickoffAt.toISOString().slice(0, 10),
        league: match.season.league.name
      },
      availableData: { score: true, statistics: false, events: false, lineups: false, xg: false },
      statistics: null,
      events: null,
      recentForm: {}
    };
    const explanation = await coachAiService.explain(payload);

    return [
      "🔬 Coach-разбор матча",
      `${match.homeTeam.name} — ${match.awayTeam.name}`,
      `Дата: ${formatMatchDate(match.kickoffAt)}`,
      `Турнир: ${match.season.league.name}`,
      `Сезон: ${match.season.name}`,
      match.round ? `Тур: ${match.round}` : undefined,
      `Счёт: ${match.result.homeGoals}:${match.result.awayGoals}`,
      `Результат: ${winner}`,
      `Голов: ${totalGoals}; разница: ${difference}`,
      resultSource(match.source),
      "",
      `🎯 Вывод: ${explanation}`,
      "",
      details ?? "Расширенные событийные показатели для этого матча не найдены. Вывод построен по итоговому счёту и истории результатов."
    ].filter((line) => line !== undefined).join("\n");
  }
};
