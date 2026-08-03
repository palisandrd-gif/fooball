import { BotContext } from "../types.js";
import { env } from "../../config/env.js";

export async function showSubscription(ctx: BotContext) {
  await ctx.reply(
    [
      "💳 Тарифы MatchMind",
      "",
      "Free",
      `• ${env.FREE_DAILY_LIMIT} запросов в день`,
      "• поиск команды",
      "• результаты и расписание",
      "",
      "Pro",
      `• ${env.PRO_DAILY_LIMIT} запросов в день`,
      "• история встреч",
      "• AI-объяснение",
      "• избранные команды",
      "",
      "Coach",
      `• ${env.COACH_DAILY_LIMIT} запросов в день`,
      "• отчёт по форме команды",
      "• расширенный разбор матча",
      "• сравнение двух команд",
      "• безопасный Coach AI",
      "• карты ударов, сети передач и PDF появятся в следующей версии",
      "",
      "На этапе MVP тариф меняет администратор."
    ].join("\n")
  );
}

export async function showSources(ctx: BotContext) {
  await ctx.reply(
    [
      "ℹ️ Источники данных",
      "",
      "Fixture and result data from openfootball/football.json",
      "",
      "Data source: StatsBomb Open Data",
      "Для части турниров доступны события, составы и xG StatsBomb.",
      "",
      "Current match statistics: API-Football",
      "Team profiles and artwork: TheSportsDB",
      "",
      "MatchMind Bot не является официальным продуктом перечисленных поставщиков."
    ].join("\n")
  );
}
