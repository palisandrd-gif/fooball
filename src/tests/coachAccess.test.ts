import { describe, expect, it } from "vitest";
import { hasCoachAccess } from "../modules/coach/coachAccess.service.js";

describe("Coach access", () => {
  it("blocks Free and Pro", () => {
    expect(hasCoachAccess("FREE", false)).toBe(false);
    expect(hasCoachAccess("PRO", false)).toBe(false);
  });

  it("allows Coach and administrators", () => {
    expect(hasCoachAccess("COACH", false)).toBe(true);
    expect(hasCoachAccess("FREE", true)).toBe(true);
  });
});
