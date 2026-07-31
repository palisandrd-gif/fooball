import "dotenv/config";
import { z } from "zod";
import { dataEnv } from "./dataEnv.js";

const envSchema = z.object({
  BOT_TOKEN: z
    .string()
    .min(20)
    .refine((value) => /^\d+:[A-Za-z0-9_-]+$/.test(value), "BOT_TOKEN has an invalid format"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  ADMIN_TELEGRAM_IDS: z
    .string()
    .min(1, "At least one admin Telegram ID is required")
    .refine(
      (value) => value.split(",").every((id) => /^\d+$/.test(id.trim())),
      "ADMIN_TELEGRAM_IDS must contain comma-separated numeric IDs"
    ),
  FREE_DAILY_LIMIT: z.coerce.number().int().positive().default(5),
  PRO_DAILY_LIMIT: z.coerce.number().int().positive().default(100)
});

export const env = { ...dataEnv, ...envSchema.parse(process.env) };

export const adminTelegramIds = new Set(
  env.ADMIN_TELEGRAM_IDS.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
);
