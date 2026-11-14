import { prisma } from "../client";
import { Prisma, AIInsight } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class InsightRepository {
  async list(params?: { type?: string; severity?: string; status?: string; limit?: number }) {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));

    return executeDbWithFallback(
      () =>
        prisma.aIInsight.findMany({
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
        }),
      () => {
        fallbackStore.seed();
        let items = [...fallbackStore.insights];
        if (params?.type) items = items.filter((i) => i.type === params.type);
        if (params?.severity) items = items.filter((i) => i.severity === params.severity);
        if (params?.status) items = items.filter((i) => i.status === params.status);
        return items.slice(0, limit) as any;
      },
      "insight.list"
    );
  }

  async findById(id: string): Promise<AIInsight | null> {
    return executeDbWithFallback(
      () =>
        prisma.aIInsight.findUnique({
          where: { id },
          include: { transaction: true },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.insights.find((i) => i.id === id) as any) || null;
      },
      "insight.findById"
    );
  }

  async create(data: Prisma.AIInsightCreateInput): Promise<AIInsight> {
    return executeDbWithFallback(
      () => prisma.aIInsight.create({ data }),
      () => {
        fallbackStore.seed();
        const now = new Date();
        const newIns: any = {
          id: `ins-${Date.now().toString(36)}`,
          transactionId: data.transaction?.connect?.id || null,
          type: data.type,
          title: data.title,
          summary: data.summary,
          severity: data.severity,
          confidence: new Prisma.Decimal(data.confidence as any),
          recommendation: data.recommendation || null,
          status: data.status || "ACTIVE",
          createdAt: now,
          updatedAt: now,
        };
        fallbackStore.insights.unshift(newIns);
        return newIns;
      },
      "insight.create"
    );
  }

  async updateStatus(id: string, status: string): Promise<AIInsight> {
    return executeDbWithFallback(
      () =>
        prisma.aIInsight.update({
          where: { id },
          data: { status },
        }),
      () => {
        fallbackStore.seed();
        const ins = fallbackStore.insights.find((i) => i.id === id);
        if (ins) {
          ins.status = status;
          ins.updatedAt = new Date();
          return ins as any;
        }
        throw new Error(`Insight ${id} not found in fallback store`);
      },
      "insight.updateStatus"
    );
  }

  async getActive(limit: number = 10) {
    return executeDbWithFallback(
      () =>
        prisma.aIInsight.findMany({
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
      () => {
        fallbackStore.seed();
        return fallbackStore.insights.filter((i) => i.status === "ACTIVE").slice(0, limit) as any;
      },
      "insight.getActive"
    );
  }
}

export const insightRepository = new InsightRepository();
