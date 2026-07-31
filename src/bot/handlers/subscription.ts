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
      "Расширенные события, карты ударов, сети передач и отчёты появятся в следующей версии.",
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
      "Для части турниров доступны расширенные данные StatsBomb. Глубокая аналитика появится в следующей версии.",
      "",
      "MatchMind Bot не является официальным продуктом StatsBomb."
    ].join("\n")
  );
}
