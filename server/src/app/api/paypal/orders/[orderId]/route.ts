import { NextRequest } from "next/server";
import { GET as handleOrderDetailGet } from "../../../orders/[orderId]/route";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  return handleOrderDetailGet(req, context);
}
