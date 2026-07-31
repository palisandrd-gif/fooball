import { Markup } from "telegraf";
import { prisma } from "../../db/prisma.js";
import { matchSummaryService } from "../../modules/analytics/matchSummary.service.js";
import { consumeRequest, currentUser } from "../helpers.js";
import { formatMatches } from "../formatters.js";
import { BotContext } from "../types.js";

export async function showFavorites(ctx: BotContext) {
  const user = await consumeRequest(ctx, true);
  if (!user) return;
  const favorites = await prisma.favoriteTeam.findMany({
    where: { userId: user.id },
    include: { team: true },
    orderBy: { createdAt: "asc" }
  });
  if (!favorites.length) {
    await ctx.reply("Избранных команд пока нет. Найдите команду через /team и добавьте её.");
    return;
  }

  for (const favorite of favorites) {
    const recent = await matchSummaryService.recentForTeam(favorite.teamId, 3);
    await ctx.reply(
      [`⭐ ${favorite.team.name}`, recent.length ? formatMatches(recent) : "Результатов пока нет."].join("\n\n"),
      Markup.inlineKeyboard([
        [Markup.button.callback("Удалить из избранного", `fav:remove:${favorite.teamId}`)]
      ])
    );
  }
}

export async function removeFavorite(ctx: BotContext, teamId: string) {
  const user = await currentUser(ctx);
  await prisma.favoriteTeam.deleteMany({ where: { userId: user.id, teamId } });
  await ctx.answerCbQuery("Удалено из избранного");
}
