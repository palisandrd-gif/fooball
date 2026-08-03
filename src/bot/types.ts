import { Context } from "telegraf";

export type SessionAction =
  | "idle"
  | "team_search"
  | "history_team_one"
  | "history_team_two"
  | "coach_team_query"
  | "coach_compare_second";

export type CoachMode = "team" | "form" | "match" | "compare";

export interface BotSession {
  action: SessionAction;
  firstTeamId?: string;
  firstTeamName?: string;
  coachMode?: CoachMode;
  coachFirstTeamId?: string;
  coachFirstTeamName?: string;
}

export interface BotContext extends Context {
  session: BotSession;
}
