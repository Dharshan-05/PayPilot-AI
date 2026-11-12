import { z } from "zod";

export const aiActionEnum = z.enum([
  "recommend_product",
  "prepare_order",
  "inquire_info",
  "reject",
]);

export type AIAction = z.infer<typeof aiActionEnum>;

export const aiParametersSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  description: z.string().max(255).optional(),
  customerEmail: z.string().email().optional(),
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        quantity: z.number().int().positive(),
        unitAmount: z.number().positive(),
      })
    )
    .optional(),
  reason: z.string().optional(),
});

export type AIParameters = z.infer<typeof aiParametersSchema>;

export const aiResponseSchema = z.object({
  success: z.boolean(),
  action: aiActionEnum,
  confidence: z.number().min(0).max(1),
  reasoning_summary: z.string().min(1),
  parameters: aiParametersSchema.default({}),
  warnings: z.array(z.string()).default([]),
  metadata: z.object({
    provider: z.string(),
    model: z.string(),
    latencyMs: z.number().nonnegative(),
    requestId: z.string(),
    isMock: z.boolean(),
  }),
});

export type AIStructuredResponse = z.infer<typeof aiResponseSchema>;

export interface AIRequest {
  prompt: string;
  context?: Record<string, any>;
  userId?: string;
  requestId: string;
}

export interface BusinessRuleValidationResult {
  isValid: boolean;
  violations: string[];
  warnings: string[];
  authorizedAction: AIAction;
  sanitizedParameters: AIParameters;
}
