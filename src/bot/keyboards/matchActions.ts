import { Markup } from "telegraf";

export function matchActions(matchId: string) {
  return Markup.inlineKeyboard([
    [Markup.button.callback("📊 Статистика матча", `details:${matchId}`)],
    [Markup.button.callback("🧠 Объяснить матч", `explain:${matchId}`)]
  ]);
}
