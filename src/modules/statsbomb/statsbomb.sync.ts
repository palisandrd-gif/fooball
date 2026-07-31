import { DataSource, SyncStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { syncLockService } from "../admin/syncLock.service.js";
import {
  fetchStatsBombCompetitions,
  fetchStatsBombEvents,
  fetchStatsBombLineups,
  fetchStatsBombMatches
} from "./statsbomb.fetcher.js";
import { dataEnv } from "../../config/dataEnv.js";

function optionalDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? undefined : parsed;
}

export async function syncStatsBombBasic(): Promise<{ competitions: number; matches: number }> {
  const lock = await syncLockService.acquire(DataSource.STATSBOMB);
  let logId: string | undefined;
  let competitionCount = 0;
  let matchCount = 0;

  try {
    const log = await prisma.dataSyncLog.create({
      data: { source: DataSource.STATSBOMB, status: SyncStatus.RUNNING }
    });
    logId = log.id;
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
      where: { id: logId },
      data: {
        status: SyncStatus.SUCCESS,
        completedAt: new Date(),
        records: matchCount,
        message: `Competitions: ${competitionCount}`
      }
    });
    return { competitions: competitionCount, matches: matchCount };
  } catch (error) {
    if (logId) {
      await prisma.dataSyncLog.update({
        where: { id: logId },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          records: matchCount,
          message: (error as Error).message.slice(0, 5000)
        }
      });
    }
    throw error;
  } finally {
    await syncLockService.release(lock);
  }
}

function minuteFromTimestamp(value?: string | null): number | undefined {
  if (!value) return undefined;
  const parts = value.split(":").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return undefined;
  return Math.floor(parts[0] * 60 + parts[1] + parts[2] / 60);
}

export async function syncStatsBombDetails(matchId?: number): Promise<{
  matches: number;
  events: number;
  players: number;
}> {
  const lock = await syncLockService.acquire(DataSource.STATSBOMB);
  let logId: string | undefined;
  let eventCount = 0;
  let playerCount = 0;
  let processed = 0;

  try {
    const log = await prisma.dataSyncLog.create({
      data: { source: DataSource.STATSBOMB, status: SyncStatus.RUNNING }
    });
    logId = log.id;
    const matches = await prisma.statsBombMatch.findMany({
      where: matchId ? { statsBombId: matchId } : { events: { none: {} } },
      orderBy: { matchDate: "desc" },
      take: matchId ? 1 : dataEnv.STATSBOMB_DETAIL_MATCH_LIMIT
    });

    for (const match of matches) {
      const [events, lineups] = await Promise.all([
        fetchStatsBombEvents(match.statsBombId),
        fetchStatsBombLineups(match.statsBombId)
      ]);

      await prisma.$transaction(async (tx) => {
        await tx.statsBombEvent.deleteMany({ where: { matchDbId: match.id } });
        const eventRows = events.map((event) => ({
            statsBombEventId: event.id,
            matchDbId: match.id,
            index: event.index,
            period: event.period,
            minute: event.minute,
            second: event.second,
            type: event.type.name,
            possession: event.possession,
            teamName: event.team?.name,
            playerName: event.player?.name,
            passRecipient: event.pass?.recipient?.name,
            outcome: event.shot?.outcome?.name ?? event.pass?.outcome?.name,
            playPattern: event.play_pattern?.name,
            shotXg: event.shot?.statsbomb_xg,
            locationX: event.location?.[0],
            locationY: event.location?.[1],
            endLocationX: event.shot?.end_location?.[0] ?? event.pass?.end_location?.[0],
            endLocationY: event.shot?.end_location?.[1] ?? event.pass?.end_location?.[1]
          }));
        // Keep each INSERT below PostgreSQL's parameter limit for event-heavy matches.
        for (let offset = 0; offset < eventRows.length; offset += 500) {
          await tx.statsBombEvent.createMany({ data: eventRows.slice(offset, offset + 500) });
        }

        for (const team of lineups) {
          for (const player of team.lineup) {
            const firstPosition = player.positions?.[0];
            await tx.statsBombLineupPlayer.upsert({
              where: {
                matchDbId_teamName_playerId: {
                  matchDbId: match.id,
                  teamName: team.team_name,
                  playerId: player.player_id
                }
              },
              create: {
                matchDbId: match.id,
                teamName: team.team_name,
                playerId: player.player_id,
                playerName: player.player_name,
                jerseyNumber: player.jersey_number,
                countryName: player.country?.name,
                started: firstPosition?.start_reason === "Starting XI",
                positionName: firstPosition?.position,
                fromMinute: minuteFromTimestamp(firstPosition?.from),
                toMinute: minuteFromTimestamp(firstPosition?.to)
              },
              update: {
                jerseyNumber: player.jersey_number,
                countryName: player.country?.name,
                started: firstPosition?.start_reason === "Starting XI",
                positionName: firstPosition?.position,
                fromMinute: minuteFromTimestamp(firstPosition?.from),
                toMinute: minuteFromTimestamp(firstPosition?.to)
              }
            });
          }
        }
      });
      processed += 1;
      eventCount += events.length;
      playerCount += lineups.reduce((sum, team) => sum + team.lineup.length, 0);
    }

    await prisma.dataSyncLog.update({
      where: { id: logId },
      data: {
        status: SyncStatus.SUCCESS,
        completedAt: new Date(),
        records: eventCount,
        message: `Detailed matches: ${processed}; lineup players: ${playerCount}`
      }
    });
    return { matches: processed, events: eventCount, players: playerCount };
  } catch (error) {
    if (logId) {
      await prisma.dataSyncLog.update({
        where: { id: logId },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          records: eventCount,
          message: (error as Error).message.slice(0, 5000)
        }
      });
    }
    throw error;
  } finally {
    await syncLockService.release(lock);
  }
}
