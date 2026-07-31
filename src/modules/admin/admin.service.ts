import { prisma } from "../../db/prisma.js";

export const adminService = {
  async dashboard() {
    const [users, free, pro, coach, matches, lastSync] = await Promise.all([
      prisma.user.count(),
      prisma.subscription.count({ where: { plan: "FREE" } }),
      prisma.subscription.count({ where: { plan: "PRO" } }),
      prisma.subscription.count({ where: { plan: "COACH" } }),
      prisma.match.count(),
      prisma.dataSyncLog.findFirst({
        where: { status: "SUCCESS" },
        orderBy: { completedAt: "desc" }
      })
    ]);
    return { users, free, pro, coach, matches, lastSync };
  }
};
