import { DataSource, SyncStatus } from "@prisma/client";
import { dataEnv } from "../../config/dataEnv.js";
import { prisma } from "../../db/prisma.js";
import { teamSearchScore } from "../../utils/teamAliases.js";
import { syncLockService } from "../admin/syncLock.service.js";
import { searchSportsDbTeams } from "./theSportsDb.fetcher.js";

function websiteUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function imageUrl(value?: string | null): string | undefined {
  return value && /^https:\/\//i.test(value) ? value : undefined;
}

export async function syncTheSportsDb(): Promise<{ enriched: number; notFound: number }> {
  if (!dataEnv.THESPORTSDB_API_KEY) throw new Error("THESPORTSDB_API_KEY is not configured");
  const lock = await syncLockService.acquire(DataSource.THESPORTSDB);
  let logId: string | undefined;
  let enriched = 0;
  let notFound = 0;

  try {
    logId = (await prisma.dataSyncLog.create({
      data: { source: DataSource.THESPORTSDB, status: SyncStatus.RUNNING }
    })).id;
    const teams = await prisma.team.findMany({
      where: { theSportsDbId: null, theSportsDbCheckedAt: null },
      orderBy: { name: "asc" },
      take: dataEnv.THESPORTSDB_SYNC_LIMIT
    });

    for (const team of teams) {
      const candidates = await searchSportsDbTeams(team.name);
      const selected = candidates
        .map((candidate) => ({ candidate, score: teamSearchScore(team.name, candidate.strTeam) }))
        .sort((a, b) => b.score - a.score)[0];
      if (!selected || selected.score < 60) {
        await prisma.team.update({
          where: { id: team.id },
          data: { theSportsDbCheckedAt: new Date() }
        });
        notFound += 1;
        continue;
      }
      await prisma.team.update({
        where: { id: team.id },
        data: {
          theSportsDbId: selected.candidate.idTeam,
          theSportsDbCheckedAt: new Date(),
          country: team.country ?? selected.candidate.strCountry ?? undefined,
          badgeUrl: imageUrl(selected.candidate.strBadge),
          stadium: selected.candidate.strStadium ?? undefined,
          stadiumThumbUrl: imageUrl(selected.candidate.strStadiumThumb),
          websiteUrl: websiteUrl(selected.candidate.strWebsite),
          description: selected.candidate.strDescriptionEN?.slice(0, 5_000) ?? undefined
        }
      });
      enriched += 1;
    }

    await prisma.dataSyncLog.update({
      where: { id: logId },
      data: {
        status: SyncStatus.SUCCESS,
        completedAt: new Date(),
        records: enriched,
        message: `Not found: ${notFound}`
      }
    });
    return { enriched, notFound };
  } catch (error) {
    if (logId) await prisma.dataSyncLog.update({
      where: { id: logId },
      data: {
        status: SyncStatus.FAILED,
        completedAt: new Date(),
        records: enriched,
        message: (error as Error).message.slice(0, 5000)
      }
    });
    throw error;
  } finally {
    await syncLockService.release(lock);
  }
}
