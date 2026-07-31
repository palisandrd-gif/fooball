import { prisma } from "../db/prisma.js";
import { syncTheSportsDb } from "../modules/theSportsDb/theSportsDb.sync.js";

try {
  const result = await syncTheSportsDb();
  console.log(`TheSportsDB: ${result.enriched} enriched, ${result.notFound} not found`);
} finally {
  await prisma.$disconnect();
}
