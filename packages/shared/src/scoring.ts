import type { CandidateResult, SlaGuard, ConsensusResult } from "./types.js";

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

// ─── SLA-Gated Safe Routing ───────────────────────────────────────────────────
// Determines whether each candidate passed all routing gates.
// CAPGuard only routes execution to agents that pass ALL of:
//   1. Score >= MIN_ROUTE_SCORE
//   2. Schema valid (if required)
//   3. Proof present (if required)
//   4. SLA passed (if required)
// This controls routing decisions, NOT fund escrow or release.

export interface SlaGuardConfig {
  minRouteScore: number;
  requireSchemaValid: boolean;
  requireProofPresent: boolean;
  requireSlaPassed: boolean;
}

export function getDefaultSlaGuardConfig(): SlaGuardConfig {
  return {
    minRouteScore: parseInt(process.env.MIN_ROUTE_SCORE ?? "80", 10),
    requireSchemaValid: process.env.REQUIRE_SCHEMA_VALID_FOR_ROUTE !== "false",
    requireProofPresent: process.env.REQUIRE_PROOF_FOR_ROUTE !== "false",
    requireSlaPassed: process.env.REQUIRE_SLA_FOR_ROUTE !== "false",
  };
}

/**
 * Calculate SLA-gated routing result for all candidates and the winner.
 * Returns which agents were blocked and why, plus overall routing decision.
 */
export function calculateSlaGuard(
  candidates: CandidateResult[],
  winnerId: string,
  config?: SlaGuardConfig
): SlaGuard {
  const cfg = config ?? getDefaultSlaGuardConfig();

  const blocked: SlaGuard["blocked_agents"] = [];

  for (const c of candidates) {
    const reasons: string[] = [];

    if (c.score < cfg.minRouteScore) {
      reasons.push("score_below_threshold");
    }
    if (cfg.requireSchemaValid && !c.schema_valid) {
      reasons.push("schema_invalid");
    }
    if (cfg.requireProofPresent && !c.proof_present) {
      reasons.push("proof_missing");
    }
    if (cfg.requireSlaPassed && !c.sla_passed) {
      reasons.push("sla_failed");
    }

    if (reasons.length > 0) {
      blocked.push({
        service_id: c.service_id,
        agent_name: c.agent_name,
        reasons,
      });
    }
  }

  const isBlocked = (id: string) => blocked.some((b) => b.service_id === id);

  const anyPassed = candidates.some((c) => !isBlocked(c.service_id));
  const winnerPassed = winnerId !== "none" && !isBlocked(winnerId);

  return {
    enabled: true,
    min_route_score: cfg.minRouteScore,
    require_schema_valid: cfg.requireSchemaValid,
    require_proof_present: cfg.requireProofPresent,
    require_sla_passed: cfg.requireSlaPassed,
    route_allowed: anyPassed,
    winner_passed_gate: winnerPassed,
    blocked_agents: blocked,
  };
}

// ─── Consensus Scoring ────────────────────────────────────────────────────────
// Measures how much candidates agree with each other on their deliveries.
// Uses keyword overlap to estimate agreement without requiring LLM.

/**
 * Extract meaningful keywords from a delivery string.
 * Filters out common stop words and short tokens.
 */
function extractKeywords(text: string): Set<string> {
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "in", "on", "at", "to",
    "for", "of", "and", "or", "but", "with", "by", "from", "this", "that",
    "it", "its", "be", "been", "have", "has", "had", "do", "does", "did",
    "will", "would", "could", "should", "may", "might", "not", "no", "yes",
  ]);

  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w))
      .slice(0, 100) // cap to top 100 tokens
  );
}

/**
 * Calculate Jaccard similarity between two keyword sets (0–1).
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = new Set([...a].filter((w) => b.has(w)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

/**
 * Calculate consensus scoring across candidate deliveries.
 * Agreement is based on keyword overlap between delivery texts.
 */
export function calculateConsensus(candidates: CandidateResult[]): ConsensusResult {
  const withDelivery = candidates.filter(
    (c) =>
      (c.status === "completed" || c.status === "delivered") &&
      c.raw_delivery &&
      c.raw_delivery.trim().length > 0
  );

  if (withDelivery.length < 2) {
    return {
      enabled: false,
      agreement_score: 0,
      weighted_by_reputation: false,
      outlier_agents: [],
      majority_summary: withDelivery.length < 2
        ? "Need at least 2 completed candidates for consensus scoring"
        : "Consensus scoring requires delivery content",
    };
  }

  // Extract keywords from each candidate delivery
  const keywordSets = withDelivery.map((c) => ({
    service_id: c.service_id,
    agent_name: c.agent_name,
    score: c.score,
    keywords: extractKeywords(c.raw_delivery ?? ""),
  }));

  // Pairwise similarity matrix
  const similarities: number[] = [];
  const agentSimilarities = new Map<string, number[]>();

  for (let i = 0; i < keywordSets.length; i++) {
    for (let j = i + 1; j < keywordSets.length; j++) {
      const sim = jaccardSimilarity(keywordSets[i].keywords, keywordSets[j].keywords);
      similarities.push(sim);

      const a = keywordSets[i].service_id;
      const b = keywordSets[j].service_id;
      if (!agentSimilarities.has(a)) agentSimilarities.set(a, []);
      if (!agentSimilarities.has(b)) agentSimilarities.set(b, []);
      agentSimilarities.get(a)!.push(sim);
      agentSimilarities.get(b)!.push(sim);
    }
  }

  // Overall agreement score (0–100)
  const avgSimilarity =
    similarities.length > 0
      ? similarities.reduce((a, b) => a + b, 0) / similarities.length
      : 0;
  const agreementScore = Math.round(avgSimilarity * 100);

  // Find outliers: agents whose avg similarity to others is below threshold
  const outlierThreshold = avgSimilarity * 0.5; // 50% below average = outlier
  const outlierAgents: string[] = [];
  for (const [serviceId, sims] of agentSimilarities) {
    const avg = sims.reduce((a, b) => a + b, 0) / sims.length;
    if (avg < outlierThreshold && keywordSets.length >= 3) {
      outlierAgents.push(serviceId);
    }
  }

  // Build majority summary
  let summary: string;
  if (agreementScore >= 70) {
    summary = `High consensus (${agreementScore}%): Candidates broadly agree on the topic. Response is reliable.`;
  } else if (agreementScore >= 40) {
    summary = `Moderate consensus (${agreementScore}%): Candidates partially agree. Review individual responses for nuances.`;
  } else {
    summary = `Low consensus (${agreementScore}%): Candidates diverge significantly. Exercise caution — responses may reflect different interpretations.`;
  }

  if (outlierAgents.length > 0) {
    const outlierNames = outlierAgents
      .map((id) => keywordSets.find((k) => k.service_id === id)?.agent_name ?? id)
      .join(", ");
    summary += ` Outlier(s): ${outlierNames}.`;
  }

  return {
    enabled: true,
    agreement_score: agreementScore,
    weighted_by_reputation: false, // reputation weighting is future work (requires historical data)
    outlier_agents: outlierAgents,
    majority_summary: summary,
  };
}
