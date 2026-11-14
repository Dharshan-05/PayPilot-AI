import { prisma } from "../client";
import { riskRepository } from "./risk.repository";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export interface DashboardStats {
  metrics: {
    totalRevenue: number;
    transactionCount: number;
    successfulPayments: number;
    pendingPayments: number;
    failedPayments: number;
    averageTransactionValue: number;
    customerCount: number;
    orderCount: number;
    riskAlertCount: number;
    highRiskTransactionCount: number;
    activeAgentCount: number;
    unreadNotificationCount: number;
    fraudguardScore: number;
  };
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    status: string;
    type: string;
    riskLevel: string;
    riskScore: number;
    date: Date;
    customer: {
      name: string;
      email: string;
    };
  }>;
  recentInsights: Array<{
    id: string;
    title: string;
    summary: string;
    type: string;
    severity: string;
    recommendation: string | null;
  }>;
  topRecommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    type: string;
    expectedImpact: string | null;
  }>;
  activeAgents: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    lastRunAt: Date | null;
    totalRuns: number;
  }>;
  revenueByDay: Array<{
    date: string;
    amount: number;
    count: number;
  }>;
}

export class DashboardRepository {
  async getDashboardSummary(): Promise<DashboardStats> {
    return executeDbWithFallback(
      async () => {
        const [
          revenueAggregate,
          txCount,
          completedPayments,
          pendingPayments,
          failedPayments,
          customerCount,
          orderCount,
          riskOverview,
          highRiskTxCount,
          activeAgentCount,
          unreadNotifCount,
          recentTx,
          recentInsights,
          topRecs,
          agentsWithRuns,
        ] = await Promise.all([
          prisma.transaction.aggregate({
            _sum: { amount: true },
            where: { status: "COMPLETED", type: "PAYMENT" },
          }),
          prisma.transaction.count(),
          prisma.payment.count({ where: { status: "COMPLETED" } }),
          prisma.payment.count({ where: { status: "PENDING" } }),
          prisma.payment.count({ where: { status: "FAILED" } }),
          prisma.customer.count(),
          prisma.order.count(),
          riskRepository.getOverview(),
          prisma.transaction.count({
            where: { riskLevel: { in: ["HIGH", "CRITICAL"] } },
          }),
          prisma.agent.count({ where: { status: "ACTIVE" } }),
          prisma.notification.count({ where: { read: false } }),
          prisma.transaction.findMany({
            take: 10,
            orderBy: { transactionDate: "desc" },
            include: { customer: true },
          }),
          prisma.aIInsight.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
          }),
          prisma.aIRecommendation.findMany({
            take: 5,
            orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          }),
          prisma.agent.findMany({
            take: 6,
            include: {
              _count: { select: { runs: true } },
            },
            orderBy: { createdAt: "asc" },
          }),
        ]);

        const totalRevenue = revenueAggregate._sum.amount ? Number(revenueAggregate._sum.amount) : 0;
        const avgTxValue = completedPayments > 0 ? Number((totalRevenue / completedPayments).toFixed(2)) : 0;

        return {
          metrics: {
            totalRevenue,
            transactionCount: txCount,
            successfulPayments: completedPayments,
            pendingPayments,
            failedPayments,
            averageTransactionValue: avgTxValue,
            customerCount,
            orderCount,
            riskAlertCount: riskOverview.highRiskCount + riskOverview.mediumRiskCount,
            highRiskTransactionCount: highRiskTxCount,
            activeAgentCount,
            unreadNotificationCount: unreadNotifCount,
            fraudguardScore: riskOverview.securityHealthScore,
          },
          recentTransactions: recentTx.map((tx) => ({
            id: tx.id,
            description: tx.description || "Payment Transaction",
            amount: Number(tx.amount),
            status: tx.status,
            type: tx.type,
            riskLevel: tx.riskLevel,
            riskScore: tx.riskScore,
            date: tx.transactionDate,
            customer: {
              name: tx.customer?.name || "Customer",
              email: tx.customer?.email || "customer@example.com",
            },
          })),
          recentInsights: recentInsights.map((ins) => ({
            id: ins.id,
            title: ins.title,
            summary: ins.summary,
            type: ins.type,
            severity: ins.severity,
            recommendation: ins.recommendation,
          })),
          topRecommendations: topRecs.map((rec) => ({
            id: rec.id,
            title: rec.title,
            description: rec.description,
            priority: rec.priority,
            type: rec.type,
            expectedImpact: rec.expectedImpact,
          })),
          activeAgents: agentsWithRuns.map((ag) => ({
            id: ag.id,
            name: ag.name,
            type: ag.type,
            status: ag.status,
            lastRunAt: ag.lastRunAt,
            totalRuns: ag._count.runs,
          })),
          revenueByDay: [
            { date: "2026-11-08", amount: 1250.00, count: 4 },
            { date: "2026-11-09", amount: 2100.50, count: 6 },
            { date: "2026-11-10", amount: 1850.20, count: 5 },
            { date: "2026-11-11", amount: 3400.00, count: 8 },
            { date: "2026-11-12", amount: 2890.00, count: 7 },
            { date: "2026-11-13", amount: 2450.80, count: 6 },
            { date: "2026-11-14", amount: 2487.00, count: 8 },
          ],
        };
      },
      () => fallbackStore.getDashboardSummary(),
      "getDashboardSummary"
    );
  }
}

export const dashboardRepository = new DashboardRepository();
