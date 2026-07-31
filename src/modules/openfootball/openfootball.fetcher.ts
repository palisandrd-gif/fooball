import { dataEnv } from "../../config/dataEnv.js";
import { z } from "zod";
import { fetchValidatedJson } from "../../utils/fetchJson.js";

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

const scorePair = z.tuple([z.number().int().nonnegative(), z.number().int().nonnegative()]);
const openFootballDatasetSchema: z.ZodType<OpenFootballDataset> = z.object({
  name: z.string().min(1).max(200),
  matches: z.array(
    z.object({
      round: z.string().max(100).optional(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      team1: z.string().min(1).max(200),
      team2: z.string().min(1).max(200),
      score: z.object({ ft: scorePair.optional(), ht: scorePair.optional() }).optional()
    })
  ).max(2_000)
});

export async function fetchOpenFootballDataset(
  season: string,
  file: string
): Promise<OpenFootballDataset> {
  const url = `${dataEnv.OPENFOOTBALL_BASE_URL.replace(/\/$/, "")}/${season}/${file}`;
  try {
    return await fetchValidatedJson(url, openFootballDatasetSchema, {
      timeoutMs: 20_000,
      maxBytes: 10 * 1024 * 1024
    });
  } catch (error) {
    throw new Error(`OpenFootball ${season}/${file}: ${(error as Error).message}`);
  }
}
