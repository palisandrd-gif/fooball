import { DataSource, SyncStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import {
  fetchStatsBombCompetitions,
  fetchStatsBombMatches
} from "./statsbomb.fetcher.js";

function optionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

export async function syncStatsBombBasic(): Promise<{ competitions: number; matches: number }> {
  const log = await prisma.dataSyncLog.create({
    data: { source: DataSource.STATSBOMB, status: SyncStatus.RUNNING }
  });
  let competitionCount = 0;
  let matchCount = 0;

  try {
    const competitions = await fetchStatsBombCompetitions();
    for (const input of competitions) {
      const competition = await prisma.statsBombCompetition.upsert({
        where: {
          competitionId_seasonId: {
            competitionId: input.competition_id,
            seasonId: input.season_id
          }
        },
        create: {
          competitionId: input.competition_id,
          seasonId: input.season_id,
          competitionName: input.competition_name,
          seasonName: input.season_name,
          countryName: input.country_name,
          matchAvailable: optionalDate(input.match_available)
        },
        update: {
          competitionName: input.competition_name,
          seasonName: input.season_name,
          countryName: input.country_name,
          matchAvailable: optionalDate(input.match_available)
        }
      });
      competitionCount += 1;

      const matches = await fetchStatsBombMatches(input.competition_id, input.season_id);
      for (const match of matches) {
        await prisma.statsBombMatch.upsert({
          where: { statsBombId: match.match_id },
          create: {
            statsBombId: match.match_id,
            competitionDbId: competition.id,
            matchDate: new Date(`${match.match_date}T00:00:00.000Z`),
            kickOff: match.kick_off,
            homeTeam: match.home_team.home_team_name,
            awayTeam: match.away_team.away_team_name,
            homeScore: match.home_score,
            awayScore: match.away_score,
            matchWeek: match.match_week,
            stadium: match.stadium?.name
          },
          update: {
            homeScore: match.home_score,
            awayScore: match.away_score,
            stadium: match.stadium?.name
          }
        });
        matchCount += 1;
      }
    }

    await prisma.dataSyncLog.update({
      where: { id: log.id },
      data: {
        status: SyncStatus.SUCCESS,
        completedAt: new Date(),
        records: matchCount,
        message: `Competitions: ${competitionCount}`
      }
    });
    return { competitions: competitionCount, matches: matchCount };
  } catch (error) {
    await prisma.dataSyncLog.update({
      where: { id: log.id },
      data: {
        status: SyncStatus.FAILED,
        completedAt: new Date(),
        records: matchCount,
        message: (error as Error).message
      }
    });
    throw error;
  }
}
