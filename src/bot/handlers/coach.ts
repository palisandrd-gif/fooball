import { Markup } from "telegraf";
import { prisma } from "../../db/prisma.js";
import { coachComparisonService } from "../../modules/coach/coachComparison.service.js";
import { coachMatchService } from "../../modules/coach/coachMatch.service.js";
import { teamFormService } from "../../modules/coach/teamForm.service.js";
import { splitTelegramMessage } from "../../utils/telegram.js";
import { formatMatches } from "../formatters.js";
import { requireCoachAccess } from "../helpers.js";
import { coachMenu } from "../keyboards/coachMenu.js";
import { BotContext, CoachMode } from "../types.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";

async function replyLong(ctx: BotContext, text: string) {
  for (const chunk of splitTelegramMessage(text)) await ctx.reply(chunk);
}

function formBlock(name: string, report: Awaited<ReturnType<typeof teamFormService.report>>): string {
  const form = report.form;
  return [
    `📈 ${name}`,
    `Матчей: ${form.played}`,
    `Победы / ничьи / поражения: ${form.wins} / ${form.draws} / ${form.losses}`,
    `Голы: ${form.goalsFor} забито, ${form.goalsAgainst} пропущено`,
    `Средние голы: ${form.averageGoalsFor.toFixed(2)} — ${form.averageGoalsAgainst.toFixed(2)}`,
    `Матчи без пропущенных голов: ${form.cleanSheets}`,
    `Форма (сначала последний матч): ${form.form.join("-") || "нет данных"}`,
    `Текущая серия: ${form.streak}`
  ].join("\n");
}

function formConclusion(wins: number, played: number): string {
  if (!played) return "Недостаточно сыгранных матчей для оценки формы.";
  if (wins >= Math.ceil(played * 0.7)) return "По последним результатам команда находится в хорошей форме.";
  if (wins <= Math.floor(played * 0.2)) return "Последние результаты команды нестабильны.";
  return "Последние результаты команды имеют смешанный характер.";
}

export async function showCoachMenu(ctx: BotContext) {
  if (!(await requireCoachAccess(ctx))) return;
  ctx.session = { action: "idle" };
  await ctx.reply("🎯 Coach-аналитика\nВыберите вид отчёта:", coachMenu);
}

export async function showCoachAbout(ctx: BotContext) {
  if (!(await requireCoachAccess(ctx))) return;
  await ctx.reply(
    [
      "ℹ️ Coach использует только подтверждённые данные.",
      "OpenFootball: результаты и расписание.",
      "API-Football: статистика и события, когда доступны.",
      "Data source: StatsBomb Open Data — xG, удары, передачи и составы для доступных матчей.",
      "Выводы описывают прошлые матчи и не гарантируют будущий результат."
    ].join("\n")
  );
}

export async function beginCoachQuery(ctx: BotContext, mode: CoachMode) {
  if (!(await requireCoachAccess(ctx))) return;
  ctx.session = { action: "coach_team_query", coachMode: mode };
  const prompt = mode === "compare"
    ? "Введите название первой команды:"
    : mode === "match"
      ? "Введите команду, чтобы выбрать её сыгранный матч:"
      : "Введите название команды для Coach-отчёта:";
  await ctx.reply(prompt);
}

export async function handleCoachText(ctx: BotContext, query: string) {
  if (!(await requireCoachAccess(ctx))) return;
  const mode = ctx.session.action === "coach_compare_second" ? "compare2" : ctx.session.coachMode;
  if (!mode) {
    await ctx.reply("Поиск устарел. Откройте /coach и начните заново.");
    return;
  }
  const teams = await matchSummaryService.findTeamCandidates(query);
  if (!teams.length) {
    await ctx.reply("Команда не найдена. Проверьте написание или попробуйте короткое название.");
    return;
  }
  await ctx.reply(
    "Выберите команду:",
    Markup.inlineKeyboard(
      teams.slice(0, 6).map((team) => [Markup.button.callback(team.name, `coach:select:${mode}:${team.id}`)])
    )
  );
}

async function showTeamReport(ctx: BotContext, teamId: string, formOnly: boolean) {
  if (!(await requireCoachAccess(ctx, true))) return;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return ctx.reply("Команда не найдена.");
  const report = await teamFormService.report(teamId);
  if (!report.form.played) return ctx.reply("Недостаточно сыгранных матчей для оценки формы.");
  const text = formOnly
    ? formBlock(team.name, report)
    : [
        `📋 Coach-отчёт: ${team.name}`,
        "",
        formBlock(team.name, report),
        `Вывод: ${formConclusion(report.form.wins, report.form.played)}`,
        "",
        "Последние матчи:",
        formatMatches(report.matches),
        "",
        "Ближайшие матчи:",
        report.upcoming.length ? formatMatches(report.upcoming) : "Нет ближайших матчей.",
        "",
        "Источник результатов: openfootball/football.json"
      ].join("\n");
  ctx.session = { action: "idle" };
  await replyLong(ctx, text);
}

async function showMatchChoices(ctx: BotContext, teamId: string) {
  if (!(await requireCoachAccess(ctx))) return;
  const matches = await matchSummaryService.recentForTeam(teamId, 5);
  if (!matches.length) return ctx.reply("Сыгранные матчи этой команды не найдены.");
  ctx.session = { action: "idle" };
  await ctx.reply(
    "Выберите матч для Coach-разбора:",
    Markup.inlineKeyboard(matches.map((match) => [
      Markup.button.callback(
        `${match.homeTeam.name} — ${match.awayTeam.name} ${match.result?.homeGoals}:${match.result?.awayGoals}`,
        `coach:match:${match.id}`
      )
    ]))
  );
}

async function startComparison(ctx: BotContext, teamId: string) {
  if (!(await requireCoachAccess(ctx))) return;
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return ctx.reply("Команда не найдена.");
  ctx.session = {
    action: "coach_compare_second",
    coachFirstTeamId: team.id,
    coachFirstTeamName: team.name
  };
  await ctx.reply(`Первая команда: ${team.name}\nВведите название второй команды:`);
}

async function finishComparison(ctx: BotContext, secondTeamId: string) {
  const firstTeamId = ctx.session.coachFirstTeamId;
  if (!firstTeamId) return ctx.reply("Сравнение устарело. Откройте /coach и начните заново.");
  if (firstTeamId === secondTeamId) return ctx.reply("Выберите две разные команды.");
  if (!(await requireCoachAccess(ctx, true))) return;
  const result = await coachComparisonService.compare(firstTeamId, secondTeamId);
  if (!result) return ctx.reply("Не удалось загрузить команды для сравнения.");
  const firstWins = result.first.form.wins;
  const secondWins = result.second.form.wins;
  const conclusion = firstWins === secondWins
    ? "По последним результатам команды показывают сопоставимую форму."
    : `По последним результатам ${firstWins > secondWins ? result.firstTeam.name : result.secondTeam.name} находится в более стабильной форме.`;
  const h2h = result.headToHead;
  ctx.session = { action: "idle" };
  await replyLong(ctx, [
    `⚖️ ${result.firstTeam.name} — ${result.secondTeam.name}`,
    "",
    formBlock(result.firstTeam.name, result.first),
    "",
    formBlock(result.secondTeam.name, result.second),
    "",
    "Очные встречи:",
    `Матчей: ${h2h.matches.length}`,
    `Побед ${result.firstTeam.name}: ${h2h.teamOneWins}`,
    `Побед ${result.secondTeam.name}: ${h2h.teamTwoWins}`,
    `Ничьих: ${h2h.draws}`,
    `Среднее голов: ${h2h.averageGoals.toFixed(2)}`,
    h2h.matches.length ? `\nПоследние встречи:\n${formatMatches(h2h.matches.slice(0, 5))}` : "Очные матчи не найдены.",
    "",
    `${conclusion} Это описание прошлых матчей, а не прогноз результата следующей игры.`,
    "",
    "Источник результатов: openfootball/football.json"
  ].join("\n"));
}

export async function selectCoachTeam(ctx: BotContext, mode: string, teamId: string) {
  if (mode === "team") return showTeamReport(ctx, teamId, false);
  if (mode === "form") return showTeamReport(ctx, teamId, true);
  if (mode === "match") return showMatchChoices(ctx, teamId);
  if (mode === "compare") return startComparison(ctx, teamId);
  if (mode === "compare2") return finishComparison(ctx, teamId);
  return ctx.reply("Неизвестный Coach-режим. Откройте /coach и попробуйте снова.");
}

export async function showCoachMatch(ctx: BotContext, matchId: string) {
  if (!(await requireCoachAccess(ctx, true))) return;
  const report = await coachMatchService.report(matchId);
  if (!report) return ctx.reply("Матч не найден или ещё не завершён.");
  await replyLong(ctx, report);
}
