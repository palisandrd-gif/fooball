import { prisma } from "../../db/prisma.js";
import { teamSearchScore } from "../../utils/teamAliases.js";

export const matchSummaryService = {
  async findTeamCandidates(query: string) {
    const safeQuery = query.trim().slice(0, 80);
    if (!safeQuery) return [];

    // The MVP has only a few hundred teams. Ranking the bounded list in memory
    // enables Cyrillic transliteration, aliases and fuzzy matching without a DB extension.
    const teams = await prisma.team.findMany({
      take: 500,
      orderBy: { name: "asc" }
    });
    return teams
      .map((team) => ({ team, score: teamSearchScore(safeQuery, team.name) }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8)
      .map(({ team }) => team);
  },

  recentForTeam(teamId: string, take = 5) {
    return prisma.match.findMany({
      where: {
        status: "FINISHED",
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }]
      },
      include: { homeTeam: true, awayTeam: true, result: true, season: { include: { league: true } } },
      orderBy: { kickoffAt: "desc" },
      take
    });
  },

  upcomingForTeam(teamId: string, take = 5) {
    return prisma.match.findMany({
      where: {
        status: "SCHEDULED",
        kickoffAt: { gte: new Date() },
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }]
      },
      include: { homeTeam: true, awayTeam: true, season: { include: { league: true } } },
      orderBy: { kickoffAt: "asc" },
      take
    });
  },

  async schedule(leagueCode: string, seasonName: string, take = 10) {
    const upcoming = await prisma.match.findMany({
      where: {
        season: {
          league: { code: leagueCode },
          name: seasonName
        },
        OR: [{ kickoffAt: { gte: new Date() } }, { status: "SCHEDULED" }]
      },
      include: { homeTeam: true, awayTeam: true, result: true, season: true },
      orderBy: { kickoffAt: "asc" },
      take
    });
    if (upcoming.length) return upcoming;

    return prisma.match.findMany({
      where: { season: { league: { code: leagueCode }, name: seasonName } },
      include: { homeTeam: true, awayTeam: true, result: true, season: true },
      orderBy: { kickoffAt: "desc" },
      take
    });
  },

  latestResults(leagueCode: string, take = 10) {
    return prisma.match.findMany({
      where: { status: "FINISHED", season: { league: { code: leagueCode } } },
      include: { homeTeam: true, awayTeam: true, result: true, season: true },
      orderBy: { kickoffAt: "desc" },
      take
    });
  },

  findFinishedMatch(matchId: string) {
    return prisma.match.findFirst({
      where: { id: matchId, status: "FINISHED" },
      include: { homeTeam: true, awayTeam: true, result: true, season: { include: { league: true } } }
    });
  }
};
