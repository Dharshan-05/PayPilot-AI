import { prisma } from "../client";
import { riskRepository } from "./risk.repository";

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
      // 1. Total revenue from completed payment transactions
      prisma.transaction.aggregate({
        _sum: { amount: true },
        where: { status: "COMPLETED", type: "PAYMENT" },
      }),
      // 2. Total transactions
      prisma.transaction.count(),
      // 3. Successful payments
      prisma.payment.count({ where: { status: "COMPLETED" } }),
      // 4. Pending payments
      prisma.payment.count({ where: { status: "PENDING" } }),
      // 5. Failed payments
      prisma.payment.count({ where: { status: "FAILED" } }),
      // 6. Customers
      prisma.customer.count(),
      // 7. Orders
      prisma.order.count(),
      // 8. Risk overview
      riskRepository.getOverview(),
      // 9. High-risk transactions
      prisma.transaction.count({
        where: { riskLevel: { in: ["HIGH", "CRITICAL"] } },
      }),
      // 10. Active agents
      prisma.agent.count({ where: { status: "ACTIVE" } }),
      // 11. Unread notifications
      prisma.notification.count({ where: { read: false } }),
      // 12. Recent 10 transactions with customer
      prisma.transaction.findMany({
        take: 10,
        orderBy: { transactionDate: "desc" },
        include: { customer: true },
      }),
      // 13. Recent 5 AI insights
      prisma.aIInsight.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      // 14. Top 5 recommendations
      prisma.aIRecommendation.findMany({
        take: 5,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      }),
      // 15. Active agents with run counts
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
          name: tx.customer.name,
          email: tx.customer.email,
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
      revenueByDay: [],
    };
  }
}

export const dashboardRepository = new DashboardRepository();
