import { NextRequest } from "next/server";
import { POST as handleOrderCapturePost } from "../../../../orders/[orderId]/capture/route";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  return handleOrderCapturePost(req, context);
}
