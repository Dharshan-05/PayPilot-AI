import { prisma } from "../client";
import { ApplicationSetting } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class SettingRepository {
  async getAll(): Promise<ApplicationSetting[]> {
    return executeDbWithFallback(
      () =>
        prisma.applicationSetting.findMany({
          orderBy: { key: "asc" },
        }),
      () => {
        fallbackStore.seed();
        return fallbackStore.settings as any;
      },
      "setting.getAll"
    );
  }

  async get(key: string): Promise<string | null> {
    return executeDbWithFallback(
      async () => {
        const setting = await prisma.applicationSetting.findUnique({
          where: { key },
        });
        return setting ? setting.value : null;
      },
      () => {
        fallbackStore.seed();
        const s = fallbackStore.settings.find((item) => item.key === key);
        return s ? s.value : null;
      },
      "setting.get"
    );
  }

  async set(key: string, value: string, description?: string): Promise<ApplicationSetting> {
    return executeDbWithFallback(
      () =>
        prisma.applicationSetting.upsert({
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
        }),
      () => {
        fallbackStore.seed();
        let s = fallbackStore.settings.find((item) => item.key === key);
        if (s) {
          s.value = value;
          if (description) s.description = description;
          s.updatedAt = new Date();
          return s as any;
        }
        const newSetting = {
          id: `set-${Date.now().toString(36)}`,
          key,
          value,
          description: description || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        fallbackStore.settings.push(newSetting);
        return newSetting as any;
      },
      "setting.set"
    );
  }
}

export const settingRepository = new SettingRepository();
