import { prisma } from "../db/client";
import { CommerceConversation, CommerceMessage } from "@prisma/client";
import { redactSensitiveData } from "../security/redactor";
import { sanitizeString } from "../security/sanitizer";
import { Logger } from "../observability/logger";

const log = new Logger("ConversationManager");

export class ConversationManager {
  async getOrCreateConversation(sessionId: string, userId?: string): Promise<CommerceConversation> {
    const cleanSession = sanitizeString(sessionId, 100);
    return prisma.commerceConversation.upsert({
      where: { sessionId: cleanSession },
      update: { ...(userId && { userId }) },
      create: { sessionId: cleanSession, userId },
    });
  }

  async addMessage(params: {
    sessionId: string;
    role: "user" | "assistant" | "system";
    content: string;
    metadata?: Record<string, any>;
    userId?: string;
  }): Promise<CommerceMessage> {
    const conversation = await this.getOrCreateConversation(params.sessionId, params.userId);

    // Hard Security Rule: NEVER store secrets or sensitive credentials in memory
    const safeContent = redactSensitiveData(sanitizeString(params.content, 4000));
    const safeMetadata = params.metadata ? redactSensitiveData(params.metadata) : null;

    return prisma.commerceMessage.create({
      data: {
        conversationId: conversation.id,
        role: params.role,
        content: safeContent,
        metadata: safeMetadata ? JSON.stringify(safeMetadata) : null,
      },
    });
  }

  async getRecentMessages(sessionId: string, limit: number = 10): Promise<CommerceMessage[]> {
    const conversation = await prisma.commerceConversation.findUnique({
      where: { sessionId },
    });
    if (!conversation) return [];

    return prisma.commerceMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    }).then((msgs) => msgs.reverse());
  }
}

export const conversationManager = new ConversationManager();
