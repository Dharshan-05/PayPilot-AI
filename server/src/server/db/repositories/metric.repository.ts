import { prisma } from "../client";
import { Prisma, BusinessMetric } from "@prisma/client";

export class MetricRepository {
  async getLatestMetrics(): Promise<BusinessMetric[]> {
    return prisma.businessMetric.findMany({
      orderBy: { recordedAt: "desc" },
      distinct: ["metric"],
    });
  }

  async getHistorical(metric: string, limit: number = 30): Promise<BusinessMetric[]> {
    return prisma.businessMetric.findMany({
      where: { metric },
      orderBy: { recordedAt: "desc" },
      take: limit,
    });
  }

  async recordMetric(data: Prisma.BusinessMetricCreateInput): Promise<BusinessMetric> {
    return prisma.businessMetric.create({ data });
  }

  async upsertMetric(metric: string, value: number, period: string = "DAILY"): Promise<BusinessMetric> {
    const existing = await prisma.businessMetric.findFirst({
      where: { metric, period },
      orderBy: { recordedAt: "desc" },
    });

    const previousValue = existing ? Number(existing.value) : null;
    const changePercent = previousValue !== null && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : null;

    return prisma.businessMetric.create({
      data: {
        metric,
        value: new Prisma.Decimal(value),
        previousValue: previousValue !== null ? new Prisma.Decimal(previousValue) : null,
        changePercent: changePercent !== null ? new Prisma.Decimal(changePercent) : null,
        period,
      },
    });
  }
}

export const metricRepository = new MetricRepository();
