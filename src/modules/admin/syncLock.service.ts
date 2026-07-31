import { randomUUID } from "node:crypto";
import { DataSource } from "@prisma/client";
import { prisma } from "../../db/prisma.js";

const LOCK_DURATION_MS = 4 * 60 * 60 * 1000;

export class SyncAlreadyRunningError extends Error {
  constructor(public readonly source: DataSource) {
    super(`A ${source} synchronization is already running`);
  }
}

export interface SyncLockHandle {
  source: DataSource;
  ownerId: string;
}

export const syncLockService = {
  async acquire(source: DataSource): Promise<SyncLockHandle> {
    const ownerId = randomUUID();
    const now = new Date();

    // The initial upsert makes acquisition work on a fresh database. The conditional
    // update is atomic, so two workers cannot both acquire the same source lock.
    await prisma.dataSyncLock.upsert({
      where: { source },
      create: { source, ownerId: "available", lockedUntil: new Date(0) },
      update: {}
    });

    const acquired = await prisma.dataSyncLock.updateMany({
      where: { source, lockedUntil: { lt: now } },
      data: { ownerId, lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS) }
    });

    if (acquired.count !== 1) throw new SyncAlreadyRunningError(source);
    return { source, ownerId };
  },

  async release(lock: SyncLockHandle): Promise<void> {
    await prisma.dataSyncLock.updateMany({
      where: { source: lock.source, ownerId: lock.ownerId },
      data: { ownerId: "available", lockedUntil: new Date(0) }
    });
  }
};
