import { prisma } from "../client";
import { Prisma, AIRecommendation } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class RecommendationRepository {
  async list(params?: { type?: string; priority?: string; status?: string; limit?: number }): Promise<AIRecommendation[]> {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));

    return executeDbWithFallback(
      () =>
        prisma.aIRecommendation.findMany({
          where: {
            ...(params?.type && { type: params.type }),
            ...(params?.priority && { priority: params.priority }),
            ...(params?.status && { status: params.status }),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
      () => {
        fallbackStore.seed();
        let items = [...fallbackStore.recommendations];
        if (params?.type) items = items.filter((r) => r.type === params.type);
        if (params?.priority) items = items.filter((r) => r.priority === params.priority);
        if (params?.status) items = items.filter((r) => r.status === params.status);
        return items.slice(0, limit) as any;
      },
      "recommendation.list"
    );
  }

  async findById(id: string): Promise<AIRecommendation | null> {
    return executeDbWithFallback(
      () =>
        prisma.aIRecommendation.findUnique({
          where: { id },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.recommendations.find((r) => r.id === id) as any) || null;
      },
      "recommendation.findById"
    );
  }

  async create(data: Prisma.AIRecommendationCreateInput): Promise<AIRecommendation> {
    return executeDbWithFallback(
      () => prisma.aIRecommendation.create({ data }),
      () => {
        fallbackStore.seed();
        const now = new Date();
        const newRec: any = {
          id: `rec-${Date.now().toString(36)}`,
          type: data.type,
          title: data.title,
          description: data.description,
          priority: data.priority,
          confidence: new Prisma.Decimal(data.confidence as any),
          expectedImpact: data.expectedImpact || null,
          status: data.status || "PROPOSED",
          createdAt: now,
          updatedAt: now,
        };
        fallbackStore.recommendations.unshift(newRec);
        return newRec;
      },
      "recommendation.create"
    );
  }

  async updateStatus(id: string, status: string): Promise<AIRecommendation> {
    return executeDbWithFallback(
      () =>
        prisma.aIRecommendation.update({
          where: { id },
          data: { status },
        }),
      () => {
        fallbackStore.seed();
        const rec = fallbackStore.recommendations.find((r) => r.id === id);
        if (rec) {
          rec.status = status;
          rec.updatedAt = new Date();
          return rec as any;
        }
        throw new Error(`Recommendation ${id} not found in fallback store`);
      },
      "recommendation.updateStatus"
    );
  }

  async getProposed(limit: number = 10): Promise<AIRecommendation[]> {
    return executeDbWithFallback(
      () =>
        prisma.aIRecommendation.findMany({
          where: { status: "PROPOSED" },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: limit,
        }),
      () => {
        fallbackStore.seed();
        return fallbackStore.recommendations.filter((r) => r.status === "PROPOSED").slice(0, limit) as any;
      },
      "recommendation.getProposed"
    );
  }
}

export const recommendationRepository = new RecommendationRepository();
