import { prisma } from "../client";
import { Prisma, Agent, AgentRun } from "@prisma/client";
import { executeDbWithFallback } from "../resilience";
import { fallbackStore } from "../fallback-store";

export class AgentRepository {
  async list(): Promise<Agent[]> {
    return executeDbWithFallback(
      () =>
        prisma.agent.findMany({
          orderBy: { createdAt: "asc" },
          include: {
            runs: {
              orderBy: { startedAt: "desc" },
              take: 5,
            },
            _count: {
              select: { runs: true },
            },
          },
        }),
      () => {
        fallbackStore.seed();
        return fallbackStore.agents as any;
      },
      "agent.list"
    );
  }

  async findById(id: string): Promise<Agent | null> {
    return executeDbWithFallback(
      () =>
        prisma.agent.findUnique({
          where: { id },
          include: {
            runs: {
              orderBy: { startedAt: "desc" },
              take: 20,
            },
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.agents.find((a) => a.id === id) as any) || null;
      },
      "agent.findById"
    );
  }

  async findByName(name: string): Promise<Agent | null> {
    return executeDbWithFallback(
      () =>
        prisma.agent.findFirst({
          where: { name },
          include: {
            runs: {
              orderBy: { startedAt: "desc" },
              take: 10,
            },
          },
        }),
      () => {
        fallbackStore.seed();
        return (fallbackStore.agents.find((a) => a.name.toLowerCase() === name.toLowerCase()) as any) || null;
      },
      "agent.findByName"
    );
  }

  async create(data: Prisma.AgentCreateInput): Promise<Agent> {
    return executeDbWithFallback(
      () => prisma.agent.create({ data }),
      () => {
        fallbackStore.seed();
        const now = new Date();
        const newAgent = {
          id: `agent-${Date.now().toString(36)}`,
          name: data.name,
          type: data.type,
          description: data.description,
          status: data.status || "ACTIVE",
          lastRunAt: null,
          createdAt: now,
          updatedAt: now,
          runs: [],
          _count: { runs: 0 },
        };
        fallbackStore.agents.push(newAgent);
        return newAgent as any;
      },
      "agent.create"
    );
  }

  async updateStatus(id: string, status: string): Promise<Agent> {
    return executeDbWithFallback(
      () =>
        prisma.agent.update({
          where: { id },
          data: { status },
        }),
      () => {
        fallbackStore.seed();
        const agent = fallbackStore.agents.find((a) => a.id === id);
        if (agent) {
          agent.status = status;
          agent.updatedAt = new Date();
          return agent as any;
        }
        throw new Error(`Agent ${id} not found in fallback store`);
      },
      "agent.updateStatus"
    );
  }

  async recordRun(data: Prisma.AgentRunCreateInput): Promise<AgentRun> {
    return executeDbWithFallback(
      () =>
        prisma.$transaction(async (tx) => {
          const run = await tx.agentRun.create({ data });
          await tx.agent.update({
            where: { id: data.agent.connect?.id },
            data: { lastRunAt: new Date() },
          });
          return run;
        }),
      () => {
        fallbackStore.seed();
        const agentId = data.agent.connect?.id || "agent-001";
        const now = new Date();
        const run: any = {
          id: `run-${Date.now().toString(36)}`,
          agentId,
          status: data.status,
          input: data.input || null,
          output: data.output || null,
          startedAt: (data as any).startedAt || now,
          completedAt: (data as any).completedAt || null,
          error: data.error || null,
          createdAt: now,
        };
        fallbackStore.agentRuns.unshift(run);

        const agent = fallbackStore.agents.find((a) => a.id === agentId);
        if (agent) {
          agent.lastRunAt = now;
          if (!agent.runs) agent.runs = [];
          agent.runs.unshift(run);
          if (agent._count) agent._count.runs += 1;
        }
        return run;
      },
      "agent.recordRun"
    );
  }

  async getRecentRuns(limit: number = 20): Promise<AgentRun[]> {
    return executeDbWithFallback(
      () =>
        prisma.agentRun.findMany({
          include: { agent: true },
          orderBy: { startedAt: "desc" },
          take: limit,
        }),
      () => {
        fallbackStore.seed();
        return fallbackStore.agentRuns.slice(0, limit) as any;
      },
      "agent.getRecentRuns"
    );
  }

  async count(status?: string): Promise<number> {
    return executeDbWithFallback(
      () =>
        prisma.agent.count({
          where: status ? { status } : undefined,
        }),
      () => {
        fallbackStore.seed();
        return status
          ? fallbackStore.agents.filter((a) => a.status === status).length
          : fallbackStore.agents.length;
      },
      "agent.count"
    );
  }
}

export const agentRepository = new AgentRepository();
