// ─── Dashboard REST API ─────────────────────────────────────────────────────
// Express API server that provides data to the Next.js dashboard frontend.

import express from "express";
import cors from "cors";
import { database } from "./database.js";
import logger from "./logger.js";

const app = express();
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "capguard-trustrouter", timestamp: new Date().toISOString() });
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
    if (status) {
      const jobs = database.getJobsByStatus(status);
      res.json(jobs);
    } else {
      const jobs = database.getDashboardJobs();
      res.json(jobs);
    }
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get jobs");
    res.status(500).json({ error: "Failed to get jobs" });
  }
});

// ─── Job Detail ─────────────────────────────────────────────────────────────

app.get("/api/jobs/:id", (req, res) => {
  try {
    const job = database.getJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }
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
    logger.error({ error: error.message }, "Failed to get sub-orders");
    res.status(500).json({ error: "Failed to get sub-orders" });
  }
});

// ─── Job Event Log ──────────────────────────────────────────────────────────

app.get("/api/jobs/:id/events", (req, res) => {
  try {
    const events = database.getEventLogs(req.params.id);
    res.json(events);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get events");
    res.status(500).json({ error: "Failed to get events" });
  }
});

// ─── Job Trust Report ───────────────────────────────────────────────────────

app.get("/api/jobs/:id/report", (req, res) => {
  try {
    const job = database.getJob(req.params.id);
    if (!job?.trust_report) {
      res.status(404).json({ error: "Report not found" });
      return;
    }
    res.json(job.trust_report);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to get report");
    res.status(500).json({ error: "Failed to get report" });
  }
});

// ─── Trigger Manual Job (for testing) ───────────────────────────────────────

app.post("/api/jobs/trigger", async (req, res) => {
  try {
    const { intent, buyer_wallet } = req.body;
    if (!intent) {
      res.status(400).json({ error: "Intent is required" });
      return;
    }

    // Import orchestrator dynamically to avoid circular deps
    const { getOrchestrator } = await import("./index.js");
    const orchestrator = getOrchestrator();

    if (!orchestrator) {
      res.status(503).json({ error: "Orchestrator not ready" });
      return;
    }

    const report = await orchestrator.startTrustJob(
      `manual_${Date.now()}`,
      intent,
      buyer_wallet || "manual_test_wallet"
    );
    res.json(report);
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to trigger job");
    res.status(500).json({ error: error.message });
  }
});

// ─── Start API Server ───────────────────────────────────────────────────────

export function startApiServer(port: number = 3001) {
  app.listen(port, () => {
    logger.info({ port }, "📊 Dashboard API server running");
  });
  return app;
}

export default app;
