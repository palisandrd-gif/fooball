import { limitsService } from "../../modules/subscriptions/limits.service.js";
import { currentUser } from "../helpers.js";
import { BotContext } from "../types.js";

export async function myPlanCommand(ctx: BotContext) {
  const user = await currentUser(ctx);
  const status = await limitsService.status(user.id);
  await ctx.reply(
    `Ваш тариф: ${status.plan}\nЗапросов сегодня: ${status.used} из ${status.limit}`
  );
}
