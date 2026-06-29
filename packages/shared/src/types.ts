// ─── CAPGuard TrustRouter Types ───────────────────────────────────────────────

/** Status of a trust evaluation job */
export type JobStatus = "pending" | "in_progress" | "completed" | "failed";

/** Status of a sub-order to a candidate agent */
export type SubOrderStatus =
  | "negotiating"
  | "pending_payment"
  | "paid"
  | "delivered"
  | "completed"
  | "failed"
  | "timeout";

/** Result of evaluating a single candidate agent */
export interface CandidateResult {
  service_id: string;
  agent_name: string;
  order_id: string;
  negotiation_id: string;
  status: SubOrderStatus;
  schema_valid: boolean;
  sources_present: boolean;
  sla_passed: boolean;
  proof_present: boolean;
  latency_ms: number;
  delivery_consistency: boolean;
  score: number;
  retries: number;
  raw_delivery?: string;
  error?: string;
}

/** Result of route-and-execute second-stage order */
export interface RoutedExecution {
  enabled: boolean;
  winner_service_id: string;
  winner_order_id: string;
  winner_delivery_hash: string;
  status: "completed" | "failed" | "skipped";
  latency_ms: number;
}

/** Cross-validation result — 4th level A2A: runner-up verifies winner's delivery */
export interface CrossValidation {
  enabled: boolean;
  validator_service_id: string;
  validator_agent_name: string;
  validator_order_id: string;
  validation_score: number; // 0-100: how much the validator agrees with winner
  validation_summary: string;
  status: "completed" | "failed" | "skipped";
  latency_ms: number;
}

/** On-chain proof anchor for immutable verification */
export interface OnChainProof {
  anchored: boolean;
  chain: string; // "base"
  tx_hash: string;
  block_number: number;
  contract_address: string;
  report_hash: string;
  timestamp: string;
}

/** Historical reputation data for an agent */
export interface AgentReputation {
  service_id: string;
  agent_name: string;
  total_evaluations: number;
  average_score: number;
  completion_rate: number;
  avg_latency_ms: number;
  sla_compliance_rate: number;
  source_inclusion_rate: number;
  first_seen: string;
  last_seen: string;
  score_history: { date: string; score: number }[];
  grade: "A+" | "A" | "B+" | "B" | "C" | "D" | "F";
}

/** Trust report generated after evaluating all candidates */
export interface TrustReport {
  report_id: string;
  job_id: string;
  buyer_intent: string;
  candidate_agents: CandidateResult[];
  recommended_service_id: string;
  recommended_reason: string;
  routed_execution: RoutedExecution;
  cross_validation: CrossValidation;
  on_chain_proof: OnChainProof;
  report_hash: string;
  execution_log_hash: string;
  generated_at: string;
  total_candidates: number;
  completed_candidates: number;
  failed_candidates: number;
  average_score: number;
  a2a_depth: number; // 3 = base, 4 = with cross-validation
}

/** Operating mode for the provider */
export interface OperatingMode {
  demoMode: boolean;
  strictCapMode: boolean;
}

/** A trust evaluation job */
export interface TrustJob {
  id: string;
  buyer_wallet: string;
  buyer_intent: string;
  order_id: string;
  negotiation_id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  trust_report?: TrustReport;
  sub_orders: SubOrder[];
  event_log: EventLogEntry[];
}

/** A sub-order dispatched to a candidate agent */
export interface SubOrder {
  id: string;
  job_id: string;
  service_id: string;
  agent_name: string;
  order_id?: string;
  negotiation_id?: string;
  status: SubOrderStatus;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  latency_ms?: number;
  delivery_text?: string;
  score?: number;
}

/** Event log entry for audit trail */
export interface EventLogEntry {
  timestamp: string;
  event: string;
  actor: string;
  target?: string;
  order_id?: string;
  negotiation_id?: string;
  details?: string;
}

/** Configuration for a candidate agent */
export interface CandidateAgentConfig {
  service_id: string;
  agent_name: string;
  description: string;
  expected_schema?: string;
  sla_timeout_ms: number;
  price_usdc: string;
}

/** Dashboard API response types */
export interface DashboardJob {
  id: string;
  buyer_intent: string;
  status: JobStatus;
  created_at: string;
  completed_at?: string;
  total_candidates: number;
  completed_candidates: number;
  recommended_agent?: string;
  top_score?: number;
}

export interface DashboardStats {
  total_jobs: number;
  completed_jobs: number;
  active_jobs: number;
  failed_jobs: number;
  total_sub_orders: number;
  total_cap_transactions: number;
  average_trust_score: number;
  unique_counterparties: number;
  unique_buyer_wallets: number;
}
