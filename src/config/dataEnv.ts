import "dotenv/config";
import { z } from "zod";

const dataEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1)
    .refine(
      (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection string"
    ),
  OPENFOOTBALL_BASE_URL: z
    .string()
    .url()
    .default("https://raw.githubusercontent.com/openfootball/football.json/master"),
  STATSBOMB_BASE_URL: z
    .string()
    .url()
    .default("https://raw.githubusercontent.com/statsbomb/open-data/master/data"),
  STATSBOMB_DETAIL_MATCH_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
  API_FOOTBALL_KEY: z.string().min(1).optional(),
  API_FOOTBALL_BASE_URL: z.string().url().default("https://v3.football.api-sports.io"),
  API_FOOTBALL_LEAGUE_IDS: z.string().default("39,78,140,135,61"),
  API_FOOTBALL_SEASONS: z.string().default("2025,2026"),
  API_FOOTBALL_DETAIL_LIMIT: z.coerce.number().int().min(0).max(40).default(15),
  API_FOOTBALL_MIN_INTERVAL_MS: z.coerce.number().int().min(1_000).max(60_000).default(6_500),
  THESPORTSDB_API_KEY: z.string().min(1).optional(),
  THESPORTSDB_BASE_URL: z.string().url().default("https://www.thesportsdb.com/api/v1/json"),
  THESPORTSDB_SYNC_LIMIT: z.coerce.number().int().min(1).max(100).default(20),
  LOG_LEVEL: z.string().default("info")
});

// Data workers intentionally do not parse or require Telegram/OpenAI secrets.
export const dataEnv = dataEnvSchema.parse(process.env);
