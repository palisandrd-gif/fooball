import { Telegraf } from "telegraf";
import { adminTelegramIds } from "../../config/env.js";
import { logger } from "../../utils/logger.js";
import { BotContext } from "../types.js";
import { ADMIN_BOT_COMMANDS, USER_BOT_COMMANDS } from "./commandDefinitions.js";

export async function registerBotCommands(bot: Telegraf<BotContext>): Promise<void> {
  try {
    await bot.telegram.setMyCommands(USER_BOT_COMMANDS);
  } catch (error) {
    logger.warn({ error }, "Failed to register public Telegram commands");
  }

  for (const telegramId of adminTelegramIds) {
    try {
      await bot.telegram.setMyCommands([...USER_BOT_COMMANDS, ...ADMIN_BOT_COMMANDS], {
        scope: { type: "chat", chat_id: Number(telegramId) }
      });
    } catch (error) {
      logger.warn({ error, telegramId }, "Failed to register admin Telegram commands");
    }
  }
}

export { ADMIN_BOT_COMMANDS, USER_BOT_COMMANDS } from "./commandDefinitions.js";
