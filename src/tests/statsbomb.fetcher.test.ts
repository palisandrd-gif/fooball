import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStatsBombMatches } from "../modules/statsbomb/statsbomb.fetcher.js";

describe("StatsBomb match payloads", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts matches with a null kick-off time", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              match_id: 2302764,
              match_date: "2005-05-25",
              kick_off: null,
              home_team: { home_team_name: "AC Milan" },
              away_team: { away_team_name: "Liverpool" },
              home_score: 3,
              away_score: 3,
              match_week: 1
            }
          ]),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      )
    );

    const matches = await fetchStatsBombMatches(16, 37);

    expect(matches).toHaveLength(1);
    expect(matches[0].kick_off).toBeNull();
  });
});
