import { BotContext } from "../types.js";

export async function helpCommand(ctx: BotContext) {
  await ctx.reply(
    [
      "Команды MatchMind Bot:",
      "/team — найти команду",
      "/schedule — расписание",
      "/results — последние результаты",
      "/history — история встреч двух команд",
      "/favorites — избранные команды",
      "/explain — объяснить матч",
      "/coach — профессиональная Coach-аналитика",
      "/myplan — ваш тариф и лимит",
      "/subscribe — тарифы",
      "/sources — источники данных"
    ].join("\n")
  );
}
