import { session, Telegraf } from "telegraf";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { logger } from "../utils/logger.js";
import {
  adminCommand,
  setPlanCommand,
  syncApiFootballCommand,
  syncOpenFootballCommand,
  syncStatsBombCommand,
  syncStatsBombDetailsCommand,
  syncTheSportsDbCommand
} from "./commands/admin.js";
import { helpCommand } from "./commands/help.js";
import { myPlanCommand } from "./commands/myplan.js";
import { startCommand } from "./commands/start.js";
import { explainHelp, explainMatch } from "./handlers/explainMatch.js";
import { showMatchDetails } from "./handlers/matchDetails.js";
import { removeFavorite, showFavorites } from "./handlers/favorites.js";
import {
  beginHistory,
  handleHistoryText,
  selectFirstHistoryTeam,
  selectSecondHistoryTeam
} from "./handlers/history.js";
import { beginResults, showResults } from "./handlers/results.js";
import { beginSchedule, chooseScheduleSeason, showSchedule } from "./handlers/schedule.js";
import { showSources, showSubscription } from "./handlers/subscription.js";
import {
  addFavorite,
  beginTeamSearch,
  handleTeamSearchText,
  showTeam
} from "./handlers/teamSearch.js";
import { BotContext } from "./types.js";

const bot = new Telegraf<BotContext>(env.BOT_TOKEN);
bot.use(session({ defaultSession: () => ({ action: "idle" as const }) }));

bot.start(startCommand);
bot.help(helpCommand);
bot.command("myplan", myPlanCommand);
bot.command("team", beginTeamSearch);
bot.command("schedule", beginSchedule);
bot.command("results", beginResults);
bot.command("history", beginHistory);
bot.command("favorites", showFavorites);
bot.command("subscribe", showSubscription);
bot.command("sources", showSources);
bot.command("explain", explainHelp);
bot.command("admin", adminCommand);
bot.command("setplan", setPlanCommand);
bot.command("sync_openfootball", syncOpenFootballCommand);
bot.command("sync_statsbomb_basic", syncStatsBombCommand);
bot.command("sync_statsbomb_details", syncStatsBombDetailsCommand);
bot.command("sync_api_football", syncApiFootballCommand);
bot.command("sync_thesportsdb", syncTheSportsDbCommand);

bot.hears("⚽ Найти команду", beginTeamSearch);
bot.hears("📅 Расписание", beginSchedule);
bot.hears("📊 Последние результаты", beginResults);
bot.hears("🔎 История матчей", beginHistory);
bot.hears("🧠 Объяснить матч", explainHelp);
bot.hears("⭐ Избранные команды", showFavorites);
bot.hears("💳 Подписка", showSubscription);
bot.hears("ℹ️ Источники данных", showSources);

bot.action(/^team:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showTeam(ctx, ctx.match[1]);
});
bot.action(/^fav:add:(.+)$/, (ctx) => addFavorite(ctx, ctx.match[1]));
bot.action(/^fav:remove:(.+)$/, (ctx) => removeFavorite(ctx, ctx.match[1]));
bot.action(/^schedule:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await chooseScheduleSeason(ctx, ctx.match[1]);
});
bot.action(/^season:([^:]+):(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showSchedule(ctx, ctx.match[1], ctx.match[2]);
});
bot.action(/^results:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showResults(ctx, ctx.match[1]);
});
bot.action(/^explain:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await explainMatch(ctx, ctx.match[1]);
});
bot.action(/^details:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  await showMatchDetails(ctx, ctx.match[1]);
});
bot.action(/^h2h1:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const team = await prisma.team.findUnique({ where: { id: ctx.match[1] } });
  if (team) await selectFirstHistoryTeam(ctx, team.id, team.name);
});
bot.action(/^h2h2:(.+)$/, async (ctx) => {
  await ctx.answerCbQuery();
  const team = await prisma.team.findUnique({ where: { id: ctx.match[1] } });
  if (team) await selectSecondHistoryTeam(ctx, team.id, team.name);
});

bot.on("text", async (ctx) => {
  if (ctx.message.text.startsWith("/")) return;
  if (ctx.session.action === "team_search") {
    await handleTeamSearchText(ctx, ctx.message.text);
  } else if (["history_team_one", "history_team_two"].includes(ctx.session.action)) {
    await handleHistoryText(ctx, ctx.message.text);
  } else {
    await ctx.reply("Выберите действие в меню или используйте /help.");
  }
});

bot.catch(async (error, ctx) => {
  logger.error({ error, updateId: ctx.update.update_id }, "Bot update failed");
  await ctx.reply("Что-то пошло не так. Попробуйте ещё раз позже.").catch(() => undefined);
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Stopping MatchMind Bot");
  bot.stop(signal);
  await prisma.$disconnect();
}

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

bot.launch({ dropPendingUpdates: true }).then(() => {
  logger.info("MatchMind Bot started");
});
