import { NextRequest } from "next/server";
import { payPalService } from "@/server/paypal/service";
import {
  createSuccessResponse,
  enforceRateLimit,
  getRequestIdFromHeader,
  handleApiError,
} from "@/server/api";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const requestId = getRequestIdFromHeader(req);
  const limited = enforceRateLimit(req, requestId, "orders_capture", "sensitive");
  if (limited) return limited;
  try {
    const { orderId } = await params;
    const captureResult = await payPalService.captureOrder(orderId);
    return createSuccessResponse(captureResult, requestId, 200);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
