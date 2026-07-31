import OpenAI from "openai";
import { env } from "../../config/env.js";
import { buildMatchPrompt, MatchExplanationInput } from "./prompts.js";

function fallbackExplanation(match: MatchExplanationInput): string {
  const totalGoals = match.homeGoals + match.awayGoals;
  const difference = Math.abs(match.homeGoals - match.awayGoals);
  const result =
    match.homeGoals === match.awayGoals
      ? `${match.homeTeam} и ${match.awayTeam} сыграли вничью ${match.homeGoals}:${match.awayGoals}.`
      : `${match.homeGoals > match.awayGoals ? match.homeTeam : match.awayTeam} победил со счётом ${match.homeGoals}:${match.awayGoals}.`;
  const confidence =
    difference >= 3
      ? "По разнице мячей победу можно назвать уверенной."
      : difference > 0
        ? "По разнице мячей матч был достаточно близким."
        : "Команды завершили матч без победителя.";
  const scoring = totalGoals >= 4 ? `Матч был результативным: забито ${totalGoals} гола.` : `Всего команды забили ${totalGoals} гола.`;
  return `${result} ${confidence} ${scoring} Без событийных данных нельзя определить владение мячом или качество созданных моментов.`;
}

export const aiService = {
  async explainMatch(match: MatchExplanationInput): Promise<string> {
    if (!env.OPENAI_API_KEY) return fallbackExplanation(match);

    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    try {
      const response = await client.responses.create({
        model: env.OPENAI_MODEL,
        input: buildMatchPrompt(match),
        max_output_tokens: 220
      });
      return response.output_text.trim() || fallbackExplanation(match);
    } catch {
      return fallbackExplanation(match);
    }
  }
};
