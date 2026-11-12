import { NextRequest } from "next/server";
import { GET as handleOrdersGet, POST as handleOrdersPost } from "../../orders/route";

export async function GET(req: NextRequest) {
  return handleOrdersGet(req);
}

export async function POST(req: NextRequest) {
  return handleOrdersPost(req);
}
