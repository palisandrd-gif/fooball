import { Markup } from "telegraf";
import { SUPPORTED_LEAGUES } from "../../modules/openfootball/openfootball.sync.js";
import { SUPPORTED_SEASONS } from "../../modules/openfootball/openfootball.sync.js";

export function leagueMenu(action: "schedule" | "results") {
  return Markup.inlineKeyboard(
    SUPPORTED_LEAGUES.map((league) => [
      Markup.button.callback(league.name, `${action}:${league.code}`)
    ])
  );
}

export function seasonMenu(leagueCode: string) {
  return Markup.inlineKeyboard(
    SUPPORTED_SEASONS.map((season) => [
      Markup.button.callback(season, `season:${leagueCode}:${season}`)
    ])
  );
}
