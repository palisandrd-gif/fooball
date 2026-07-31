import { env } from "../../config/env.js";

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

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${env.STATSBOMB_BASE_URL.replace(/\/$/, "")}/${path}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`StatsBomb request failed: ${response.status} ${path}`);
  return (await response.json()) as T;
}

export function fetchStatsBombCompetitions() {
  return fetchJson<StatsBombCompetitionInput[]>("competitions.json");
}

export function fetchStatsBombMatches(competitionId: number, seasonId: number) {
  return fetchJson<StatsBombMatchInput[]>(`matches/${competitionId}/${seasonId}.json`);
}
