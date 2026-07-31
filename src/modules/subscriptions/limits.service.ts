import { PlanType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { startOfUtcDay } from "../../utils/date.js";
import { subscriptionService } from "./subscription.service.js";

const planLimit: Record<PlanType, number> = {
  FREE: env.FREE_DAILY_LIMIT,
  PRO: env.PRO_DAILY_LIMIT,
  COACH: env.PRO_DAILY_LIMIT
};

export class LimitExceededError extends Error {
  constructor(public readonly limit: number) {
    super(`Daily request limit exceeded: ${limit}`);
  }
}

export const limitsService = {
  async consume(userId: string, allowedPlans?: PlanType[]) {
    const plan = await subscriptionService.getPlan(userId);
    if (allowedPlans && !allowedPlans.includes(plan)) {
      throw new Error("PLAN_REQUIRED");
    }

    const day = startOfUtcDay();
    const limit = planLimit[plan];

    return prisma.$transaction(async (tx) => {
      const usage = await tx.dailyUsage.upsert({
        where: { userId_day: { userId, day } },
        create: { userId, day, count: 0 },
        update: {}
      });

      if (usage.count >= limit) throw new LimitExceededError(limit);

      const updated = await tx.dailyUsage.update({
        where: { id: usage.id },
        data: { count: { increment: 1 } }
      });
      return { plan, used: updated.count, limit };
    });
  },

  async status(userId: string) {
    const plan = await subscriptionService.getPlan(userId);
    const day = startOfUtcDay();
    const usage = await prisma.dailyUsage.findUnique({
      where: { userId_day: { userId, day } }
    });
    return { plan, used: usage?.count ?? 0, limit: planLimit[plan] };
  }
};
