import { prisma } from "../db/prisma.js";
import { SyncAlreadyRunningError } from "../modules/admin/syncLock.service.js";
import { syncOpenFootball } from "../modules/openfootball/openfootball.sync.js";
import { logger } from "../utils/logger.js";

try {
  logger.info({ startedAt: new Date().toISOString() }, "Scheduled OpenFootball sync started");
  const result = await syncOpenFootball();
  logger.info(
    { records: result.records, warnings: result.warnings.length },
    "Scheduled OpenFootball sync completed"
  );
} catch (error) {
  if (error instanceof SyncAlreadyRunningError) {
    logger.info("OpenFootball sync skipped because another sync is running");
  } else {
    logger.error({ error }, "Scheduled OpenFootball sync failed");
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
