import { prisma } from "../../db/prisma.js";
import { headToHeadService } from "../analytics/headToHead.service.js";
import { teamFormService } from "./teamForm.service.js";

export const coachComparisonService = {
  async compare(firstTeamId: string, secondTeamId: string) {
    const [firstTeam, secondTeam, first, second, headToHead] = await Promise.all([
      prisma.team.findUnique({ where: { id: firstTeamId } }),
      prisma.team.findUnique({ where: { id: secondTeamId } }),
      teamFormService.report(firstTeamId),
      teamFormService.report(secondTeamId),
      headToHeadService.calculate(firstTeamId, secondTeamId)
    ]);
    if (!firstTeam || !secondTeam) return undefined;
    return { firstTeam, secondTeam, first, second, headToHead };
  }
};
