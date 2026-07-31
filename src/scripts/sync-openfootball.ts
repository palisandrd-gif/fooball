import { prisma } from "../db/prisma.js";
import { syncOpenFootball } from "../modules/openfootball/openfootball.sync.js";

try {
  const result = await syncOpenFootball();
  console.log(`OpenFootball: ${result.records} matches, ${result.warnings.length} warnings`);
} finally {
  await prisma.$disconnect();
}
