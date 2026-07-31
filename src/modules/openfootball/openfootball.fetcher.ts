import { env } from "../../config/env.js";

export interface OpenFootballMatch {
  round?: string;
  date: string;
  time?: string;
  team1: string;
  team2: string;
  score?: {
    ft?: [number, number];
    ht?: [number, number];
  };
}

export interface OpenFootballDataset {
  name: string;
  matches: OpenFootballMatch[];
}

export async function fetchOpenFootballDataset(
  season: string,
  file: string
): Promise<OpenFootballDataset> {
  const url = `${env.OPENFOOTBALL_BASE_URL.replace(/\/$/, "")}/${season}/${file}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (response.status === 404) {
    throw new Error(`Dataset not available: ${season}/${file}`);
  }
  if (!response.ok) throw new Error(`OpenFootball request failed: ${response.status}`);
  return (await response.json()) as OpenFootballDataset;
}
