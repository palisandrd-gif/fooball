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
  LOG_LEVEL: z.string().default("info")
});

// Data workers intentionally do not parse or require Telegram/OpenAI secrets.
export const dataEnv = dataEnvSchema.parse(process.env);
