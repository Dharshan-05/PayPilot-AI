import { prisma } from "../client";
import { Prisma, Notification } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class NotificationRepository {
  async list(params?: { read?: boolean; type?: string; limit?: number }): Promise<Notification[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));

    return executeDbWithFallback(
      () =>
        prisma.notification.findMany({
          where: {
            ...(params?.read !== undefined && { read: params.read }),
            ...(params?.type && { type: params.type }),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
      () => {
        fallbackStore.seed();
        let items = [...fallbackStore.notifications];
        if (params?.read !== undefined) items = items.filter((n) => n.read === params.read);
        if (params?.type) items = items.filter((n) => n.type === params.type);
        return items.slice(0, limit) as any;
      },
      "notification.list"
    );
  }

  async markAsRead(id: string): Promise<Notification> {
    return executeDbWithFallback(
      () =>
        prisma.notification.update({
          where: { id },
          data: { read: true },
        }),
      () => {
        fallbackStore.seed();
        const notif = fallbackStore.notifications.find((n) => n.id === id);
        if (notif) {
          notif.read = true;
          return notif as any;
        }
        throw new Error(`Notification ${id} not found in fallback store`);
      },
      "notification.markAsRead"
    );
  }

  async markAllAsRead(): Promise<{ count: number }> {
    return executeDbWithFallback(
      () =>
        prisma.notification.updateMany({
          where: { read: false },
          data: { read: true },
        }),
      () => {
        fallbackStore.seed();
        let count = 0;
        for (const n of fallbackStore.notifications) {
          if (!n.read) {
            n.read = true;
            count++;
          }
        }
        return { count };
      },
      "notification.markAllAsRead"
    );
  }

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return executeDbWithFallback(
      () => prisma.notification.create({ data }),
      () => {
        fallbackStore.seed();
        const newNotif: any = {
          id: `notif-${Date.now().toString(36)}`,
          type: data.type,
          title: data.title,
          message: data.message,
          severity: data.severity || "INFO",
          read: data.read || false,
          createdAt: new Date(),
        };
        fallbackStore.notifications.unshift(newNotif);
        return newNotif;
      },
      "notification.create"
    );
  }

  async countUnread(): Promise<number> {
    return executeDbWithFallback(
      () =>
        prisma.notification.count({
          where: { read: false },
        }),
      () => {
        fallbackStore.seed();
        return fallbackStore.notifications.filter((n) => !n.read).length;
      },
      "notification.countUnread"
    );
  }
}

export const notificationRepository = new NotificationRepository();
