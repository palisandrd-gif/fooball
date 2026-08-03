import { CoachAiPayload } from "./coach.types.js";

export function coachAiHasUnsupportedClaims(text: string, payload: CoachAiPayload): boolean {
  if (!payload.availableData.xg && /\bxg\b|expected goals/iu.test(text)) return true;
  if (
    !payload.availableData.statistics &&
    /владени|удар(?:ов|а|ы)?|передач(?:а|и|у)?|углов|офсайд|фол|\d+\s*%/iu.test(text)
  ) return true;
  if (!payload.availableData.lineups && /состав|стартов(?:ый|ого)|вышел на замену/iu.test(text)) return true;
  if (!payload.availableData.events && /карточ|замен|на \d+[-–]?й минут/iu.test(text)) return true;
  return /гарантирован|точно победит|вероятность победы/iu.test(text);
}

export function coachFallbackAnalysis(payload: CoachAiPayload): string {
  const [homeGoals, awayGoals] = payload.match.score.split(":").map(Number);
  const winner = homeGoals === awayGoals
    ? "Матч завершился вничью."
    : `${homeGoals > awayGoals ? payload.match.homeTeam : payload.match.awayTeam} победил.`;
  return `${winner} Итоговый счёт — ${payload.match.score}. Вывод построен по подтверждённому результату и не является прогнозом.`;
}
