import { prisma } from "../client";
import { Prisma, AIInsight } from "@prisma/client";

export class InsightRepository {
  async list(params?: { type?: string; severity?: string; status?: string; limit?: number }) {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));

    return prisma.aIInsight.findMany({
      where: {
        ...(params?.type && { type: params.type }),
        ...(params?.severity && { severity: params.severity }),
        ...(params?.status && { status: params.status }),
      },
      include: {
        transaction: {
          include: { customer: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async findById(id: string): Promise<AIInsight | null> {
    return prisma.aIInsight.findUnique({
      where: { id },
      include: { transaction: true },
    });
  }

  async create(data: Prisma.AIInsightCreateInput): Promise<AIInsight> {
    return prisma.aIInsight.create({ data });
  }

  async updateStatus(id: string, status: string): Promise<AIInsight> {
    return prisma.aIInsight.update({
      where: { id },
      data: { status },
    });
  }

  async getActive(limit: number = 10) {
    return prisma.aIInsight.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}

export const insightRepository = new InsightRepository();
