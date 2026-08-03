import { DataSource, SyncStatus } from "@prisma/client";
import { dataEnv } from "../../config/dataEnv.js";
import { prisma } from "../../db/prisma.js";
import { logger } from "../../utils/logger.js";
import { teamSearchScore } from "../../utils/teamAliases.js";
import { syncLockService } from "../admin/syncLock.service.js";
import {
  ApiFootballFixtureInput,
  fetchApiFootballEvents,
  fetchApiFootballFixtures,
  fetchApiFootballStatistics
} from "./apiFootball.fetcher.js";

const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function numericList(value: string): number[] {
  return [...new Set(value.split(",").map(Number).filter(Number.isInteger))];
}

function statisticValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (["string", "number", "boolean"].includes(typeof value)) return String(value);
  return JSON.stringify(value).slice(0, 500);
}

type LocalTeam = { id: string; name: string; apiFootballId: number | null };

async function linkTeam(teams: LocalTeam[], apiId: number, name: string): Promise<void> {
  if (teams.some((team) => team.apiFootballId === apiId)) return;
  const candidate = teams
    .map((team) => ({ team, score: teamSearchScore(name, team.name) }))
    .filter(({ team }) => team.apiFootballId === null || team.apiFootballId === apiId)
    .sort((a, b) => b.score - a.score)[0];
  if (candidate && candidate.score >= 75) {
    await prisma.team.update({ where: { id: candidate.team.id }, data: { apiFootballId: apiId } });
    candidate.team.apiFootballId = apiId;
  }
}

async function saveFixture(input: ApiFootballFixtureInput, teams: LocalTeam[]) {
  const fixture = await prisma.apiFootballFixture.upsert({
    where: { fixtureId: input.fixture.id },
    create: {
      fixtureId: input.fixture.id,
      leagueId: input.league.id,
      leagueName: input.league.name,
      season: input.league.season,
      round: input.league.round,
      kickoffAt: new Date(input.fixture.date),
      status: input.fixture.status.short,
      homeTeamApiId: input.teams.home.id,
      homeTeamName: input.teams.home.name,
      awayTeamApiId: input.teams.away.id,
      awayTeamName: input.teams.away.name,
      homeGoals: input.goals.home,
      awayGoals: input.goals.away,
      venueName: input.fixture.venue?.name,
      referee: input.fixture.referee
    },
    update: {
      round: input.league.round,
      kickoffAt: new Date(input.fixture.date),
      status: input.fixture.status.short,
      homeGoals: input.goals.home,
      awayGoals: input.goals.away,
      venueName: input.fixture.venue?.name,
      referee: input.fixture.referee
    }
  });
  await Promise.all([
    linkTeam(teams, input.teams.home.id, input.teams.home.name),
    linkTeam(teams, input.teams.away.id, input.teams.away.name)
  ]);
  return fixture;
}

export async function upsertApiFootballFixture(input: ApiFootballFixtureInput) {
  const teams = await prisma.team.findMany({
    take: 500,
    select: { id: true, name: true, apiFootballId: true }
  });
  return saveFixture(input, teams);
}

export async function hydrateApiFootballFixture(
  fixtureDbId: string,
  fixtureId: number
): Promise<void> {
  let eventsSaved = false;
  let statisticsSaved = false;

  try {
    const events = await fetchApiFootballEvents(fixtureId);
    await prisma.$transaction(async (tx) => {
      await tx.apiFootballEvent.deleteMany({ where: { fixtureDbId } });
      if (events.length) {
        await tx.apiFootballEvent.createMany({
          data: events.map((event) => ({
            fixtureDbId,
            elapsed: event.time.elapsed,
            extra: event.time.extra,
            teamApiId: event.team.id,
            teamName: event.team.name,
            playerName: event.player?.name,
            assistName: event.assist?.name,
            type: event.type,
            detail: event.detail ?? ""
          }))
        });
      }
    });
    eventsSaved = true;
  } catch (error) {
    logger.warn({ error, fixtureId }, "API-Football events hydration failed");
    // Keep fixture data usable even if the events endpoint is unavailable.
  }

  try {
    const stats = await fetchApiFootballStatistics(fixtureId);
    await prisma.$transaction(async (tx) => {
      for (const team of stats) {
        for (const stat of team.statistics) {
          await tx.apiFootballStatistic.upsert({
            where: {
              fixtureDbId_teamApiId_type: {
                fixtureDbId,
                teamApiId: team.team.id,
                type: stat.type
              }
            },
            create: {
              fixtureDbId,
              teamApiId: team.team.id,
              teamName: team.team.name,
              type: stat.type,
              value: statisticValue(stat.value)
            },
            update: { value: statisticValue(stat.value), teamName: team.team.name }
          });
        }
      }
    });
    statisticsSaved = true;
  } catch (error) {
    logger.warn({ error, fixtureId }, "API-Football statistics hydration failed");
    // Some fixtures do not expose statistics; events/basic fixture data remain available.
  }

  if (eventsSaved || statisticsSaved) {
    await prisma.apiFootballFixture.update({
      where: { id: fixtureDbId },
      data: { detailsFetchedAt: new Date() }
    });
  }
}

export async function syncApiFootball(): Promise<{ fixtures: number; detailed: number }> {
  if (!dataEnv.API_FOOTBALL_KEY) throw new Error("API_FOOTBALL_KEY is not configured");
  const lock = await syncLockService.acquire(DataSource.API_FOOTBALL);
  let logId: string | undefined;
  let fixtureCount = 0;
  let detailed = 0;

  try {
    logId = (await prisma.dataSyncLog.create({
      data: { source: DataSource.API_FOOTBALL, status: SyncStatus.RUNNING }
    })).id;
    const teams = await prisma.team.findMany({
      take: 500,
      select: { id: true, name: true, apiFootballId: true }
    });
    const saved: Array<{
      dbId: string;
      fixtureId: number;
      kickoffAt: Date;
      finished: boolean;
      detailedAlready: boolean;
    }> = [];
    for (const season of numericList(dataEnv.API_FOOTBALL_SEASONS)) {
      for (const leagueId of numericList(dataEnv.API_FOOTBALL_LEAGUE_IDS)) {
        const fixtures = await fetchApiFootballFixtures(leagueId, season);
        for (const input of fixtures) {
          const fixture = await saveFixture(input, teams);
          saved.push({
            dbId: fixture.id,
            fixtureId: fixture.fixtureId,
            kickoffAt: fixture.kickoffAt,
            finished: FINISHED_STATUSES.has(fixture.status),
            detailedAlready: Boolean(fixture.detailsFetchedAt)
          });
          fixtureCount += 1;
        }
      }
    }

    const detailTargets = saved
      .filter((fixture) => fixture.finished && !fixture.detailedAlready)
      .sort((a, b) => b.kickoffAt.valueOf() - a.kickoffAt.valueOf())
      .slice(0, dataEnv.API_FOOTBALL_DETAIL_LIMIT);
    for (const fixture of detailTargets) {
      await hydrateApiFootballFixture(fixture.dbId, fixture.fixtureId);
      detailed += 1;
    }

    await prisma.dataSyncLog.update({
      where: { id: logId },
      data: {
        status: SyncStatus.SUCCESS,
        completedAt: new Date(),
        records: fixtureCount,
        message: `Detailed fixtures: ${detailed}`
      }
    });
    return { fixtures: fixtureCount, detailed };
  } catch (error) {
    if (logId) await prisma.dataSyncLog.update({
      where: { id: logId },
      data: {
        status: SyncStatus.FAILED,
        completedAt: new Date(),
        records: fixtureCount,
        message: (error as Error).message.slice(0, 5000)
      }
    });
    throw error;
  } finally {
    await syncLockService.release(lock);
  }
}
