import { createHash } from "node:crypto";
import { MatchStatus } from "@prisma/client";
import { normalizeTeamName } from "../../utils/normalizeTeamName.js";
import { parseOpenFootballDate } from "../../utils/date.js";
import { OpenFootballDataset } from "./openfootball.fetcher.js";

export interface ParsedOpenFootballMatch {
  externalKey: string;
  kickoffAt: Date;
  round?: string;
  homeTeam: string;
  awayTeam: string;
  homeNormalized: string;
  awayNormalized: string;
  status: MatchStatus;
  fullTime?: [number, number];
  halfTime?: [number, number];
}

export function parseOpenFootballDataset(
  dataset: OpenFootballDataset,
  leagueCode: string,
  seasonName: string
): ParsedOpenFootballMatch[] {
  return dataset.matches
    .filter((match) => match.date && match.team1 && match.team2)
    .map((match) => {
      const keySeed = [
        leagueCode,
        seasonName,
        match.date,
        match.time ?? "",
        normalizeTeamName(match.team1),
        normalizeTeamName(match.team2)
      ].join("|");

      return {
        externalKey: createHash("sha256").update(keySeed).digest("hex"),
        kickoffAt: parseOpenFootballDate(match.date, match.time),
        round: match.round,
        homeTeam: match.team1,
        awayTeam: match.team2,
        homeNormalized: normalizeTeamName(match.team1),
        awayNormalized: normalizeTeamName(match.team2),
        status: match.score?.ft ? "FINISHED" : "SCHEDULED",
        fullTime: match.score?.ft,
        halfTime: match.score?.ht
      };
    });
}
