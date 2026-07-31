import { z } from "zod";
import { dataEnv } from "../../config/dataEnv.js";

const teamSchema = z.object({ id: z.number().int(), name: z.string().min(1).max(200) }).passthrough();

const fixtureSchema = z.object({
  fixture: z.object({
    id: z.number().int(),
    date: z.string(),
    referee: z.string().nullable().optional(),
    venue: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
    status: z.object({ short: z.string().max(20) }).passthrough()
  }).passthrough(),
  league: z.object({
    id: z.number().int(),
    name: z.string().min(1).max(200),
    season: z.number().int(),
    round: z.string().nullable().optional()
  }).passthrough(),
  teams: z.object({ home: teamSchema, away: teamSchema }).passthrough(),
  goals: z.object({ home: z.number().int().nullable(), away: z.number().int().nullable() }).passthrough()
}).passthrough();

const eventSchema = z.object({
  time: z.object({ elapsed: z.number().int().nonnegative(), extra: z.number().int().nullable().optional() }).passthrough(),
  team: teamSchema,
  player: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  assist: z.object({ name: z.string().nullable().optional() }).nullable().optional(),
  type: z.string().min(1).max(100),
  detail: z.string().nullable().optional()
}).passthrough();

const statisticsSchema = z.object({
  team: teamSchema,
  statistics: z.array(z.object({ type: z.string().min(1).max(100), value: z.unknown() }).passthrough()).max(100)
}).passthrough();

const searchTeamSchema = z.object({
  team: teamSchema
}).passthrough();

export type ApiFootballFixtureInput = z.infer<typeof fixtureSchema>;
export type ApiFootballEventInput = z.infer<typeof eventSchema>;
export type ApiFootballStatisticsInput = z.infer<typeof statisticsSchema>;

let requestQueue: Promise<void> = Promise.resolve();
let lastRequestStartedAt = 0;

async function waitForRateLimit(): Promise<void> {
  const slot = requestQueue.then(async () => {
    const waitMs = Math.max(
      0,
      dataEnv.API_FOOTBALL_MIN_INTERVAL_MS - (Date.now() - lastRequestStartedAt)
    );
    if (waitMs) await new Promise((resolve) => setTimeout(resolve, waitMs));
    lastRequestStartedAt = Date.now();
  });
  requestQueue = slot.catch(() => undefined);
  await slot;
}

async function request<T>(path: string, schema: z.ZodType<T>): Promise<T> {
  if (!dataEnv.API_FOOTBALL_KEY) throw new Error("API_FOOTBALL_KEY is not configured");
  await waitForRateLimit();
  const response = await fetch(`${dataEnv.API_FOOTBALL_BASE_URL.replace(/\/$/, "")}/${path}`, {
    signal: AbortSignal.timeout(30_000),
    headers: { accept: "application/json", "x-apisports-key": dataEnv.API_FOOTBALL_KEY }
  });
  const payload = await response.json().catch(() => undefined) as { response?: unknown; errors?: unknown } | undefined;
  if (!response.ok) {
    throw new Error(`API-Football request failed: HTTP ${response.status}${payload?.errors ? ` ${JSON.stringify(payload.errors).slice(0, 500)}` : ""}`);
  }
  if (payload?.errors && Object.keys(payload.errors as object).length) {
    throw new Error(`API-Football returned an error: ${JSON.stringify(payload.errors).slice(0, 500)}`);
  }
  const parsed = schema.safeParse(payload?.response);
  if (!parsed.success) throw new Error("API-Football returned an unexpected format");
  return parsed.data;
}

export function fetchApiFootballFixtures(leagueId: number, season: number) {
  return request(`fixtures?league=${leagueId}&season=${season}`, z.array(fixtureSchema).max(5_000));
}

export function fetchApiFootballFixturesByDate(date: string) {
  return request(`fixtures?date=${encodeURIComponent(date)}`, z.array(fixtureSchema).max(5_000));
}

export function fetchApiFootballTeams(search: string) {
  return request(`teams?search=${encodeURIComponent(search)}`, z.array(searchTeamSchema).max(20));
}

export function fetchApiFootballFixturesByTeam(teamId: number, from: string, to: string) {
  return request(
    `fixtures?team=${teamId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    z.array(fixtureSchema).max(5_000)
  );
}

export function fetchApiFootballEvents(fixtureId: number) {
  return request(`fixtures/events?fixture=${fixtureId}`, z.array(eventSchema).max(1_000));
}

export function fetchApiFootballStatistics(fixtureId: number) {
  return request(`fixtures/statistics?fixture=${fixtureId}`, z.array(statisticsSchema).max(10));
}
