const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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

export interface DashboardJob {
  id: string;
  buyer_intent: string;
  status: string;
  created_at: string;
  completed_at?: string;
  total_candidates: number;
  completed_candidates: number;
  recommended_agent?: string;
  top_score?: number;
}

export interface TrustJob {
  id: string;
  buyer_wallet: string;
  buyer_intent: string;
  order_id: string;
  negotiation_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  trust_report?: TrustReport;
  sub_orders: SubOrder[];
  event_log: EventLogEntry[];
}

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

export interface CandidateResult {
  service_id: string;
  agent_name: string;
  order_id: string;
  negotiation_id: string;
  status: string;
  schema_valid: boolean;
  sources_present: boolean;
  sla_passed: boolean;
  proof_present: boolean;
  latency_ms: number;
  delivery_consistency: boolean;
  score: number;
}

export interface SubOrder {
  id: string;
  job_id: string;
  service_id: string;
  agent_name: string;
  order_id?: string;
  negotiation_id?: string;
  status: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  latency_ms?: number;
  delivery_text?: string;
  score?: number;
}

export interface EventLogEntry {
  timestamp: string;
  event: string;
  actor: string;
  target?: string;
  order_id?: string;
  negotiation_id?: string;
  details?: string;
}

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function getStats(): Promise<DashboardStats> {
  try {
    return await fetchApi<DashboardStats>("/api/stats");
  } catch {
    return {
      total_jobs: 0, completed_jobs: 0, active_jobs: 0, failed_jobs: 0,
      total_sub_orders: 0, total_cap_transactions: 0, average_trust_score: 0,
      unique_counterparties: 0, unique_buyer_wallets: 0,
    };
  }
}

export async function getJobs(): Promise<DashboardJob[]> {
  try {
    return await fetchApi<DashboardJob[]>("/api/jobs");
  } catch {
    return [];
  }
}

export async function getJob(id: string): Promise<TrustJob | null> {
  try {
    return await fetchApi<TrustJob>(`/api/jobs/${id}`);
  } catch {
    return null;
  }
}

export async function getJobEvents(id: string): Promise<EventLogEntry[]> {
  try {
    return await fetchApi<EventLogEntry[]>(`/api/jobs/${id}/events`);
  } catch {
    return [];
  }
}

export async function triggerJob(intent: string, buyerWallet?: string) {
  const res = await fetch(`${API_URL}/api/jobs/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ intent, buyer_wallet: buyerWallet }),
  });
  if (!res.ok) throw new Error(`Trigger failed: ${res.status}`);
  return res.json();
}
