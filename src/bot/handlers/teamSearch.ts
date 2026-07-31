import { Markup } from "telegraf";
import { prisma } from "../../db/prisma.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";
import { teamSearchScore } from "../../utils/teamAliases.js";
import { consumeRequest, requireProAccess } from "../helpers.js";
import { formatMatches } from "../formatters.js";
import { BotContext } from "../types.js";

export async function beginTeamSearch(ctx: BotContext) {
  ctx.session = { action: "team_search" };
  await ctx.reply("Введите название команды — можно на русском или английском:");
}

export async function handleTeamSearchText(ctx: BotContext, query: string) {
  if (!(await consumeRequest(ctx))) return;
  const teams = (await matchSummaryService.findTeamCandidates(query))
    .map((team) => ({ ...team, score: teamSearchScore(query, team.name) }))
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
    team.country ? `Страна: ${team.country}` : undefined,
    team.stadium ? `Стадион: ${team.stadium}` : undefined,
    team.websiteUrl ? `Сайт: ${team.websiteUrl}` : undefined,
    `Доступные сезоны: ${seasons.join(", ") || "нет данных"}`,
    "",
    "Последние матчи:",
    recent.length ? formatMatches(recent) : "Нет сыгранных матчей.",
    "",
    "Ближайшие матчи:",
    upcoming.length ? formatMatches(upcoming) : "Нет ближайших матчей."
  ].filter((line) => line !== undefined).join("\n");

  const buttons = [[Markup.button.callback("⭐ Добавить в избранное", `fav:add:${team.id}`)]];
  if (recent[0]) {
    buttons.push([Markup.button.callback("📊 Статистика матча", `details:${recent[0].id}`)]);
    buttons.push([Markup.button.callback("🧠 Объяснить последний матч", `explain:${recent[0].id}`)]);
  }
  if (team.badgeUrl) {
    try {
      await ctx.replyWithPhoto(team.badgeUrl, {
        caption: text.slice(0, 1000),
        ...Markup.inlineKeyboard(buttons)
      });
      return;
    } catch {
      // A remote badge can disappear; the team card must still remain usable.
    }
    await ctx.reply(text.slice(0, 3900), Markup.inlineKeyboard(buttons));
  } else {
    await ctx.reply(text.slice(0, 3900), Markup.inlineKeyboard(buttons));
  }
}

export async function addFavorite(ctx: BotContext, teamId: string) {
  const user = await requireProAccess(ctx);
  if (!user) {
    await ctx.answerCbQuery("Нужен тариф Pro");
    return;
  }
  await prisma.favoriteTeam.upsert({
    where: { userId_teamId: { userId: user.id, teamId } },
    create: { userId: user.id, teamId },
    update: {}
  });
  await ctx.answerCbQuery("Добавлено в избранное");
}
