import { PlanType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

export const subscriptionService = {
  async getPlan(userId: string): Promise<PlanType> {
    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    return subscription?.plan ?? "FREE";
  },

  async setPlan(telegramId: string, plan: PlanType, adminUserId?: string) {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) }
    });
    if (!user) throw new Error("Пользователь не найден. Он должен сначала выполнить /start.");

    const subscription = await prisma.subscription.upsert({
      where: { userId: user.id },
      create: { userId: user.id, plan },
      update: { plan, startsAt: new Date(), expiresAt: null }
    });

    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: "subscription.plan_changed",
        metadata: { targetTelegramId: telegramId, plan }
      }
    });
    return subscription;
  }
};
