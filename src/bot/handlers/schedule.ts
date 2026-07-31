import { leagueMenu, seasonMenu } from "../keyboards/leagueMenu.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";
import { consumeRequest } from "../helpers.js";
import { formatMatches } from "../formatters.js";
import { BotContext } from "../types.js";

export async function beginSchedule(ctx: BotContext) {
  await ctx.reply("Выберите лигу:", leagueMenu("schedule"));
}

export async function chooseScheduleSeason(ctx: BotContext, leagueCode: string) {
  await ctx.reply("Выберите сезон:", seasonMenu(leagueCode));
}

export async function showSchedule(ctx: BotContext, leagueCode: string, seasonName: string) {
  if (!(await consumeRequest(ctx))) return;
  const matches = await matchSummaryService.schedule(leagueCode, seasonName);
  await ctx.reply(
    matches.length
      ? `📅 Расписание · ${seasonName}\n\n${formatMatches(matches)}`
      : "Для этой лиги и сезона матчей нет."
  );
}
