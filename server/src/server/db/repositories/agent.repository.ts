import { prisma } from "../client";
import { Prisma, Agent, AgentRun } from "@prisma/client";

export class AgentRepository {
  async list(): Promise<Agent[]> {
    return prisma.agent.findMany({
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
    });
  }

  async findById(id: string): Promise<Agent | null> {
    return prisma.agent.findUnique({
      where: { id },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 20,
        },
      },
    });
  }

  async findByName(name: string): Promise<Agent | null> {
    return prisma.agent.findFirst({
      where: { name },
      include: {
        runs: {
          orderBy: { startedAt: "desc" },
          take: 10,
        },
      },
    });
  }

  async create(data: Prisma.AgentCreateInput): Promise<Agent> {
    return prisma.agent.create({ data });
  }

  async updateStatus(id: string, status: string): Promise<Agent> {
    return prisma.agent.update({
      where: { id },
      data: { status },
    });
  }

  async recordRun(data: Prisma.AgentRunCreateInput): Promise<AgentRun> {
    return prisma.$transaction(async (tx) => {
      const run = await tx.agentRun.create({ data });
      await tx.agent.update({
        where: { id: data.agent.connect?.id },
        data: { lastRunAt: new Date() },
      });
      return run;
    });
  }

  async getRecentRuns(limit: number = 20): Promise<AgentRun[]> {
    return prisma.agentRun.findMany({
      include: { agent: true },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
  }

  async count(status?: string): Promise<number> {
    return prisma.agent.count({
      where: status ? { status } : undefined,
    });
  }
}

export const agentRepository = new AgentRepository();
