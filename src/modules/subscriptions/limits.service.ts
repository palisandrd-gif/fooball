import { randomUUID } from "node:crypto";
import { PlanType, Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { startOfUtcDay } from "../../utils/date.js";
import { subscriptionService } from "./subscription.service.js";
import { buildPlanLimits } from "./planLimits.js";

const planLimit = buildPlanLimits(env);

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

    // One INSERT ... ON CONFLICT statement makes the limit strict even when a user
    // sends several requests at the same time from different bot instances.
    const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      INSERT INTO "DailyUsage" ("id", "userId", "day", "count", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${userId}, ${day}, 1, NOW(), NOW())
      ON CONFLICT ("userId", "day") DO UPDATE
      SET "count" = "DailyUsage"."count" + 1, "updatedAt" = NOW()
      WHERE "DailyUsage"."count" < ${limit}
      RETURNING "count"
    `);

    if (!rows[0]) throw new LimitExceededError(limit);
    return { plan, used: rows[0].count, limit };
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
