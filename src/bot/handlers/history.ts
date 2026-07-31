import { Markup } from "telegraf";
import { headToHeadService } from "../../modules/analytics/headToHead.service.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";
import { teamSearchScore } from "../../utils/teamAliases.js";
import { consumeRequest } from "../helpers.js";
import { formatMatches } from "../formatters.js";
import { BotContext } from "../types.js";

export async function beginHistory(ctx: BotContext) {
  ctx.session = { action: "history_team_one" };
  await ctx.reply("Введите название первой команды — можно на русском или английском:");
}

async function candidateButtons(query: string, prefix: string) {
  const teams = (await matchSummaryService.findTeamCandidates(query))
    .map((team) => ({ ...team, score: teamSearchScore(query, team.name) }))
    .filter((team) => team.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  return teams.map((team) => [Markup.button.callback(team.name, `${prefix}:${team.id}`)]);
}

export async function handleHistoryText(ctx: BotContext, query: string) {
  const prefix = ctx.session.action === "history_team_one" ? "h2h1" : "h2h2";
  const buttons = await candidateButtons(query, prefix);
  if (!buttons.length) {
    await ctx.reply("Команда не найдена. Попробуйте другое написание.");
    return;
  }
  await ctx.reply("Выберите команду:", Markup.inlineKeyboard(buttons));
}

export async function selectFirstHistoryTeam(ctx: BotContext, teamId: string, teamName: string) {
  ctx.session = { action: "history_team_two", firstTeamId: teamId, firstTeamName: teamName };
  await ctx.reply(
    `Первая команда: ${teamName}\nВведите название второй команды — можно на русском или английском:`
  );
}

export async function selectSecondHistoryTeam(
  ctx: BotContext,
  teamId: string,
  teamName: string
) {
  const firstTeamId = ctx.session.firstTeamId;
  const firstTeamName = ctx.session.firstTeamName;
  if (!firstTeamId || !firstTeamName) {
    await ctx.reply("Поиск устарел. Начните заново командой /history.");
    return;
  }
  if (firstTeamId === teamId) {
    await ctx.reply("Выберите две разные команды.");
    return;
  }
  if (!(await consumeRequest(ctx, true))) return;

  const result = await headToHeadService.calculate(firstTeamId, teamId);
  ctx.session = { action: "idle" };
  if (!result.matches.length) {
    await ctx.reply("Очные матчи этих команд в базе не найдены.");
    return;
  }
  await ctx.reply(
    [
      `🔎 ${firstTeamName} — ${teamName}`,
      `Матчей: ${result.matches.length}`,
      `Побед ${firstTeamName}: ${result.teamOneWins}`,
      `Побед ${teamName}: ${result.teamTwoWins}`,
      `Ничьих: ${result.draws}`,
      `Среднее голов: ${result.averageGoals.toFixed(2)}`,
      "",
      "Последние 5 встреч:",
      formatMatches(result.matches.slice(0, 5))
    ].join("\n")
  );
}
