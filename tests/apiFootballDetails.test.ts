import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("API-Football detail payloads", () => {
  it("accepts nullable venue and event detail fields", () => {
    const fixture = z.object({
      venue: z.object({ name: z.string().nullable().optional() }).nullable().optional()
    });
    const event = z.object({
      detail: z.string().nullable().optional(),
      player: z.object({ name: z.string().nullable().optional() }).nullable().optional()
    });

    expect(fixture.parse({ venue: null })).toEqual({ venue: null });
    expect(event.parse({ detail: null, player: null })).toEqual({ detail: null, player: null });
  });
});
