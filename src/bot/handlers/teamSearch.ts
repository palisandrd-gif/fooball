import { Markup } from "telegraf";
import { prisma } from "../../db/prisma.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";
import { similarityScore } from "../../utils/normalizeTeamName.js";
import { consumeRequest, currentUser } from "../helpers.js";
import { formatMatches } from "../formatters.js";
import { BotContext } from "../types.js";

export async function beginTeamSearch(ctx: BotContext) {
  ctx.session = { action: "team_search" };
  await ctx.reply("Введите название команды:");
}

export async function handleTeamSearchText(ctx: BotContext, query: string) {
  if (!(await consumeRequest(ctx))) return;
  const teams = (await matchSummaryService.findTeamCandidates(query))
    .map((team) => ({ ...team, score: similarityScore(query, team.name) }))
    .filter((team) => team.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  if (!teams.length) {
    await ctx.reply("Команда не найдена. Проверьте написание или попробуйте короткое название.");
    return;
  }
  ctx.session = { action: "idle" };
  await ctx.reply(
    "Выберите команду:",
    Markup.inlineKeyboard(
      teams.map((team) => [Markup.button.callback(team.name, `team:${team.id}`)])
    )
  );
}

export async function showTeam(ctx: BotContext, teamId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      homeMatches: { select: { season: { select: { name: true } } }, take: 50 },
      awayMatches: { select: { season: { select: { name: true } } }, take: 50 }
    }
  });
  if (!team) return ctx.reply("Команда больше недоступна.");

  const [recent, upcoming] = await Promise.all([
    matchSummaryService.recentForTeam(team.id),
    matchSummaryService.upcomingForTeam(team.id)
  ]);
  const seasons = [
    ...new Set([
      ...team.homeMatches.map((item) => item.season.name),
      ...team.awayMatches.map((item) => item.season.name)
    ])
  ].sort();

  const text = [
    `⚽ ${team.name}`,
    `Доступные сезоны: ${seasons.join(", ") || "нет данных"}`,
    "",
    "Последние матчи:",
    recent.length ? formatMatches(recent) : "Нет сыгранных матчей.",
    "",
    "Ближайшие матчи:",
    upcoming.length ? formatMatches(upcoming) : "Нет ближайших матчей."
  ].join("\n");

  const buttons = [[Markup.button.callback("⭐ Добавить в избранное", `fav:add:${team.id}`)]];
  if (recent[0]) buttons.push([Markup.button.callback("🧠 Объяснить последний матч", `explain:${recent[0].id}`)]);
  await ctx.reply(text.slice(0, 3900), Markup.inlineKeyboard(buttons));
}

export async function addFavorite(ctx: BotContext, teamId: string) {
  const user = await currentUser(ctx);
  await prisma.favoriteTeam.upsert({
    where: { userId_teamId: { userId: user.id, teamId } },
    create: { userId: user.id, teamId },
    update: {}
  });
  await ctx.answerCbQuery("Добавлено в избранное");
}
