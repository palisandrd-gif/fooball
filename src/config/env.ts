import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  ADMIN_TELEGRAM_IDS: z.string().default(""),
  OPENFOOTBALL_BASE_URL: z
    .string()
    .url()
    .default("https://raw.githubusercontent.com/openfootball/football.json/master"),
  STATSBOMB_BASE_URL: z
    .string()
    .url()
    .default("https://raw.githubusercontent.com/statsbomb/open-data/master/data"),
  FREE_DAILY_LIMIT: z.coerce.number().int().positive().default(5),
  PRO_DAILY_LIMIT: z.coerce.number().int().positive().default(100),
  LOG_LEVEL: z.string().default("info")
});

export const env = envSchema.parse(process.env);

export const adminTelegramIds = new Set(
  env.ADMIN_TELEGRAM_IDS.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
