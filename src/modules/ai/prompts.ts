export interface MatchExplanationInput {
  homeTeam: string;
  awayTeam: string;
  homeGoals: number;
  awayGoals: number;
  date: string;
  league: string;
}

export function buildMatchPrompt(match: MatchExplanationInput): string {
  return [
    "Ты объясняешь футбольный матч простым русским языком.",
    "Используй ТОЛЬКО переданные факты. Не упоминай xG, удары, владение, передачи, тактику или события.",
    "В конце обязательно поясни, что без событийных данных нельзя оценить владение и качество моментов.",
    "Ответ: 3-4 коротких предложения, без Markdown.",
    `Лига: ${match.league}`,
    `Дата: ${match.date}`,
    `Хозяева: ${match.homeTeam}`,
    `Гости: ${match.awayTeam}`,
    `Счёт: ${match.homeGoals}:${match.awayGoals}`
  ].join("\n");
}
