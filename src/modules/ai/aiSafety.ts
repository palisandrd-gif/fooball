import { MatchExplanationInput } from "./prompts.js";

export function fallbackExplanation(match: MatchExplanationInput): string {
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
  const scoring =
    totalGoals >= 4
      ? `Матч был результативным: забито ${totalGoals} гола.`
      : `Всего команды забили ${totalGoals} гола.`;
  return `${result} ${confidence} ${scoring} Без событийных данных нельзя определить владение мячом или качество созданных моментов.`;
}

export function hasUnsupportedClaims(text: string): boolean {
  return /(\bxg\b|expected goals|\bshots?\b|удар(?:ов|а|ы)?|\bpasses?\b|передач(?:а|и|у)?|\d+\s*%|доминировал|контролировал|углов(?:ых|ые)|карточ(?:ек|ки))/iu.test(
    text
  );
}

export function withDetailsNotice(explanation: string, hasDetails: boolean): string {
  if (!hasDetails) return explanation;
  return explanation.replace(
    /Без событийных данных[^.]*\./iu,
    "Подтверждённая расширенная статистика приведена ниже."
  );
}
