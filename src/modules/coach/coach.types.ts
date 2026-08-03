export type FormSymbol = "В" | "Н" | "П";

export interface CoachFormMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  result: { homeGoals: number; awayGoals: number } | null;
}

export interface TeamFormAnalysis {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  cleanSheets: number;
  form: FormSymbol[];
  streak: string;
}

export interface CoachAiPayload {
  match: {
    homeTeam: string;
    awayTeam: string;
    score: string;
    date: string;
    league: string;
  };
  availableData: {
    score: true;
    statistics: boolean;
    events: boolean;
    lineups: boolean;
    xg: boolean;
  };
  statistics: Record<string, unknown> | null;
  events: Array<Record<string, unknown>> | null;
  recentForm: Record<string, unknown>;
}
