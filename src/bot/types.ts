import { Context } from "telegraf";

export type SessionAction =
  | "idle"
  | "team_search"
  | "history_team_one"
  | "history_team_two";

export interface BotSession {
  action: SessionAction;
  firstTeamId?: string;
  firstTeamName?: string;
}

export interface BotContext extends Context {
  session: BotSession;
}
