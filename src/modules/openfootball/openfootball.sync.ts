import { DataSource, SyncStatus } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { syncLockService } from "../admin/syncLock.service.js";
import { logger } from "../../utils/logger.js";
import { fetchOpenFootballDataset } from "./openfootball.fetcher.js";
import { parseOpenFootballDataset } from "./openfootball.parser.js";

export const SUPPORTED_LEAGUES = [
  { code: "EPL", name: "English Premier League", country: "England", file: "en.1.json" },
  { code: "BUN", name: "Bundesliga", country: "Germany", file: "de.1.json" },
  { code: "LAL", name: "La Liga", country: "Spain", file: "es.1.json" },
  { code: "SA", name: "Serie A", country: "Italy", file: "it.1.json" },
  { code: "L1", name: "Ligue 1", country: "France", file: "fr.1.json" }
] as const;

export const SUPPORTED_SEASONS = ["2023-24", "2024-25", "2025-26"] as const;

export async function syncOpenFootball(): Promise<{ records: number; warnings: string[] }> {
  const lock = await syncLockService.acquire(DataSource.OPENFOOTBALL);
  let logId: string | undefined;
  let records = 0;
  const warnings: string[] = [];

  try {
    const log = await prisma.dataSyncLog.create({
      data: { source: DataSource.OPENFOOTBALL, status: SyncStatus.RUNNING }
    });
    logId = log.id;
    for (const leagueConfig of SUPPORTED_LEAGUES) {
      const league = await prisma.league.upsert({
        where: { code: leagueConfig.code },
        create: {
          code: leagueConfig.code,
          name: leagueConfig.name,
          country: leagueConfig.country
        },
        update: { name: leagueConfig.name, country: leagueConfig.country }
      });

      for (const seasonName of SUPPORTED_SEASONS) {
        try {
          const dataset = await fetchOpenFootballDataset(seasonName, leagueConfig.file);
          const [startYear, shortEndYear] = seasonName.split("-").map(Number);
          const season = await prisma.season.upsert({
            where: { leagueId_name: { leagueId: league.id, name: seasonName } },
            create: {
              leagueId: league.id,
              name: seasonName,
              startYear,
              endYear: 2000 + shortEndYear
            },
            update: {}
          });

          const matches = parseOpenFootballDataset(dataset, leagueConfig.code, seasonName);
          for (const match of matches) {
            const [homeTeam, awayTeam] = await Promise.all([
              prisma.team.upsert({
                where: { normalizedName: match.homeNormalized },
                create: {
                  name: match.homeTeam,
                  normalizedName: match.homeNormalized,
                  country: leagueConfig.country
                },
                update: { name: match.homeTeam }
              }),
              prisma.team.upsert({
                where: { normalizedName: match.awayNormalized },
                create: {
                  name: match.awayTeam,
                  normalizedName: match.awayNormalized,
                  country: leagueConfig.country
                },
                update: { name: match.awayTeam }
              })
            ]);

            const savedMatch = await prisma.match.upsert({
              where: { externalKey: match.externalKey },
              create: {
                externalKey: match.externalKey,
                seasonId: season.id,
                homeTeamId: homeTeam.id,
                awayTeamId: awayTeam.id,
                kickoffAt: match.kickoffAt,
                round: match.round,
                status: match.status
              },
              update: {
                kickoffAt: match.kickoffAt,
                round: match.round,
                status: match.status
              }
            });

            if (match.fullTime) {
              await prisma.matchResult.upsert({
                where: { matchId: savedMatch.id },
                create: {
                  matchId: savedMatch.id,
                  homeGoals: match.fullTime[0],
                  awayGoals: match.fullTime[1],
                  halfHome: match.halfTime?.[0],
                  halfAway: match.halfTime?.[1]
                },
                update: {
                  homeGoals: match.fullTime[0],
                  awayGoals: match.fullTime[1],
                  halfHome: match.halfTime?.[0],
                  halfAway: match.halfTime?.[1]
                }
              });
            }
            records += 1;
          }
        } catch (error) {
          const message = `${leagueConfig.code} ${seasonName}: ${(error as Error).message}`;
          warnings.push(message);
          logger.warn({ error, league: leagueConfig.code, seasonName }, "Dataset skipped");
        }
      }
    }

    await prisma.dataSyncLog.update({
      where: { id: logId },
      data: {
        status: SyncStatus.SUCCESS,
        completedAt: new Date(),
        records,
        message: warnings.length ? warnings.join("\n").slice(0, 5000) : null
      }
    });
    return { records, warnings };
  } catch (error) {
    if (logId) {
      await prisma.dataSyncLog.update({
        where: { id: logId },
        data: {
          status: SyncStatus.FAILED,
          completedAt: new Date(),
          records,
          message: (error as Error).message.slice(0, 5000)
        }
      });
    }
    throw error;
  } finally {
    await syncLockService.release(lock);
  }
}
