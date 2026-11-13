import { prisma } from "../client";
import { Prisma, AIRecommendation } from "@prisma/client";

export class RecommendationRepository {
  async list(params?: { type?: string; priority?: string; status?: string; limit?: number }): Promise<AIRecommendation[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));

    return prisma.aIRecommendation.findMany({
      where: {
        ...(params?.type && { type: params.type }),
        ...(params?.priority && { priority: params.priority }),
        ...(params?.status && { status: params.status }),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }

  async findById(id: string): Promise<AIRecommendation | null> {
    return prisma.aIRecommendation.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.AIRecommendationCreateInput): Promise<AIRecommendation> {
    return prisma.aIRecommendation.create({ data });
  }

  async updateStatus(id: string, status: string): Promise<AIRecommendation> {
    return prisma.aIRecommendation.update({
      where: { id },
      data: { status },
    });
  }

  async getProposed(limit: number = 10): Promise<AIRecommendation[]> {
    return prisma.aIRecommendation.findMany({
      where: { status: "PROPOSED" },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: limit,
    });
  }
}

export const recommendationRepository = new RecommendationRepository();
