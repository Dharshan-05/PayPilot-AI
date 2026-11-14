import { prisma } from "./client";
import { Logger } from "../observability/logger";

const log = new Logger("DatabaseResilience");

let dbConnected: boolean | null = null;
let lastCheckTime = 0;
const PROBE_INTERVAL_MS = 15000; // 15 seconds

/**
 * Detects whether the current environment is running on Vercel with a localhost DB URL,
 * where local PostgreSQL is guaranteed to be unreachable.
 */
function isVercelLocalhostMismatch(): boolean {
  const isVercel = process.env.VERCEL === "1" || Boolean(process.env.VERCEL_ENV);
  const dbUrl = process.env.DATABASE_URL || "";
  const isLocalhost =
    dbUrl.includes("localhost") ||
    dbUrl.includes("127.0.0.1") ||
    dbUrl.startsWith("file:");

  return isVercel && isLocalhost;
}

/**
 * Checks whether PostgreSQL is connected and responding to queries.
 * Caches result for PROBE_INTERVAL_MS to prevent latency overhead.
 */
export async function isDatabaseConnected(): Promise<boolean> {
  // If running in Vercel with localhost DB, immediately mark as disconnected
  if (isVercelLocalhostMismatch()) {
    if (dbConnected !== false) {
      log.warn("Running on Vercel with localhost DATABASE_URL; activating resilient in-memory fallback store.");
      dbConnected = false;
      lastCheckTime = Date.now();
    }
    return false;
  }

  const now = Date.now();
  if (dbConnected !== null && now - lastCheckTime < PROBE_INTERVAL_MS) {
    return dbConnected;
  }

  try {
    const probeTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database probe timeout after 1500ms")), 1500)
    );
    await Promise.race([prisma.$queryRaw`SELECT 1`, probeTimeout]);
    dbConnected = true;
  } catch (err: any) {
    if (dbConnected !== false) {
      log.warn("Database connection probe failed; activating resilient fallback mode.", {
        error: err.message,
      });
    }
    dbConnected = false;
  }

  lastCheckTime = now;
  return dbConnected;
}

/**
 * Determines whether an error is a database connectivity, network, or initialization error.
 */
export function isDatabaseConnectionError(error: any): boolean {
  if (!error) return false;

  const msg = String(error.message || "").toLowerCase();
  const name = String(error.name || "");
  const code = String(error.code || "");

  return (
    name === "PrismaClientInitializationError" ||
    name === "PrismaClientRustPanicError" ||
    code === "P1000" ||
    code === "P1001" ||
    code === "P1002" ||
    code === "P1003" ||
    code === "P1017" ||
    msg.includes("can't reach database") ||
    msg.includes("cannot reach database") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("enotfound") ||
    msg.includes("connection closed") ||
    msg.includes("server has closed the connection") ||
    msg.includes("timeout") ||
    msg.includes("database probe timeout") ||
    msg.includes("connect econnrefused")
  );
}

/**
 * Executes a database operation with transparent fallback to the resilient in-memory store
 * whenever PostgreSQL is offline, unreachable, or throwing connection errors.
 */
export async function executeDbWithFallback<T>(
  operation: () => Promise<T>,
  fallback: () => T | Promise<T>,
  operationName: string = "dbOperation"
): Promise<T> {
  const connected = await isDatabaseConnected();

  if (!connected) {
    log.debug(`[${operationName}] DB offline; serving via resilient fallback store.`);
    return await fallback();
  }

  try {
    return await operation();
  } catch (err: any) {
    if (isDatabaseConnectionError(err)) {
      log.warn(`[${operationName}] DB error occurred; serving via resilient fallback store.`, {
        error: err.message,
      });
      dbConnected = false;
      lastCheckTime = Date.now();
      return await fallback();
    }
    throw err;
  }
}
