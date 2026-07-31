import { prisma } from "../db/prisma.js";
import { syncStatsBombDetails } from "../modules/statsbomb/statsbomb.sync.js";

try {
  const matchId = process.argv[2] ? Number(process.argv[2]) : undefined;
  const result = await syncStatsBombDetails(matchId);
  console.log(`StatsBomb details: ${result.matches} matches, ${result.events} events, ${result.players} players`);
} finally {
  await prisma.$disconnect();
}
