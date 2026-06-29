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

export function startApiServer(port: number = 3001) {
  app.listen(port, () => {
    logger.info({ port }, "📊 Dashboard API server running");
  });
  return app;
}

export default app;
