import { prisma } from "../client";
import { Prisma, RiskAssessment } from "@prisma/client";

export class RiskRepository {
  async list(params?: { level?: string; minScore?: number; limit?: number }) {
    const limit = Math.min(100, Math.max(1, params?.limit || 50));

    return prisma.riskAssessment.findMany({
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
    });
  }

  async findByTransactionId(transactionId: string): Promise<RiskAssessment | null> {
    return prisma.riskAssessment.findUnique({
      where: { transactionId },
      include: {
        transaction: {
          include: { customer: true },
        },
      },
    });
  }

  async create(data: Prisma.RiskAssessmentCreateInput): Promise<RiskAssessment> {
    return prisma.riskAssessment.create({
      data,
      include: { transaction: true },
    });
  }

  async getHighRiskAlerts(limit: number = 10) {
    return prisma.riskAssessment.findMany({
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
    });
  }

  async getOverview() {
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
  }
}

export const riskRepository = new RiskRepository();
