import { PlanType } from "@prisma/client";

export interface PlanLimitConfig {
  FREE_DAILY_LIMIT: number;
  PRO_DAILY_LIMIT: number;
  COACH_DAILY_LIMIT: number;
}

export function buildPlanLimits(config: PlanLimitConfig): Record<PlanType, number> {
  return {
    FREE: config.FREE_DAILY_LIMIT,
    PRO: config.PRO_DAILY_LIMIT,
    COACH: config.COACH_DAILY_LIMIT
  };
}
