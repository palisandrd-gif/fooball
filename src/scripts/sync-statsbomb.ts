import { prisma } from "../db/prisma.js";
import { syncStatsBombBasic } from "../modules/statsbomb/statsbomb.sync.js";

try {
  const result = await syncStatsBombBasic();
  console.log(`StatsBomb: ${result.competitions} competitions, ${result.matches} matches`);
} finally {
  await prisma.$disconnect();
}
