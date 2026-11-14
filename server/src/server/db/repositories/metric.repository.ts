import { prisma } from "../client";
import { Prisma, BusinessMetric } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class MetricRepository {
  async getLatestMetrics(): Promise<BusinessMetric[]> {
    return executeDbWithFallback(
      () =>
        prisma.businessMetric.findMany({
          orderBy: { recordedAt: "desc" },
          distinct: ["metric"],
        }),
      () => {
        fallbackStore.seed();
        return fallbackStore.metrics as any;
      },
      "metric.getLatestMetrics"
    );
  }

  async getHistorical(metric: string, limit: number = 30): Promise<BusinessMetric[]> {
    return executeDbWithFallback(
      () =>
        prisma.businessMetric.findMany({
          where: { metric },
          orderBy: { recordedAt: "desc" },
          take: limit,
        }),
      () => {
        fallbackStore.seed();
        return fallbackStore.metrics.filter((m) => m.metric === metric).slice(0, limit) as any;
      },
      "metric.getHistorical"
    );
  }

  async recordMetric(data: Prisma.BusinessMetricCreateInput): Promise<BusinessMetric> {
    return executeDbWithFallback(
      () => prisma.businessMetric.create({ data }),
      () => {
        fallbackStore.seed();
        const newMetric: any = {
          id: `met-${Date.now().toString(36)}`,
          metric: data.metric,
          value: new Prisma.Decimal(data.value as any),
          previousValue: data.previousValue ? new Prisma.Decimal(data.previousValue as any) : null,
          changePercent: data.changePercent ? new Prisma.Decimal(data.changePercent as any) : null,
          period: data.period || "DAILY",
          recordedAt: new Date(),
        };
        fallbackStore.metrics.unshift(newMetric);
        return newMetric;
      },
      "metric.recordMetric"
    );
  }

  async upsertMetric(metric: string, value: number, period: string = "DAILY"): Promise<BusinessMetric> {
    return executeDbWithFallback(
      async () => {
        const existing = await prisma.businessMetric.findFirst({
          where: { metric, period },
          orderBy: { recordedAt: "desc" },
        });

        const previousValue = existing ? Number(existing.value) : null;
        const changePercent =
          previousValue !== null && previousValue !== 0
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
      },
      () => {
        fallbackStore.seed();
        const existing = fallbackStore.metrics.find((m) => m.metric === metric && m.period === period);
        const previousValue = existing ? Number(existing.value) : null;
        const changePercent =
          previousValue !== null && previousValue !== 0
            ? ((value - previousValue) / previousValue) * 100
            : null;

        const newMetric: any = {
          id: `met-${Date.now().toString(36)}`,
          metric,
          value: new Prisma.Decimal(value),
          previousValue: previousValue !== null ? new Prisma.Decimal(previousValue) : null,
          changePercent: changePercent !== null ? new Prisma.Decimal(changePercent) : null,
          period,
          recordedAt: new Date(),
        };
        fallbackStore.metrics.unshift(newMetric);
        return newMetric;
      },
      "metric.upsertMetric"
    );
  }
}

export const metricRepository = new MetricRepository();
