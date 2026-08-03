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
  kick_off?: string | null;
  home_team: { home_team_name: string };
  away_team: { away_team_name: string };
  home_score?: number;
  away_score?: number;
  match_week?: number;
  stadium?: { name?: string };
}

export interface StatsBombEventInput {
  id: string;
  index: number;
  period: number;
  minute: number;
  second: number;
  type: { name: string };
  possession?: number;
  team?: { name: string };
  player?: { name: string };
  pass?: {
    recipient?: { name: string };
    outcome?: { name: string };
    end_location?: number[];
  };
  shot?: { statsbomb_xg?: number; outcome?: { name: string }; end_location?: number[] };
  location?: number[];
  play_pattern?: { name: string };
}

export interface StatsBombLineupInput {
  team_name: string;
  lineup: Array<{
    player_id: number;
    player_name: string;
    jersey_number?: number;
    country?: { name?: string };
    positions?: Array<{
      position?: string;
      from?: string | null;
      to?: string | null;
      start_reason?: string;
    }>;
  }>;
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
  kick_off: z.string().nullable().optional(),
  home_team: z.object({ home_team_name: z.string().min(1).max(200) }),
  away_team: z.object({ away_team_name: z.string().min(1).max(200) }),
  home_score: z.number().int().nonnegative().optional(),
  away_score: z.number().int().nonnegative().optional(),
  match_week: z.number().int().nonnegative().optional(),
  stadium: z.object({ name: z.string().max(200).optional() }).optional()
});

const eventSchema: z.ZodType<StatsBombEventInput> = z.object({
  id: z.string().uuid(),
  index: z.number().int().nonnegative(),
  period: z.number().int().positive(),
  minute: z.number().int().nonnegative(),
  second: z.number().nonnegative(),
  type: z.object({ name: z.string().min(1).max(100) }),
  possession: z.number().int().nonnegative().optional(),
  team: z.object({ name: z.string().max(200) }).optional(),
  player: z.object({ name: z.string().max(200) }).optional(),
  pass: z.object({
    recipient: z.object({ name: z.string().max(200) }).optional(),
    outcome: z.object({ name: z.string().max(100) }).optional(),
    end_location: z.array(z.number()).min(2).max(3).optional()
  }).passthrough().optional(),
  shot: z.object({
    statsbomb_xg: z.number().nonnegative().optional(),
    outcome: z.object({ name: z.string().max(100) }).optional(),
    end_location: z.array(z.number()).min(2).max(3).optional()
  }).passthrough().optional(),
  location: z.array(z.number()).min(2).max(3).optional(),
  play_pattern: z.object({ name: z.string().max(100) }).optional()
}).passthrough();

const lineupSchema: z.ZodType<StatsBombLineupInput> = z.object({
  team_name: z.string().min(1).max(200),
  lineup: z.array(z.object({
    player_id: z.number().int(),
    player_name: z.string().min(1).max(200),
    jersey_number: z.number().int().optional(),
    country: z.object({ name: z.string().max(100).optional() }).optional(),
    positions: z.array(z.object({
      position: z.string().max(100).optional(),
      from: z.string().nullable().optional(),
      to: z.string().nullable().optional(),
      start_reason: z.string().optional()
    }).passthrough()).optional()
  }).passthrough()).max(100)
}).passthrough();

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

export function fetchStatsBombEvents(matchId: number) {
  return fetchJson(`events/${matchId}.json`, z.array(eventSchema).max(20_000));
}

export function fetchStatsBombLineups(matchId: number) {
  return fetchJson(`lineups/${matchId}.json`, z.array(lineupSchema).max(10));
}
