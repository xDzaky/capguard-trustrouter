import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
  TrustJob,
  TrustReport,
  SubOrder,
  EventLogEntry,
  DashboardJob,
  DashboardStats,
} from "@capguard/shared";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DATABASE_URL?.replace("file:", "") ||
  path.join(__dirname, "../../data/trustrouter.db");

// Ensure data directory exists
import fs from "node:fs";
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma("journal_mode = WAL");

// ─── Initialize Schema ──────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    buyer_wallet TEXT NOT NULL DEFAULT 'unknown',
    buyer_intent TEXT NOT NULL,
    order_id TEXT,
    negotiation_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    trust_report_json TEXT
  );

  CREATE TABLE IF NOT EXISTS sub_orders (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL,
    service_id TEXT NOT NULL,
    agent_name TEXT NOT NULL DEFAULT 'unknown',
    order_id TEXT,
    negotiation_id TEXT,
    status TEXT NOT NULL DEFAULT 'negotiating',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    latency_ms INTEGER,
    delivery_text TEXT,
    score INTEGER,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE TABLE IF NOT EXISTS event_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    event TEXT NOT NULL,
    actor TEXT NOT NULL,
    target TEXT,
    order_id TEXT,
    negotiation_id TEXT,
    details TEXT,
    FOREIGN KEY (job_id) REFERENCES jobs(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sub_orders_job_id ON sub_orders(job_id);
  CREATE INDEX IF NOT EXISTS idx_event_logs_job_id ON event_logs(job_id);
  CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
`);

// ─── Prepared Statements ────────────────────────────────────────────────────

const insertJob = db.prepare(`
  INSERT INTO jobs (id, buyer_wallet, buyer_intent, order_id, negotiation_id, status, created_at, updated_at)
  VALUES (@id, @buyer_wallet, @buyer_intent, @order_id, @negotiation_id, @status, @created_at, @updated_at)
`);

const updateJobStatus = db.prepare(`
  UPDATE jobs SET status = @status, updated_at = @updated_at WHERE id = @id
`);

const updateJobCompleted = db.prepare(`
  UPDATE jobs SET status = 'completed', completed_at = @completed_at, updated_at = @updated_at, trust_report_json = @trust_report_json
  WHERE id = @id
`);

const updateJobOrderId = db.prepare(`
  UPDATE jobs SET order_id = @order_id, updated_at = @updated_at WHERE id = @id
`);

const getJobById = db.prepare(`SELECT * FROM jobs WHERE id = ?`);
const getJobByOrderId = db.prepare(`SELECT * FROM jobs WHERE order_id = ?`);
const getJobByNegotiationId = db.prepare(`SELECT * FROM jobs WHERE negotiation_id = ?`);
const getAllJobs = db.prepare(`SELECT * FROM jobs ORDER BY created_at DESC`);
const getJobsByStatus = db.prepare(`SELECT * FROM jobs WHERE status = ? ORDER BY created_at DESC`);

const insertSubOrder = db.prepare(`
  INSERT INTO sub_orders (id, job_id, service_id, agent_name, order_id, negotiation_id, status, created_at, updated_at)
  VALUES (@id, @job_id, @service_id, @agent_name, @order_id, @negotiation_id, @status, @created_at, @updated_at)
`);

const updateSubOrderStatus = db.prepare(`
  UPDATE sub_orders SET status = @status, updated_at = @updated_at WHERE id = @id
`);

const updateSubOrderCompleted = db.prepare(`
  UPDATE sub_orders SET status = 'completed', completed_at = @completed_at, updated_at = @updated_at,
  latency_ms = @latency_ms, delivery_text = @delivery_text, score = @score
  WHERE id = @id
`);

const updateSubOrderByNegId = db.prepare(`
  UPDATE sub_orders SET order_id = @order_id, status = @status, updated_at = @updated_at
  WHERE negotiation_id = @negotiation_id
`);

const getSubOrdersByJobId = db.prepare(`SELECT * FROM sub_orders WHERE job_id = ? ORDER BY created_at`);
const getSubOrderByNegId = db.prepare(`SELECT * FROM sub_orders WHERE negotiation_id = ?`);
const getSubOrderByOrderId = db.prepare(`SELECT * FROM sub_orders WHERE order_id = ?`);

const insertEventLog = db.prepare(`
  INSERT INTO event_logs (job_id, timestamp, event, actor, target, order_id, negotiation_id, details)
  VALUES (@job_id, @timestamp, @event, @actor, @target, @order_id, @negotiation_id, @details)
`);

const getEventLogsByJobId = db.prepare(`SELECT * FROM event_logs WHERE job_id = ? ORDER BY timestamp`);

// ─── Database Operations ────────────────────────────────────────────────────

export const database = {
  // Jobs
  createJob(job: {
    id: string;
    buyer_wallet: string;
    buyer_intent: string;
    order_id?: string;
    negotiation_id?: string;
  }) {
    const now = new Date().toISOString();
    insertJob.run({
      ...job,
      order_id: job.order_id || null,
      negotiation_id: job.negotiation_id || null,
      status: "pending",
      created_at: now,
      updated_at: now,
    });
  },

  updateJobStatus(id: string, status: string) {
    updateJobStatus.run({ id, status, updated_at: new Date().toISOString() });
  },

  setJobOrderId(id: string, orderId: string) {
    updateJobOrderId.run({ id, order_id: orderId, updated_at: new Date().toISOString() });
  },

  completeJob(id: string, report: TrustReport) {
    const now = new Date().toISOString();
    updateJobCompleted.run({
      id,
      completed_at: now,
      updated_at: now,
      trust_report_json: JSON.stringify(report),
    });
  },

  getJob(id: string): TrustJob | null {
    const row = getJobById.get(id) as any;
    return row ? enrichJob(row) : null;
  },

  getJobByOrderId(orderId: string): TrustJob | null {
    const row = getJobByOrderId.get(orderId) as any;
    return row ? enrichJob(row) : null;
  },

  getJobByNegotiationId(negId: string): TrustJob | null {
    const row = getJobByNegotiationId.get(negId) as any;
    return row ? enrichJob(row) : null;
  },

  getAllJobs(): TrustJob[] {
    const rows = getAllJobs.all() as any[];
    return rows.map(enrichJob);
  },

  getJobsByStatus(status: string): TrustJob[] {
    const rows = getJobsByStatus.all(status) as any[];
    return rows.map(enrichJob);
  },

  getJobByReportHash(reportHash: string): TrustJob | null {
    // Search in trust_report_json for a matching report_hash
    const stmt = db.prepare(`
      SELECT * FROM jobs
      WHERE json_extract(trust_report_json, '$.report_hash') = ?
      LIMIT 1
    `);
    const row = stmt.get(reportHash) as any;
    return row ? enrichJob(row) : null;
  },

  // Sub Orders
  createSubOrder(sub: {
    id: string;
    job_id: string;
    service_id: string;
    agent_name: string;
    negotiation_id?: string;
  }) {
    const now = new Date().toISOString();
    insertSubOrder.run({
      ...sub,
      order_id: null,
      negotiation_id: sub.negotiation_id || null,
      status: "negotiating",
      created_at: now,
      updated_at: now,
    });
  },

  updateSubOrderStatus(id: string, status: string) {
    updateSubOrderStatus.run({ id, status, updated_at: new Date().toISOString() });
  },

  completeSubOrder(id: string, data: {
    latency_ms: number;
    delivery_text: string;
    score: number;
  }) {
    const now = new Date().toISOString();
    updateSubOrderCompleted.run({
      id,
      completed_at: now,
      updated_at: now,
      ...data,
    });
  },

  updateSubOrderByNegotiationId(negId: string, orderId: string, status: string) {
    updateSubOrderByNegId.run({
      negotiation_id: negId,
      order_id: orderId,
      status,
      updated_at: new Date().toISOString(),
    });
  },

  getSubOrdersByJobId(jobId: string): SubOrder[] {
    return getSubOrdersByJobId.all(jobId) as SubOrder[];
  },

  getSubOrderByNegotiationId(negId: string): SubOrder | null {
    return (getSubOrderByNegId.get(negId) as SubOrder) || null;
  },

  getSubOrderByOrderId(orderId: string): SubOrder | null {
    return (getSubOrderByOrderId.get(orderId) as SubOrder) || null;
  },

  // Event Logs
  addEventLog(jobId: string, entry: Omit<EventLogEntry, "timestamp">) {
    insertEventLog.run({
      job_id: jobId,
      timestamp: new Date().toISOString(),
      ...entry,
      target: entry.target || null,
      order_id: entry.order_id || null,
      negotiation_id: entry.negotiation_id || null,
      details: entry.details || null,
    });
  },

  getEventLogs(jobId: string): EventLogEntry[] {
    return getEventLogsByJobId.all(jobId) as EventLogEntry[];
  },

  // Dashboard Stats
  getStats(): DashboardStats {
    const jobs = getAllJobs.all() as any[];
    const subOrders = db.prepare("SELECT * FROM sub_orders").all() as any[];

    const completedJobs = jobs.filter((j: any) => j.status === "completed");
    const activeJobs = jobs.filter((j: any) => j.status === "in_progress" || j.status === "pending");
    const failedJobs = jobs.filter((j: any) => j.status === "failed");

    const scores = subOrders
      .filter((s: any) => s.score != null)
      .map((s: any) => s.score as number);
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length)
        : 0;

    const uniqueCounterparties = new Set(subOrders.map((s: any) => s.service_id)).size;
    const uniqueBuyers = new Set(jobs.map((j: any) => j.buyer_wallet)).size;

    return {
      total_jobs: jobs.length,
      completed_jobs: completedJobs.length,
      active_jobs: activeJobs.length,
      failed_jobs: failedJobs.length,
      total_sub_orders: subOrders.length,
      total_cap_transactions: jobs.length + subOrders.length,
      average_trust_score: avgScore,
      unique_counterparties: uniqueCounterparties,
      unique_buyer_wallets: uniqueBuyers,
    };
  },

  // Dashboard Jobs
  getDashboardJobs(): DashboardJob[] {
    const jobs = getAllJobs.all() as any[];
    return jobs.map((j: any) => {
      const subs = getSubOrdersByJobId.all(j.id) as any[];
      const completed = subs.filter((s: any) => s.status === "completed");
      const report = j.trust_report_json ? JSON.parse(j.trust_report_json) : null;

      return {
        id: j.id,
        buyer_intent: j.buyer_intent,
        status: j.status,
        created_at: j.created_at,
        completed_at: j.completed_at,
        total_candidates: subs.length,
        completed_candidates: completed.length,
        recommended_agent: report?.recommended_service_id,
        top_score: report?.candidate_agents?.[0]?.score,
      };
    });
  },

  // Agent Reputation — historical performance per service_id
  getAgentReputation(serviceId: string): import("@capguard/shared").AgentReputation | null {
    const subs = db.prepare(`
      SELECT * FROM sub_orders WHERE service_id = ? AND status = 'completed' ORDER BY created_at ASC
    `).all(serviceId) as any[];

    if (subs.length === 0) return null;

    const totalSubs = db.prepare(`SELECT COUNT(*) as cnt FROM sub_orders WHERE service_id = ?`).get(serviceId) as any;
    const totalEval = totalSubs?.cnt || subs.length;

    const scores = subs.filter((s) => s.score != null).map((s) => s.score as number);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const latencies = subs.filter((s) => s.latency_ms != null).map((s) => s.latency_ms as number);
    const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

    // Compute score history by day
    const byDay: Record<string, number[]> = {};
    for (const s of subs) {
      const day = (s.created_at as string).slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      if (s.score != null) byDay[day].push(s.score);
    }
    const scoreHistory = Object.entries(byDay).map(([date, dayScores]) => ({
      date,
      score: Math.round(dayScores.reduce((a, b) => a + b, 0) / dayScores.length),
    }));

    // Compute grade from average score
    const grade = avgScore >= 90 ? "A+" : avgScore >= 80 ? "A" : avgScore >= 70 ? "B+" :
      avgScore >= 60 ? "B" : avgScore >= 50 ? "C" : avgScore >= 40 ? "D" : "F";

    // SLA and sources from delivery_text
    let slaCount = 0, srcCount = 0;
    for (const s of subs) {
      try {
        const parsed = s.delivery_text ? JSON.parse(s.delivery_text) : {};
        if (parsed.sources && parsed.sources.length > 0) srcCount++;
      } catch { /* ignore */ }
      // Approximate SLA check from latency (60s threshold)
      if (s.latency_ms != null && s.latency_ms < 60_000) slaCount++;
    }

    return {
      service_id: serviceId,
      agent_name: subs[0]?.agent_name || serviceId,
      total_evaluations: totalEval,
      average_score: avgScore,
      completion_rate: totalEval > 0 ? Math.round((subs.length / totalEval) * 100) : 0,
      avg_latency_ms: avgLatency,
      sla_compliance_rate: subs.length > 0 ? Math.round((slaCount / subs.length) * 100) : 0,
      source_inclusion_rate: subs.length > 0 ? Math.round((srcCount / subs.length) * 100) : 0,
      first_seen: subs[0]?.created_at || "",
      last_seen: subs[subs.length - 1]?.created_at || "",
      score_history: scoreHistory,
      grade: grade as any,
    };
  },

  getAllAgentReputations(): import("@capguard/shared").AgentReputation[] {
    const serviceIds = db.prepare(
      `SELECT DISTINCT service_id FROM sub_orders WHERE status = 'completed'`
    ).all() as any[];

    return serviceIds
      .map((row) => this.getAgentReputation(row.service_id))
      .filter(Boolean) as import("@capguard/shared").AgentReputation[];
  },

  close() {
    db.close();
  },
};

// Helper to enrich a job row with sub-orders and event logs
function enrichJob(row: any): TrustJob {
  const subOrders = getSubOrdersByJobId.all(row.id) as SubOrder[];
  const eventLog = getEventLogsByJobId.all(row.id) as EventLogEntry[];
  const report = row.trust_report_json ? JSON.parse(row.trust_report_json) : undefined;

  return {
    id: row.id,
    buyer_wallet: row.buyer_wallet,
    buyer_intent: row.buyer_intent,
    order_id: row.order_id,
    negotiation_id: row.negotiation_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    trust_report: report,
    sub_orders: subOrders,
    event_log: eventLog,
  };
}

export default database;
