import { prisma } from "../client";
import { Prisma, Notification } from "@prisma/client";

export class NotificationRepository {
  async list(params?: { read?: boolean; type?: string; limit?: number }): Promise<Notification[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));

    return prisma.notification.findMany({
      where: {
        ...(params?.read !== undefined && { read: params.read }),
        ...(params?.type && { type: params.type }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async markAsRead(id: string): Promise<Notification> {
    return prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(): Promise<{ count: number }> {
    return prisma.notification.updateMany({
      where: { read: false },
      data: { read: true },
    });
  }

  async create(data: Prisma.NotificationCreateInput): Promise<Notification> {
    return prisma.notification.create({ data });
  }

  async countUnread(): Promise<number> {
    return prisma.notification.count({
      where: { read: false },
    });
  }
}

export const notificationRepository = new NotificationRepository();
