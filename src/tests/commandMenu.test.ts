import { describe, expect, it } from "vitest";
import { ADMIN_BOT_COMMANDS, USER_BOT_COMMANDS } from "../bot/commands/commandDefinitions.js";

describe("Telegram slash command menu", () => {
  it("contains every registered public slash command", () => {
    expect(USER_BOT_COMMANDS.map((item) => item.command)).toEqual([
      "start",
      "help",
      "team",
      "schedule",
      "results",
      "history",
      "favorites",
      "explain",
      "coach",
      "myplan",
      "subscribe",
      "sources"
    ]);
  });

  it("contains every registered administrator slash command", () => {
    expect(ADMIN_BOT_COMMANDS.map((item) => item.command)).toEqual([
      "admin",
      "setplan",
      "sync_openfootball",
      "sync_statsbomb_basic",
      "sync_statsbomb_details",
      "sync_api_football",
      "sync_thesportsdb"
    ]);
  });

  it("uses Telegram-compatible names and descriptions", () => {
    const commands = [...USER_BOT_COMMANDS, ...ADMIN_BOT_COMMANDS];
    expect(commands.length).toBeLessThanOrEqual(100);
    expect(new Set(commands.map((item) => item.command)).size).toBe(commands.length);
    for (const item of commands) {
      expect(item.command).toMatch(/^[a-z0-9_]{1,32}$/);
      expect(item.description.length).toBeGreaterThan(0);
      expect(item.description.length).toBeLessThanOrEqual(256);
    }
  });
});
