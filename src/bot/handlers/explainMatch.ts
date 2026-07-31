import { aiService } from "../../modules/ai/ai.service.js";
import { withDetailsNotice } from "../../modules/ai/aiSafety.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";
import { matchDetailsService } from "../../modules/analytics/matchDetails.service.js";
import { consumeRequest } from "../helpers.js";
import { BotContext } from "../types.js";

export async function explainMatch(ctx: BotContext, matchId: string) {
  if (!(await consumeRequest(ctx, true))) return;
  const match = await matchSummaryService.findFinishedMatch(matchId);
  if (!match?.result) {
    await ctx.reply("Сыгранный матч не найден.");
    return;
  }
  const explanation = await aiService.explainMatch({
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    homeGoals: match.result.homeGoals,
    awayGoals: match.result.awayGoals,
    date: match.kickoffAt.toISOString().slice(0, 10),
    league: match.season.league.name
  });
  const details = await matchDetailsService.forMatch(matchId);
  const visibleExplanation = withDetailsNotice(explanation, Boolean(details));
  await ctx.reply(
    [
      `🧠 ${visibleExplanation}`,
      "Источник результата: openfootball/football.json",
      details
    ].filter(Boolean).join("\n\n").slice(0, 4096)
  );
}

export async function explainHelp(ctx: BotContext) {
  await ctx.reply(
    "Чтобы объяснить матч, найдите команду через /team и нажмите «🧠 Объяснить последний матч»."
  );
}
