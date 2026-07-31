import { Markup } from "telegraf";
import { leagueMenu, seasonMenu } from "../keyboards/leagueMenu.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";
import { consumeRequest } from "../helpers.js";
import { formatMatchDate } from "../../utils/date.js";
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
  if (!matches.length) {
    await ctx.reply("Для этой лиги и сезона матчей нет.");
    return;
  }

  for (const match of matches) {
    const score = match.result
      ? `${match.result.homeGoals}:${match.result.awayGoals}`
      : "матч не сыгран";
    const round = match.round ? ` · ${match.round}` : "";
    await ctx.reply(
      `${formatMatchDate(match.kickoffAt)}${round}\n${match.homeTeam.name} — ${match.awayTeam.name} · ${score}`,
      Markup.inlineKeyboard([
        [Markup.button.callback("📊 Статистика матча", `details:${match.id}`)],
        [Markup.button.callback("🧠 Объяснить матч", `explain:${match.id}`)]
      ])
    );
  }
}
