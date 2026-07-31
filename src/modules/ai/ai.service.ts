import OpenAI from "openai";
import { env } from "../../config/env.js";
import { buildMatchPrompt, MatchExplanationInput } from "./prompts.js";
import { fallbackExplanation, hasUnsupportedClaims } from "./aiSafety.js";

export const aiService = {
  async explainMatch(match: MatchExplanationInput): Promise<string> {
    if (!env.OPENAI_API_KEY) return fallbackExplanation(match);

    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    try {
      const response = await client.responses.create({
        model: env.OPENAI_MODEL,
        instructions:
          "Use only the supplied score facts. Never infer possession, shots, xG, passes, chances, tactics, cards, corners, or player performance.",
        input: buildMatchPrompt(match),
        max_output_tokens: 220
      });
      const output = response.output_text.trim();
      if (
        !output ||
        hasUnsupportedClaims(output) ||
        !output.includes(`${match.homeGoals}:${match.awayGoals}`) ||
        !output.toLowerCase().includes("без событийных данных")
      ) {
        return fallbackExplanation(match);
      }
      return output;
    } catch {
      return fallbackExplanation(match);
    }
  }
};
