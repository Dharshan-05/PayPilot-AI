import { NextRequest } from "next/server";
import { z } from "zod";
import { notificationRepository } from "@/server/db";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

const markReadSchema = z.object({
  id: z.string().optional(),
  all: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "notifications_list", "general");
  if (limited) return limited;

  try {
    const { searchParams } = new URL(req.url);
    const read = searchParams.get("read") !== null ? searchParams.get("read") === "true" : undefined;
    const type = searchParams.get("type") || undefined;
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const [notifications, unreadCount] = await Promise.all([
      notificationRepository.list({ read, type, limit }),
      notificationRepository.countUnread(),
    ]);

    return createSuccessResponse({ notifications, unreadCount }, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const rawBody = await safeParseJson<any>(req);
    const validated = markReadSchema.parse(rawBody);

    if (validated.all) {
      const result = await notificationRepository.markAllAsRead();
      return createSuccessResponse({ updated: result.count }, requestId);
    }

    if (validated.id) {
      const updated = await notificationRepository.markAsRead(validated.id);
      return createSuccessResponse(updated, requestId);
    }

    return createSuccessResponse({ message: "No action performed" }, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
