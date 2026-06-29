import crypto from "node:crypto";

/**
 * Compute SHA-256 hash and return as hex string prefixed with 0x.
 */
export function sha256Hex(input: string): string {
  return "0x" + crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Generate a unique ID with prefix.
 */
export function generateId(prefix: string): string {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString("hex");
  return `${prefix}_${ts}_${rand}`;
}

/**
 * Hash a trust report for verifiable proof.
 * Excludes the report_hash field itself to avoid circular hashing.
 */
export function hashReport(report: Record<string, unknown>): string {
  const { report_hash: _, ...rest } = report;
  return sha256Hex(JSON.stringify(rest, null, 0));
}

/**
 * Hash an execution log for verifiable proof.
 */
export function hashExecutionLog(log: unknown[]): string {
  return sha256Hex(JSON.stringify(log, null, 0));
}
