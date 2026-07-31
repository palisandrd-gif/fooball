import { leagueMenu } from "../keyboards/leagueMenu.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";
import { consumeRequest } from "../helpers.js";
import { formatMatches } from "../formatters.js";
import { BotContext } from "../types.js";

export async function beginResults(ctx: BotContext) {
  await ctx.reply("Выберите лигу:", leagueMenu("results"));
}

export async function showResults(ctx: BotContext, leagueCode: string) {
  if (!(await consumeRequest(ctx))) return;
  const matches = await matchSummaryService.latestResults(leagueCode);
  await ctx.reply(
    matches.length ? `📊 Последние результаты\n\n${formatMatches(matches)}` : "Для этой лиги результатов пока нет."
  );
}
