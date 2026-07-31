import { prisma } from "../db/prisma.js";
import { syncApiFootball } from "../modules/apiFootball/apiFootball.sync.js";

try {
  const result = await syncApiFootball();
  console.log(`API-Football: ${result.fixtures} fixtures, ${result.detailed} detailed`);
} finally {
  await prisma.$disconnect();
}
