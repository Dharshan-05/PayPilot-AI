import crypto from "crypto";

export function generateRequestId(prefix: string = "req"): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString("hex");
  return `${prefix}_${timestamp}_${random}`;
}
