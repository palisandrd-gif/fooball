import { prisma } from "../../db/prisma.js";

export const matchSummaryService = {
  findTeamCandidates(query: string) {
    const terms = query.trim().split(/\s+/).filter(Boolean).slice(0, 3);
    return prisma.team.findMany({
      where: {
        OR: terms.flatMap((term) => [
          { name: { contains: term, mode: "insensitive" as const } },
          { normalizedName: { contains: term.toLowerCase() } }
        ])
      },
      take: 8,
      orderBy: { name: "asc" }
    });
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
