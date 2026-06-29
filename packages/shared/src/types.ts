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
  raw_delivery?: string;
  error?: string;
}

/** Trust report generated after evaluating all candidates */
export interface TrustReport {
  report_id: string;
  job_id: string;
  buyer_intent: string;
  candidate_agents: CandidateResult[];
  recommended_service_id: string;
  recommended_reason: string;
  report_hash: string;
  execution_log_hash: string;
  generated_at: string;
  total_candidates: number;
  completed_candidates: number;
  failed_candidates: number;
  average_score: number;
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
