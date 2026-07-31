import { aiService } from "../../modules/ai/ai.service.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";
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
  await ctx.reply(`🧠 ${explanation}\n\nИсточник результата: openfootball/football.json`);
}

export async function explainHelp(ctx: BotContext) {
  await ctx.reply(
    "Чтобы объяснить матч, найдите команду через /team и нажмите «🧠 Объяснить последний матч»."
  );
}
