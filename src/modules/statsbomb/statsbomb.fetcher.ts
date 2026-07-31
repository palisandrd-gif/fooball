import { dataEnv } from "../../config/dataEnv.js";
import { z } from "zod";
import { fetchValidatedJson } from "../../utils/fetchJson.js";

export interface StatsBombCompetitionInput {
  competition_id: number;
  season_id: number;
  country_name?: string;
  competition_name: string;
  season_name: string;
  match_available?: string;
}

export interface StatsBombMatchInput {
  match_id: number;
  match_date: string;
  kick_off?: string;
  home_team: { home_team_name: string };
  away_team: { away_team_name: string };
  home_score?: number;
  away_score?: number;
  match_week?: number;
  stadium?: { name?: string };
}

const competitionSchema: z.ZodType<StatsBombCompetitionInput> = z.object({
  competition_id: z.number().int(),
  season_id: z.number().int(),
  country_name: z.string().max(200).optional(),
  competition_name: z.string().min(1).max(200),
  season_name: z.string().min(1).max(100),
  match_available: z.string().optional()
});

const matchSchema: z.ZodType<StatsBombMatchInput> = z.object({
  match_id: z.number().int(),
  match_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kick_off: z.string().optional(),
  home_team: z.object({ home_team_name: z.string().min(1).max(200) }),
  away_team: z.object({ away_team_name: z.string().min(1).max(200) }),
  home_score: z.number().int().nonnegative().optional(),
  away_score: z.number().int().nonnegative().optional(),
  match_week: z.number().int().nonnegative().optional(),
  stadium: z.object({ name: z.string().max(200).optional() }).optional()
});

async function fetchJson<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  const url = `${dataEnv.STATSBOMB_BASE_URL.replace(/\/$/, "")}/${path}`;
  return fetchValidatedJson(url, schema, { timeoutMs: 30_000 });
}

export function fetchStatsBombCompetitions() {
  return fetchJson("competitions.json", z.array(competitionSchema).max(1_000));
}

export function fetchStatsBombMatches(competitionId: number, seasonId: number) {
  return fetchJson(
    `matches/${competitionId}/${seasonId}.json`,
    z.array(matchSchema).max(10_000)
  );
}
