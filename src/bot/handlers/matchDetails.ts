import { matchDetailsService } from "../../modules/analytics/matchDetails.service.js";
import { consumeRequest } from "../helpers.js";
import { BotContext } from "../types.js";

export async function showMatchDetails(ctx: BotContext, matchId: string) {
  if (!(await consumeRequest(ctx, true))) return;
  const details = await matchDetailsService.forMatch(matchId);
  await ctx.reply(
    details ?? "Для этого матча расширенная статистика пока недоступна. Основной результат сохранён."
  );
}
