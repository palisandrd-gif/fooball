import { describe, expect, it } from "vitest";
import { buildPlanLimits } from "../modules/subscriptions/planLimits.js";

describe("plan limits", () => {
  it("uses a dedicated Coach limit", () => {
    expect(buildPlanLimits({ FREE_DAILY_LIMIT: 5, PRO_DAILY_LIMIT: 100, COACH_DAILY_LIMIT: 500 })).toEqual({
      FREE: 5,
      PRO: 100,
      COACH: 500
    });
  });
});
