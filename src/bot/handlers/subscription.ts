import { BotContext } from "../types.js";

export async function showSubscription(ctx: BotContext) {
  await ctx.reply(
    [
      "💳 Тарифы MatchMind",
      "",
      "Free",
      "• 5 запросов в день",
      "• поиск команды",
      "• результаты и расписание",
      "",
      "Pro",
      "• 100 запросов в день",
      "• история встреч",
      "• AI-объяснение",
      "• избранные команды",
      "",
      "Coach — скоро",
      "Расширенные события и статистика уже тестируются; карты ударов, сети передач и отчёты появятся в следующей версии.",
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
