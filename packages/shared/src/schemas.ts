import { z } from "zod";

// ─── Zod Schemas for Validation ──────────────────────────────────────────────

/** Schema for buyer request (incoming intent) */
export const BuyerRequestSchema = z.object({
  intent: z.string().min(1, "Intent is required"),
  max_candidates: z.number().int().min(1).max(10).default(3),
  sla_timeout_ms: z.number().int().min(5000).max(120000).default(60000),
  require_sources: z.boolean().default(false),
  budget_usdc: z.string().optional(),
});

export type BuyerRequest = z.infer<typeof BuyerRequestSchema>;

/** Schema for candidate agent delivery */
export const CandidateDeliverySchema = z.object({
  content: z.string().min(1),
  sources: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CandidateDelivery = z.infer<typeof CandidateDeliverySchema>;

/** Schema for the trust report final output */
export const TrustReportSchema = z.object({
  report_id: z.string(),
  job_id: z.string(),
  buyer_intent: z.string(),
  candidate_agents: z.array(
    z.object({
      service_id: z.string(),
      agent_name: z.string(),
      order_id: z.string(),
      negotiation_id: z.string(),
      status: z.string(),
      schema_valid: z.boolean(),
      sources_present: z.boolean(),
      sla_passed: z.boolean(),
      proof_present: z.boolean(),
      latency_ms: z.number(),
      delivery_consistency: z.boolean(),
      score: z.number(),
    })
  ),
  recommended_service_id: z.string(),
  recommended_reason: z.string(),
  routed_execution: z.object({
    enabled: z.boolean(),
    winner_service_id: z.string(),
    winner_order_id: z.string(),
    winner_delivery_hash: z.string(),
    status: z.enum(["completed", "failed", "skipped"]),
    latency_ms: z.number(),
  }),
  cross_validation: z.object({
    enabled: z.boolean(),
    validator_service_id: z.string(),
    validator_agent_name: z.string(),
    validator_order_id: z.string(),
    validation_score: z.number(),
    validation_summary: z.string(),
    status: z.enum(["completed", "failed", "skipped"]),
    latency_ms: z.number(),
  }),
  on_chain_proof: z.object({
    anchored: z.boolean(),
    chain: z.string(),
    tx_hash: z.string(),
    block_number: z.number(),
    contract_address: z.string(),
    report_hash: z.string(),
    timestamp: z.string(),
    note: z.string().optional(),
  }),
  sla_guard: z.object({
    enabled: z.boolean(),
    min_route_score: z.number(),
    require_schema_valid: z.boolean(),
    require_proof_present: z.boolean(),
    require_sla_passed: z.boolean(),
    route_allowed: z.boolean(),
    winner_passed_gate: z.boolean(),
    blocked_agents: z.array(
      z.object({
        service_id: z.string(),
        agent_name: z.string(),
        reasons: z.array(z.string()),
      })
    ),
  }),
  consensus: z.object({
    enabled: z.boolean(),
    agreement_score: z.number(),
    weighted_by_reputation: z.boolean(),
    outlier_agents: z.array(z.string()),
    majority_summary: z.string(),
  }),
  report_hash: z.string(),
  execution_log_hash: z.string(),
  generated_at: z.string(),
  total_candidates: z.number(),
  completed_candidates: z.number(),
  failed_candidates: z.number(),
  average_score: z.number(),
  a2a_depth: z.number(),
});

/** Schema for event log */
export const EventLogSchema = z.object({
  timestamp: z.string(),
  event: z.string(),
  actor: z.string(),
  target: z.string().optional(),
  order_id: z.string().optional(),
  negotiation_id: z.string().optional(),
  details: z.string().optional(),
});
