import { describe, expect, it } from "vitest";
import { splitTelegramMessage } from "../utils/telegram.js";

describe("Telegram message splitting", () => {
  it("splits long reports without exceeding the limit", () => {
    const chunks = splitTelegramMessage(Array.from({ length: 300 }, (_, index) => `Строка ${index}`).join("\n"), 200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.length <= 200)).toBe(true);
    expect(chunks.join("\n")).toContain("Строка 299");
  });
});
