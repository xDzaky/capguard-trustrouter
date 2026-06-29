// ─── Dashboard REST API (v2) ────────────────────────────────────────────────
// Express API server with verify endpoint, report lookup, and mode status.

import express from "express";
import cors from "cors";
import { database } from "./database.js";
import logger from "./logger.js";
import { hashReport, hashExecutionLog } from "@capguard/shared";
import { getOperatingMode } from "./orchestrator.js";

const app = express();
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  const mode = getOperatingMode();
  res.json({
    status: "ok",
    service: "capguard-trustrouter",
    timestamp: new Date().toISOString(),
    mode: {
      demo: mode.demoMode,
      strict: mode.strictCapMode,
    },
  });
});

// ─── Mode Status ────────────────────────────────────────────────────────────

app.get("/api/mode", (_req, res) => {
  const mode = getOperatingMode();
  res.json({
    demo_mode: mode.demoMode,
    strict_cap_mode: mode.strictCapMode,
    label: mode.strictCapMode ? "STRICT" : mode.demoMode ? "DEMO" : "DEFAULT",
  });
});

// ─── Dashboard Stats ────────────────────────────────────────────────────────

app.get("/api/stats", (_req, res) => {
  try {
    const stats = database.getStats();
    res.json(stats);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get stats");
    res.status(500).json({ error: "Failed to get stats" });
  }
});

// ─── Jobs List ──────────────────────────────────────────────────────────────

app.get("/api/jobs", (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const jobs = status ? database.getJobsByStatus(status) : database.getDashboardJobs();
    res.json(jobs);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get jobs");
    res.status(500).json({ error: "Failed to get jobs" });
  }
});

// ─── Job Detail ─────────────────────────────────────────────────────────────

app.get("/api/jobs/:id", (req, res) => {
  try {
    const job = database.getJob(req.params.id);
    if (!job) { res.status(404).json({ error: "Job not found" }); return; }
    res.json(job);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get job");
    res.status(500).json({ error: "Failed to get job" });
  }
});

// ─── Job Sub-Orders ─────────────────────────────────────────────────────────

app.get("/api/jobs/:id/sub-orders", (req, res) => {
  try {
    const subOrders = database.getSubOrdersByJobId(req.params.id);
    res.json(subOrders);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to get sub-orders" });
  }
});

// ─── Job Event Log ──────────────────────────────────────────────────────────

app.get("/api/jobs/:id/events", (req, res) => {
  try {
    const events = database.getEventLogs(req.params.id);
    res.json(events);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to get events" });
  }
});

// ─── Job Trust Report ───────────────────────────────────────────────────────

app.get("/api/jobs/:id/report", (req, res) => {
  try {
    const job = database.getJob(req.params.id);
    if (!job?.trust_report) { res.status(404).json({ error: "Report not found" }); return; }
    res.json(job.trust_report);
  } catch (error: any) {
    res.status(500).json({ error: "Failed to get report" });
  }
});

// ─── Proof Verification Endpoint ─────────────────────────────────────────────
// GET /api/verify/:report_hash — recompute and validate proof hashes

app.get("/api/verify/:report_hash", (req, res) => {
  try {
    const { report_hash } = req.params;
    const job = database.getJobByReportHash(report_hash);

    if (!job || !job.trust_report) {
      res.status(404).json({
        valid: false,
        error: "Report not found",
        report_hash,
      });
      return;
    }

    const report = job.trust_report;
    const eventLogs = database.getEventLogs(job.id);
    const subOrders = database.getSubOrdersByJobId(job.id);

    // Recompute hashes
    const { report_hash: storedHash, ...reportWithoutHash } = report;
    const recomputedReportHash = hashReport(reportWithoutHash as any);
    const recomputedExecLogHash = hashExecutionLog(eventLogs);

    const reportHashValid = recomputedReportHash === storedHash;
    const execLogHashValid = recomputedExecLogHash === report.execution_log_hash;
    const valid = reportHashValid && execLogHashValid;

    const notes: string[] = [];
    if (!reportHashValid) notes.push("Report hash mismatch — report may have been modified");
    if (!execLogHashValid) notes.push("Execution log hash mismatch — event log may have been modified");
    if (valid) notes.push("All proofs verified successfully");

    res.json({
      valid,
      report_hash: storedHash,
      recomputed_report_hash: recomputedReportHash,
      execution_log_hash: report.execution_log_hash,
      recomputed_execution_log_hash: recomputedExecLogHash,
      job_id: job.id,
      buyer_order_id: job.order_id,
      sub_order_ids: subOrders.map((s: any) => s.id),
      routed_execution_order_id: report.routed_execution?.winner_order_id || null,
      generated_at: report.generated_at,
      verification_notes: notes,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to verify report");
    res.status(500).json({ error: error.message });
  }
});

// ─── Report by Hash ──────────────────────────────────────────────────────────

app.get("/api/reports/:hash", (req, res) => {
  try {
    const job = database.getJobByReportHash(req.params.hash);
    if (!job?.trust_report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(job.trust_report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Trigger Manual Job (DEV/DEMO ONLY) ─────────────────────────────────────

app.post("/api/jobs/trigger", async (req, res) => {
  try {
    const { intent, buyer_wallet, auto_route } = req.body;
    if (!intent) {
      res.status(400).json({ error: "Intent is required" });
      return;
    }

    const { getOrchestrator } = await import("./index.js");
    const orchestrator = getOrchestrator();

    if (!orchestrator) {
      res.status(503).json({ error: "Orchestrator not ready" });
      return;
    }

    const report = await orchestrator.startTrustJob(
      `manual_${Date.now()}`,
      intent,
      buyer_wallet || "manual_test_wallet",
      !!auto_route
    );
    res.json(report);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to trigger job");
    res.status(500).json({ error: error.message });
  }
});

// ─── Start API Server ────────────────────────────────────────────────────────

// ─── Agent Reputation Endpoint ──────────────────────────────────────────────
// Historical performance tracking per candidate agent — used by dashboard

app.get("/api/reputation/:service_id", (req, res) => {
  try {
    const { service_id } = req.params;
    const reputation = database.getAgentReputation(service_id);
    if (!reputation) {
      res.status(404).json({ error: "No evaluation data found for this agent" });
      return;
    }
    res.json(reputation);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get reputation");
    res.status(500).json({ error: error.message });
  }
});

// ─── All Agent Reputations ──────────────────────────────────────────────────

app.get("/api/reputation", (_req, res) => {
  try {
    const reputations = database.getAllAgentReputations();
    res.json(reputations);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get reputations");
    res.status(500).json({ error: error.message });
  }
});

// ─── A2A Depth Info ──────────────────────────────────────────────────────────

app.get("/api/a2a-depth", (_req, res) => {
  res.json({
    max_depth: 4,
    levels: [
      { level: 1, description: "Buyer → CAPGuard TrustRouter", type: "trust_evaluation_order" },
      { level: 2, description: "CAPGuard → Candidate Agents (fan-out)", type: "sub_order_evaluation" },
      { level: 3, description: "CAPGuard → Winner Agent (route-and-execute)", type: "routed_execution" },
      { level: 4, description: "CAPGuard → Runner-up (cross-validation)", type: "cross_validation" },
    ],
    proof: {
      sha256_report_hash: true,
      sha256_execution_log_hash: true,
      on_chain_anchor: "Base (when configured)",
    },
    cap_methods_used: [
      "connectWebSocket",
      "negotiateOrder",
      "acceptNegotiation",
      "payOrder",
      "deliverOrder",
      "getDelivery",
      "getOrder",
    ],
  });
});

// ─── Evidence Endpoint ───────────────────────────────────────────────────────
// Public endpoint for judges to verify CAPGuard's real activity.
// Returns agent store listings, order counts, report hashes, verify URLs,
// SLA gate examples, consensus examples, and cross-validation evidence.

app.get("/api/evidence", (_req, res) => {
  try {
    const stats = database.getStats();
    const dashboardJobs = database.getDashboardJobs();

    // Collect all completed jobs with full reports via getJob
    const completedJobs = dashboardJobs
      .filter((j) => j.status === "completed")
      .slice(0, 15)
      .map((j) => database.getJob(j.id))
      .filter((j): j is NonNullable<typeof j> => j != null && j.trust_report != null);

    // Extract report hashes, verify URLs, and SLA guard examples
    const reportHashes: string[] = [];
    const verifyUrls: string[] = [];
    const slaGuardExamples: object[] = [];
    const crossValidationExamples: object[] = [];
    const consensusExamples: object[] = [];
    const onChainExamples: object[] = [];

    for (const job of completedJobs.slice(0, 10)) {
      const report = job.trust_report;
      if (!report) continue;

      if (report.report_hash) {
        reportHashes.push(report.report_hash);
        verifyUrls.push(`/api/verify/${report.report_hash}`);
      }

      if (report.sla_guard?.blocked_agents?.length > 0) {
        slaGuardExamples.push({
          job_id: job.id,
          route_allowed: report.sla_guard.route_allowed,
          winner_passed_gate: report.sla_guard.winner_passed_gate,
          blocked_count: report.sla_guard.blocked_agents.length,
          blocked_agents: report.sla_guard.blocked_agents,
        });
      }

      if (report.cross_validation?.status === "completed") {
        crossValidationExamples.push({
          job_id: job.id,
          validator: report.cross_validation.validator_agent_name,
          validation_score: report.cross_validation.validation_score,
          summary: report.cross_validation.validation_summary?.slice(0, 100),
        });
      }

      if (report.consensus?.enabled) {
        consensusExamples.push({
          job_id: job.id,
          agreement_score: report.consensus.agreement_score,
          outlier_count: report.consensus.outlier_agents.length,
          summary: report.consensus.majority_summary?.slice(0, 100),
        });
      }

      if (report.on_chain_proof?.anchored) {
        onChainExamples.push({
          job_id: job.id,
          tx_hash: report.on_chain_proof.tx_hash,
          block_number: report.on_chain_proof.block_number,
          chain: report.on_chain_proof.chain,
        });
      }
    }

    // Agent Store listings from env config
    const agentStoreListings: Record<string, string> = {};
    const capguardId = process.env.CROO_SERVICE_ID_CAPGUARD;
    if (capguardId) {
      agentStoreListings["capguard"] = `https://agent.croo.network/agents/${capguardId}`;
    }
    const targetIds = (process.env.CROO_TARGET_SERVICE_IDS || "").split(",").filter(Boolean);
    const agentNames = ["research_alpha", "verify_beta", "format_gamma"];
    targetIds.forEach((id, i) => {
      const name = agentNames[i] ?? `agent_${i + 1}`;
      agentStoreListings[name] = `https://agent.croo.network/agents/${id.trim()}`;
    });

    res.json({
      generated_at: new Date().toISOString(),
      mode: process.env.STRICT_CAP_MODE === "true" ? "STRICT_CAP" : process.env.DEMO_MODE === "true" ? "DEMO" : "DEFAULT",
      agent_store_listings: agentStoreListings,
      architecture: {
        a2a_depth: 4,
        sla_gated_routing: true,
        consensus_scoring: true,
        cross_validation: true,
        on_chain_proof: "available when PROOF_CONTRACT_ADDRESS configured",
      },
      stats: {
        total_jobs: stats.total_jobs,
        completed_jobs: stats.completed_jobs,
        total_sub_orders: stats.total_sub_orders,
        total_cap_transactions: stats.total_cap_transactions,
        average_trust_score: stats.average_trust_score,
        unique_counterparties: stats.unique_counterparties,
        unique_buyer_wallets: stats.unique_buyer_wallets,
      },
      report_hashes: reportHashes.slice(0, 10),
      verify_urls: verifyUrls.slice(0, 10),
      sla_guard_examples: slaGuardExamples.slice(0, 5),
      cross_validation_examples: crossValidationExamples.slice(0, 5),
      consensus_examples: consensusExamples.slice(0, 5),
      on_chain_anchor_examples: onChainExamples.slice(0, 5),
      latest_jobs: completedJobs.slice(0, 5).map((j) => ({
        job_id: j.id,
        status: j.status,
        created_at: j.created_at,
        candidates_evaluated: j.trust_report?.total_candidates ?? 0,
        winner: j.trust_report?.recommended_service_id ?? "none",
        avg_score: j.trust_report?.average_score ?? 0,
        sla_gate_passed: j.trust_report?.sla_guard?.winner_passed_gate ?? false,
        consensus_score: j.trust_report?.consensus?.agreement_score ?? 0,
      })),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get evidence");
    res.status(500).json({ error: error.message });
  }
});

export function startApiServer(port: number = 3001) {
  app.listen(port, () => {
    logger.info({ port }, "📊 Dashboard API server running");
  });
  return app;
}

export default app;

