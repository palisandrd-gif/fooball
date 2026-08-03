import { PlanType } from "@prisma/client";

export function hasCoachAccess(plan: PlanType, admin: boolean): boolean {
  return admin || plan === "COACH";
}
