import { prisma } from "../client";
import { ApplicationSetting } from "@prisma/client";

export class SettingRepository {
  async getAll(): Promise<ApplicationSetting[]> {
    return prisma.applicationSetting.findMany({
      orderBy: { key: "asc" },
    });
  }

  async get(key: string): Promise<string | null> {
    const setting = await prisma.applicationSetting.findUnique({
      where: { key },
    });
    return setting ? setting.value : null;
  }

  async set(key: string, value: string, description?: string): Promise<ApplicationSetting> {
    return prisma.applicationSetting.upsert({
      where: { key },
      update: {
        value,
        ...(description && { description }),
      },
      create: {
        key,
        value,
        description,
      },
    });
  }
}

export const settingRepository = new SettingRepository();
