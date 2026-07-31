import { prisma } from "../../db/prisma.js";

export const headToHeadService = {
  async calculate(teamOneId: string, teamTwoId: string) {
    const matches = await prisma.match.findMany({
      where: {
        status: "FINISHED",
        OR: [
          { homeTeamId: teamOneId, awayTeamId: teamTwoId },
          { homeTeamId: teamTwoId, awayTeamId: teamOneId }
        ]
      },
      include: { homeTeam: true, awayTeam: true, result: true },
      orderBy: { kickoffAt: "desc" }
    });

    let teamOneWins = 0;
    let teamTwoWins = 0;
    let draws = 0;
    let goals = 0;

    for (const match of matches) {
      if (!match.result) continue;
      goals += match.result.homeGoals + match.result.awayGoals;
      if (match.result.homeGoals === match.result.awayGoals) {
        draws += 1;
      } else {
        const winnerId =
          match.result.homeGoals > match.result.awayGoals ? match.homeTeamId : match.awayTeamId;
        if (winnerId === teamOneId) teamOneWins += 1;
        else teamTwoWins += 1;
      }
    }

    return {
      matches,
      teamOneWins,
      teamTwoWins,
      draws,
      averageGoals: matches.length ? goals / matches.length : 0
    };
  }
};
