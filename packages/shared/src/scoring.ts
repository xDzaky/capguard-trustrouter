import type { CandidateResult } from "./types.js";

// ─── Trust Scoring Engine ────────────────────────────────────────────────────
// Formula:
//   trust_score =
//     0.25 * schema_valid +
//     0.20 * proof_present +
//     0.20 * sources_present +
//     0.15 * sla_passed +
//     0.10 * latency_score +
//     0.10 * delivery_consistency
//
// Boolean values mapped to 0 or 100, then weighted and normalized to 0–100.

const WEIGHTS = {
  schema_valid: 0.25,
  proof_present: 0.20,
  sources_present: 0.20,
  sla_passed: 0.15,
  latency_score: 0.10,
  delivery_consistency: 0.10,
} as const;

/**
 * Calculate latency score (0–100).
 * < 10s = 100, 10–30s = linear decrease, > 60s = 0
 */
function calculateLatencyScore(latencyMs: number): number {
  if (latencyMs <= 10_000) return 100;
  if (latencyMs >= 60_000) return 0;
  return Math.round(100 * (1 - (latencyMs - 10_000) / 50_000));
}

/**
 * Calculate trust score for a candidate agent based on evaluation metrics.
 * Returns a score from 0 to 100.
 */
export function calculateTrustScore(candidate: {
  schema_valid: boolean;
  proof_present: boolean;
  sources_present: boolean;
  sla_passed: boolean;
  latency_ms: number;
  delivery_consistency: boolean;
}): number {
  const boolToScore = (v: boolean) => (v ? 100 : 0);
  const latencyScore = calculateLatencyScore(candidate.latency_ms);

  const raw =
    WEIGHTS.schema_valid * boolToScore(candidate.schema_valid) +
    WEIGHTS.proof_present * boolToScore(candidate.proof_present) +
    WEIGHTS.sources_present * boolToScore(candidate.sources_present) +
    WEIGHTS.sla_passed * boolToScore(candidate.sla_passed) +
    WEIGHTS.latency_score * latencyScore +
    WEIGHTS.delivery_consistency * boolToScore(candidate.delivery_consistency);

  return Math.round(raw);
}

/**
 * Determine the best candidate and generate a recommendation reason.
 */
export function selectBestCandidate(
  candidates: CandidateResult[]
): { recommended_service_id: string; recommended_reason: string } {
  const completed = candidates.filter(
    (c) => c.status === "completed" || c.status === "delivered"
  );

  if (completed.length === 0) {
    return {
      recommended_service_id: "none",
      recommended_reason: "No candidates completed successfully",
    };
  }

  const sorted = [...completed].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const runner = sorted[1];

  let reason = `Highest composite trust score (${best.score}/100)`;

  const strengths: string[] = [];
  if (best.schema_valid) strengths.push("valid schema");
  if (best.proof_present) strengths.push("proof verified");
  if (best.sources_present) strengths.push("sources included");
  if (best.sla_passed) strengths.push("within SLA");
  if (best.delivery_consistency) strengths.push("consistent delivery");

  if (strengths.length > 0) {
    reason += ` with ${strengths.join(", ")}`;
  }

  if (runner) {
    reason += `. Runner-up: ${runner.agent_name} (${runner.score}/100)`;
  }

  return {
    recommended_service_id: best.service_id,
    recommended_reason: reason,
  };
}

/**
 * Calculate statistics for a set of candidates.
 */
export function calculateStats(candidates: CandidateResult[]) {
  const completed = candidates.filter(
    (c) => c.status === "completed" || c.status === "delivered"
  );
  const failed = candidates.filter((c) => c.status === "failed" || c.status === "timeout");
  const scores = completed.map((c) => c.score);
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

  return {
    total_candidates: candidates.length,
    completed_candidates: completed.length,
    failed_candidates: failed.length,
    average_score: avgScore,
  };
}
