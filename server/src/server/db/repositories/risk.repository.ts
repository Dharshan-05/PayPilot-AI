import { prisma } from "../client";
import { Prisma, RiskAssessment } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class RiskRepository {
  async list(params?: { level?: string; minScore?: number; limit?: number }) {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));

    return executeDbWithFallback(
      () =>
        prisma.riskAssessment.findMany({
          where: {
            ...(params?.level && { level: params.level }),
            ...(params?.minScore && { score: { gte: params.minScore } }),
          },
          include: {
            transaction: {
              include: { customer: true, payment: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: limit,
        }),
      () => {
        fallbackStore.seed();
        let items = [...fallbackStore.riskAssessments];
        if (params?.level) items = items.filter((r) => r.level === params.level);
        if (params?.minScore !== undefined) items = items.filter((r) => r.score >= params.minScore!);
        return items.slice(0, limit) as any;
      },
      "risk.list"
    );
  }

  async findByTransactionId(transactionId: string): Promise<RiskAssessment | null> {
    return executeDbWithFallback(
      () =>
        prisma.riskAssessment.findUnique({
          where: { transactionId },
          include: {
            transaction: {
              include: { customer: true },
            },
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.riskAssessments.find((r) => r.transactionId === transactionId) as any) || null;
      },
      "risk.findByTransactionId"
    );
  }

  async create(data: Prisma.RiskAssessmentCreateInput): Promise<RiskAssessment> {
    return executeDbWithFallback(
      () =>
        prisma.riskAssessment.create({
          data,
          include: { transaction: true },
        }),
      () => {
        fallbackStore.seed();
        const now = new Date();
        const newRa: any = {
          id: `ra-uuid-${Date.now().toString(36)}`,
          transactionId: data.transaction.connect?.id || "tx-001",
          score: data.score,
          level: data.level,
          reasons: data.reasons || null,
          model: data.model,
          confidence: new Prisma.Decimal(data.confidence as any),
          createdAt: now,
          updatedAt: now,
        };
        fallbackStore.riskAssessments.unshift(newRa);
        return newRa;
      },
      "risk.create"
    );
  }

  async getHighRiskAlerts(limit: number = 10) {
    return executeDbWithFallback(
      () =>
        prisma.riskAssessment.findMany({
          where: {
            level: { in: ["HIGH", "CRITICAL"] },
          },
          include: {
            transaction: {
              include: { customer: true },
            },
          },
          orderBy: { score: "desc" },
          take: limit,
        }),
      () => {
        fallbackStore.seed();
        return fallbackStore.riskAssessments
          .filter((r) => r.level === "HIGH" || r.level === "CRITICAL")
          .slice(0, limit) as any;
      },
      "risk.getHighRiskAlerts"
    );
  }

  async getOverview() {
    return executeDbWithFallback(
      async () => {
        const [total, high, medium, low] = await Promise.all([
          prisma.riskAssessment.count(),
          prisma.riskAssessment.count({ where: { level: { in: ["HIGH", "CRITICAL"] } } }),
          prisma.riskAssessment.count({ where: { level: "MEDIUM" } }),
          prisma.riskAssessment.count({ where: { level: "LOW" } }),
        ]);

        const avgScoreResult = await prisma.riskAssessment.aggregate({
          _avg: { score: true },
        });

        return {
          totalAssessments: total,
          highRiskCount: high,
          mediumRiskCount: medium,
          lowRiskCount: low,
          averageScore: Math.round(avgScoreResult._avg.score || 0),
          securityHealthScore: Math.max(0, 100 - (high * 3 + medium)),
        };
      },
      () => {
        fallbackStore.seed();
        const total = fallbackStore.riskAssessments.length;
        const high = fallbackStore.riskAssessments.filter((r) => r.level === "HIGH" || r.level === "CRITICAL").length;
        const medium = fallbackStore.riskAssessments.filter((r) => r.level === "MEDIUM").length;
        const low = fallbackStore.riskAssessments.filter((r) => r.level === "LOW").length;
        const avgScore = total > 0 ? Math.round(fallbackStore.riskAssessments.reduce((sum, r) => sum + r.score, 0) / total) : 18;

        return {
          totalAssessments: total,
          highRiskCount: high,
          mediumRiskCount: medium,
          lowRiskCount: low,
          averageScore: avgScore,
          securityHealthScore: Math.max(0, 100 - (high * 3 + medium)),
        };
      },
      "risk.getOverview"
    );
  }
}

export const riskRepository = new RiskRepository();
