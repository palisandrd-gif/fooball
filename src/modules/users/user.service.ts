import { prisma } from "../../db/prisma.js";

export interface TelegramUserInput {
  telegramId: number;
  username?: string;
  firstName?: string;
}

export const userService = {
  async register(input: TelegramUserInput) {
    return prisma.user.upsert({
      where: { telegramId: BigInt(input.telegramId) },
      create: {
        telegramId: BigInt(input.telegramId),
        username: input.username,
        firstName: input.firstName,
        subscription: { create: { plan: "FREE" } }
      },
      update: {
        username: input.username,
        firstName: input.firstName
      },
      include: { subscription: true }
    });
  },

  findByTelegramId(telegramId: number | string) {
    return prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { subscription: true }
    });
  }
};
