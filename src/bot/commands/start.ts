import { BotContext } from "../types.js";
import { mainMenu } from "../keyboards/mainMenu.js";
import { currentUser } from "../helpers.js";

export async function startCommand(ctx: BotContext) {
  await currentUser(ctx);
  ctx.session = { action: "idle" };
  await ctx.reply(
    "Добро пожаловать в MatchMind Bot ⚽\n\nЗдесь можно быстро найти результаты, расписание и понятное объяснение матча.",
    mainMenu
  );
}
