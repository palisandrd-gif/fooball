import { Markup } from "telegraf";

export const coachMenu = Markup.inlineKeyboard([
  [Markup.button.callback("📋 Отчёт по команде", "coach:team")],
  [Markup.button.callback("🔬 Разбор матча", "coach:match")],
  [Markup.button.callback("⚖️ Сравнить команды", "coach:compare")],
  [Markup.button.callback("📈 Форма команды", "coach:form")],
  [Markup.button.callback("ℹ️ Возможности Coach", "coach:about")]
]);
