import { BotContext } from "./types.js";
import { userService } from "../modules/users/user.service.js";
import { LimitExceededError, limitsService } from "../modules/subscriptions/limits.service.js";

export async function currentUser(ctx: BotContext) {
  if (!ctx.from) throw new Error("Telegram user is missing");
  return userService.register({
    telegramId: ctx.from.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name
  });
}

export async function consumeRequest(ctx: BotContext, proOnly = false) {
  const user = await currentUser(ctx);
  try {
    await limitsService.consume(user.id, proOnly ? ["PRO", "COACH"] : undefined);
    return user;
  } catch (error) {
    if (error instanceof LimitExceededError) {
      await ctx.reply(
        `Вы использовали дневной лимит (${error.limit} запросов). Попробуйте завтра или выберите тариф Pro.`
      );
      return null;
    }
    if ((error as Error).message === "PLAN_REQUIRED") {
      await ctx.reply("Эта функция доступна на тарифе Pro. Откройте раздел «💳 Подписка».");
      return null;
    }
    throw error;
  }
}

export async function requireProAccess(ctx: BotContext) {
  const user = await currentUser(ctx);
  if (!user.subscription || user.subscription.plan === "FREE") {
    await ctx.reply("Эта функция доступна на тарифе Pro. Откройте раздел «💳 Подписка».");
    return null;
  }
  return user;
}

export function isAdmin(ctx: BotContext, adminIds: Set<string>): boolean {
  return Boolean(ctx.from && adminIds.has(String(ctx.from.id)));
}
