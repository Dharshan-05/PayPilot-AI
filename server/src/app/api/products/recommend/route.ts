import { NextRequest } from "next/server";
import { z } from "zod";
import { intelligentSearchEngine } from "@/server/commerce/intelligence/search";
import {
  createSuccessResponse,
  getRequestIdFromHeader,
  handleApiError,
  safeParseJson,
} from "@/server/api";

const recommendSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  maxBudget: z.number().positive().optional(),
  minBudget: z.number().nonnegative().optional(),
  currency: z.string().length(3).default("USD"),
  useCase: z.string().optional(),
  features: z.array(z.string()).optional(),
  userPreferences: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(20).default(5),
});

export async function POST(req: NextRequest) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const rawBody = await safeParseJson<any>(req).catch(() => ({}));
    const validated = recommendSchema.parse(rawBody);

    const result = await intelligentSearchEngine.search({
      query: validated.query,
      category: validated.category,
      maxPrice: validated.maxBudget,
      minPrice: validated.minBudget,
      currency: validated.currency,
      useCase: validated.useCase,
      features: validated.features,
      userPreferences: validated.userPreferences,
      limit: validated.limit,
      inStockOnly: true,
    });

    return createSuccessResponse(
      {
        recommendations: result.results,
        count: result.results.length,
        queryMetadata: result.queryMetadata,
      },
      requestId,
      200
    );
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
