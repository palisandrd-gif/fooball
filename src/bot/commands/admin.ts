import { PlanType } from "@prisma/client";
import { adminTelegramIds } from "../../config/env.js";
import { adminService } from "../../modules/admin/admin.service.js";
import { subscriptionService } from "../../modules/subscriptions/subscription.service.js";
import { syncOpenFootball } from "../../modules/openfootball/openfootball.sync.js";
import { syncStatsBombBasic } from "../../modules/statsbomb/statsbomb.sync.js";
import { formatMatchDate } from "../../utils/date.js";
import { currentUser, isAdmin } from "../helpers.js";
import { BotContext } from "../types.js";

async function requireAdmin(ctx: BotContext): Promise<boolean> {
  if (!isAdmin(ctx, adminTelegramIds)) {
    await ctx.reply("Команда доступна только администратору.");
    return false;
  }
  return true;
}

export async function adminCommand(ctx: BotContext) {
  if (!(await requireAdmin(ctx))) return;
  const data = await adminService.dashboard();
  await ctx.reply(
    [
      "Панель администратора",
      `Пользователи: ${data.users}`,
      `Free: ${data.free}`,
      `Pro: ${data.pro}`,
      `Coach: ${data.coach}`,
      `Матчи: ${data.matches}`,
      `Последнее обновление: ${data.lastSync?.completedAt ? formatMatchDate(data.lastSync.completedAt) : "ещё не выполнялось"}`
    ].join("\n")
  );
}

export async function setPlanCommand(ctx: BotContext) {
  if (!(await requireAdmin(ctx))) return;
  const text = ctx.message && "text" in ctx.message ? ctx.message.text : "";
  const [, telegramId, rawPlan] = text.trim().split(/\s+/);
  const plan = rawPlan?.toUpperCase() as PlanType;
  if (!telegramId || !["FREE", "PRO", "COACH"].includes(plan)) {
    await ctx.reply("Использование: /setplan telegram_id free|pro|coach");
    return;
  }
  const admin = await currentUser(ctx);
  await subscriptionService.setPlan(telegramId, plan, admin.id);
  await ctx.reply(`Тариф пользователя ${telegramId} изменён на ${plan}.`);
}

export async function syncOpenFootballCommand(ctx: BotContext) {
  if (!(await requireAdmin(ctx))) return;
  await ctx.reply("Обновление футбольных данных запущено. Это может занять несколько минут.");
  try {
    const result = await syncOpenFootball();
    await ctx.reply(
      `Обновление завершено. Обработано матчей: ${result.records}. Пропущено наборов: ${result.warnings.length}.`
    );
  } catch {
    await ctx.reply("Не удалось обновить данные. Подробности записаны в журнал синхронизации.");
  }
}

export async function syncStatsBombCommand(ctx: BotContext) {
  if (!(await requireAdmin(ctx))) return;
  await ctx.reply("Базовое обновление StatsBomb запущено.");
  try {
    const result = await syncStatsBombBasic();
    await ctx.reply(
      `StatsBomb обновлён. Турниров: ${result.competitions}, матчей: ${result.matches}.`
    );
  } catch {
    await ctx.reply("Не удалось обновить StatsBomb. Попробуйте позже.");
  }
}
