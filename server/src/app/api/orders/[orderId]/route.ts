import { NextRequest } from "next/server";
import { payPalService } from "@/server/paypal/service";
import { createSuccessResponse, getRequestIdFromHeader, handleApiError } from "@/server/api";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const requestId = getRequestIdFromHeader(req);
  try {
    const { orderId } = await params;
    const order = await payPalService.getOrder(orderId);
    return createSuccessResponse(order, requestId);
  } catch (err) {
    return handleApiError(err, requestId);
  }
}
