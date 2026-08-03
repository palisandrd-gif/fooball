import OpenAI from "openai";
import { env } from "../../config/env.js";
import { CoachAiPayload } from "./coach.types.js";
import { coachAiHasUnsupportedClaims, coachFallbackAnalysis } from "./coachAiSafety.js";

export const COACH_AI_INSTRUCTIONS = [
  "Ты футбольный аналитик MatchMind Coach.",
  "Используй только JSON, переданный пользователем, и никогда не используй знания из памяти.",
  "Не придумывай xG, владение, удары, передачи, составы, события или вероятности.",
  "Явно отделяй подтверждённые факты от осторожного вывода.",
  "Не давай гарантированных прогнозов. Отвечай на русском языке в 2-4 коротких предложениях."
].join(" ");

export const coachAiService = {
  async explain(payload: CoachAiPayload): Promise<string> {
    if (!env.OPENAI_API_KEY) return coachFallbackAnalysis(payload);
    try {
      const response = await new OpenAI({ apiKey: env.OPENAI_API_KEY }).responses.create({
        model: env.OPENAI_MODEL,
        instructions: COACH_AI_INSTRUCTIONS,
        input: JSON.stringify(payload),
        max_output_tokens: 260
      });
      const output = response.output_text.trim();
      return output && !coachAiHasUnsupportedClaims(output, payload)
        ? output
        : coachFallbackAnalysis(payload);
    } catch {
      return coachFallbackAnalysis(payload);
    }
  }
};
