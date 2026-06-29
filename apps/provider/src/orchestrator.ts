// ─── CAPGuard TrustRouter Orchestrator ──────────────────────────────────────
// Core engine: receives buyer intent, fans out sub-orders to candidates,
// verifies deliveries, computes trust scores, returns trust report.

import {
  type CandidateResult,
  type TrustReport,
  type CandidateAgentConfig,
  type EventLogEntry,
  BuyerRequestSchema,
  CandidateDeliverySchema,
  calculateTrustScore,
  selectBestCandidate,
  calculateStats,
  generateId,
  hashReport,
  hashExecutionLog,
} from "@capguard/shared";
import { database } from "./database.js";
import logger from "./logger.js";

// ─── Candidate Agent Registry ───────────────────────────────────────────────

const CANDIDATE_AGENTS: CandidateAgentConfig[] = [
  {
    service_id: "svc_research_alpha",
    agent_name: "ResearchAlpha",
    description: "Deep research agent for comprehensive analysis",
    sla_timeout_ms: 60_000,
    price_usdc: "0.01",
  },
  {
    service_id: "svc_verify_beta",
    agent_name: "VerifyBeta",
    description: "Verification agent for fact-checking and source validation",
    sla_timeout_ms: 45_000,
    price_usdc: "0.01",
  },
  {
    service_id: "svc_format_gamma",
    agent_name: "FormatGamma",
    description: "Content formatting and structuring agent",
    sla_timeout_ms: 30_000,
    price_usdc: "0.01",
  },
];

export function getCandidateAgents(): CandidateAgentConfig[] {
  // Override with env if available
  const envIds = process.env.CROO_TARGET_SERVICE_IDS;
  if (envIds) {
    const ids = envIds.split(",").map((s) => s.trim()).filter(Boolean);
    return ids.map((id, i) => {
      const existing = CANDIDATE_AGENTS.find((a) => a.service_id === id);
      if (existing) return existing;
      return {
        service_id: id,
        agent_name: `Agent_${i + 1}`,
        description: `Candidate agent ${id}`,
        sla_timeout_ms: 60_000,
        price_usdc: "0.01",
      };
    });
  }
  return CANDIDATE_AGENTS;
}

// ─── Orchestration Types ────────────────────────────────────────────────────

interface OrchestrationContext {
  jobId: string;
  buyerIntent: string;
  orderId: string;
  candidates: CandidateAgentConfig[];
  startedAt: number;
}

// ─── The Orchestrator Class ─────────────────────────────────────────────────

export class TrustRouterOrchestrator {
  private capClient: any; // CROO SDK AgentClient (typed as any for SDK flexibility)
  private executorClient: any;

  constructor(providerClient: any, executorClient: any) {
    this.capClient = providerClient;
    this.executorClient = executorClient;
  }

  /**
   * Start a trust evaluation job.
   * Called when a buyer order is paid.
   */
  async startTrustJob(
    orderId: string,
    buyerIntent: string,
    buyerWallet: string = "unknown"
  ): Promise<TrustReport> {
    const jobId = generateId("job");
    const candidates = getCandidateAgents();

    logger.info({ jobId, orderId, buyerIntent, candidateCount: candidates.length },
      "🚀 Starting trust evaluation job");

    // Create job in database
    database.createJob({
      id: jobId,
      buyer_wallet: buyerWallet,
      buyer_intent: buyerIntent,
      order_id: orderId,
    });

    database.updateJobStatus(jobId, "in_progress");

    database.addEventLog(jobId, {
      event: "JobStarted",
      actor: "trustrouter",
      order_id: orderId,
      details: `Trust evaluation started with ${candidates.length} candidates`,
    });

    const ctx: OrchestrationContext = {
      jobId,
      buyerIntent,
      orderId,
      candidates,
      startedAt: Date.now(),
    };

    try {
      // Fan out sub-orders to all candidates
      const results = await this.fanOutSubOrders(ctx);

      // Generate trust report
      const report = this.generateTrustReport(ctx, results);

      // Save to database
      database.completeJob(jobId, report);

      database.addEventLog(jobId, {
        event: "JobCompleted",
        actor: "trustrouter",
        order_id: orderId,
        details: `Trust report generated. Recommended: ${report.recommended_service_id} (score: ${report.average_score})`,
      });

      logger.info({
        jobId,
        recommended: report.recommended_service_id,
        avgScore: report.average_score,
        reportHash: report.report_hash.slice(0, 18) + "...",
      }, "✅ Trust evaluation complete");

      return report;
    } catch (error: any) {
      database.updateJobStatus(jobId, "failed");
      database.addEventLog(jobId, {
        event: "JobFailed",
        actor: "trustrouter",
        details: error.message,
      });
      logger.error({ jobId, error: error.message }, "❌ Trust evaluation failed");
      throw error;
    }
  }

  /**
   * Fan out sub-orders to all candidate agents in parallel.
   */
  private async fanOutSubOrders(ctx: OrchestrationContext): Promise<CandidateResult[]> {
    const results: CandidateResult[] = [];

    logger.info({ jobId: ctx.jobId, count: ctx.candidates.length },
      "📤 Dispatching sub-orders to candidate agents");

    // Create all sub-orders in parallel
    const subOrderPromises = ctx.candidates.map(async (candidate) => {
      const subId = generateId("sub");
      const startTime = Date.now();

      database.createSubOrder({
        id: subId,
        job_id: ctx.jobId,
        service_id: candidate.service_id,
        agent_name: candidate.agent_name,
      });

      database.addEventLog(ctx.jobId, {
        event: "SubOrderCreated",
        actor: "trustrouter_executor",
        target: candidate.service_id,
        details: `Dispatching sub-order to ${candidate.agent_name}`,
      });

      try {
        // Try to create CAP negotiation via SDK
        const result = await this.executeSubOrder(
          ctx, candidate, subId, startTime
        );
        return result;
      } catch (error: any) {
        logger.warn({
          subId,
          candidate: candidate.agent_name,
          error: error.message,
        }, "⚠️ Sub-order failed, using simulated response");

        // Fallback to simulated response for demo
        return this.simulateSubOrder(ctx, candidate, subId, startTime);
      }
    });

    const settled = await Promise.allSettled(subOrderPromises);

    for (const result of settled) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      }
    }

    return results;
  }

  /**
   * Execute a sub-order via CROO CAP SDK.
   */
  private async executeSubOrder(
    ctx: OrchestrationContext,
    candidate: CandidateAgentConfig,
    subId: string,
    startTime: number
  ): Promise<CandidateResult> {
    // Attempt real CAP negotiation
    const neg = await this.executorClient.negotiateOrder({
      serviceId: candidate.service_id,
      requirements: JSON.stringify({
        task: ctx.buyerIntent,
        job_id: ctx.jobId,
        type: "trust_evaluation",
      }),
    });

    const negId = neg.negotiationId || neg.negotiation_id || neg.id;

    database.updateSubOrderStatus(subId, "pending_payment");
    database.addEventLog(ctx.jobId, {
      event: "NegotiationCreated",
      actor: "trustrouter_executor",
      target: candidate.service_id,
      negotiation_id: negId,
    });

    // Wait for order to be created and pay
    // In production, this would be event-driven via WebSocket
    await this.waitAndPay(negId, candidate.sla_timeout_ms);

    database.updateSubOrderStatus(subId, "paid");
    database.addEventLog(ctx.jobId, {
      event: "SubOrderPaid",
      actor: "trustrouter_executor",
      target: candidate.service_id,
    });

    // Wait for delivery
    const delivery = await this.waitForDelivery(negId, candidate.sla_timeout_ms);
    const latencyMs = Date.now() - startTime;

    // Validate delivery
    return this.evaluateDelivery(ctx, candidate, subId, delivery, latencyMs, negId);
  }

  /**
   * Simulate a sub-order for demo/testing when real CAP isn't available.
   */
  private async simulateSubOrder(
    ctx: OrchestrationContext,
    candidate: CandidateAgentConfig,
    subId: string,
    startTime: number
  ): Promise<CandidateResult> {
    // Simulate processing time (2-15 seconds)
    const delay = 2000 + Math.random() * 13000;
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 5000)));

    const latencyMs = Date.now() - startTime;
    const negId = generateId("neg_sim");

    // Simulate varied quality of responses
    const quality = Math.random();
    const schemaValid = quality > 0.2;
    const sourcesPresent = quality > 0.4;
    const proofPresent = quality > 0.3;
    const sla = latencyMs < candidate.sla_timeout_ms;
    const consistent = quality > 0.25;

    const score = calculateTrustScore({
      schema_valid: schemaValid,
      proof_present: proofPresent,
      sources_present: sourcesPresent,
      sla_passed: sla,
      latency_ms: latencyMs,
      delivery_consistency: consistent,
    });

    const result: CandidateResult = {
      service_id: candidate.service_id,
      agent_name: candidate.agent_name,
      order_id: generateId("ord_sim"),
      negotiation_id: negId,
      status: schemaValid ? "completed" : "failed",
      schema_valid: schemaValid,
      sources_present: sourcesPresent,
      sla_passed: sla,
      proof_present: proofPresent,
      latency_ms: latencyMs,
      delivery_consistency: consistent,
      score,
      raw_delivery: JSON.stringify({
        content: `Simulated response from ${candidate.agent_name} for: ${ctx.buyerIntent}`,
        sources: sourcesPresent ? ["https://example.com/source1", "https://example.com/source2"] : [],
        confidence: quality,
      }),
    };

    // Update database
    database.completeSubOrder(subId, {
      latency_ms: latencyMs,
      delivery_text: result.raw_delivery || "",
      score,
    });

    database.addEventLog(ctx.jobId, {
      event: "SubOrderCompleted_Simulated",
      actor: candidate.service_id,
      target: "trustrouter",
      details: `Score: ${score}/100, Schema: ${schemaValid}, Sources: ${sourcesPresent}`,
    });

    logger.info({
      candidate: candidate.agent_name,
      score,
      latencyMs,
      schemaValid,
    }, `📦 Sub-order result (simulated)`);

    return result;
  }

  /**
   * Evaluate a delivery from a candidate agent.
   */
  private evaluateDelivery(
    ctx: OrchestrationContext,
    candidate: CandidateAgentConfig,
    subId: string,
    delivery: any,
    latencyMs: number,
    negId: string
  ): CandidateResult {
    // Try to parse as structured delivery
    let schemaValid = false;
    let sourcesPresent = false;
    let proofPresent = false;
    let consistent = false;
    const sla = latencyMs < candidate.sla_timeout_ms;

    try {
      const parsed = typeof delivery === "string" ? JSON.parse(delivery) : delivery;
      const validated = CandidateDeliverySchema.safeParse(parsed);
      schemaValid = validated.success;
      sourcesPresent = validated.success && (validated.data.sources?.length ?? 0) > 0;
      proofPresent = delivery != null && delivery !== "";
      consistent = schemaValid;
    } catch {
      schemaValid = false;
      proofPresent = delivery != null && delivery !== "";
    }

    const score = calculateTrustScore({
      schema_valid: schemaValid,
      proof_present: proofPresent,
      sources_present: sourcesPresent,
      sla_passed: sla,
      latency_ms: latencyMs,
      delivery_consistency: consistent,
    });

    database.completeSubOrder(subId, {
      latency_ms: latencyMs,
      delivery_text: typeof delivery === "string" ? delivery : JSON.stringify(delivery),
      score,
    });

    database.addEventLog(ctx.jobId, {
      event: "SubOrderEvaluated",
      actor: "trustrouter",
      target: candidate.service_id,
      details: `Score: ${score}/100`,
    });

    return {
      service_id: candidate.service_id,
      agent_name: candidate.agent_name,
      order_id: generateId("ord"),
      negotiation_id: negId,
      status: schemaValid ? "completed" : "delivered",
      schema_valid: schemaValid,
      sources_present: sourcesPresent,
      sla_passed: sla,
      proof_present: proofPresent,
      latency_ms: latencyMs,
      delivery_consistency: consistent,
      score,
      raw_delivery: typeof delivery === "string" ? delivery : JSON.stringify(delivery),
    };
  }

  /**
   * Generate the final trust report from all candidate results.
   */
  private generateTrustReport(
    ctx: OrchestrationContext,
    results: CandidateResult[]
  ): TrustReport {
    const { recommended_service_id, recommended_reason } = selectBestCandidate(results);
    const stats = calculateStats(results);
    const eventLogs = database.getEventLogs(ctx.jobId);
    const executionLogHash = hashExecutionLog(eventLogs);

    const baseReport: Omit<TrustReport, "report_hash"> = {
      report_id: generateId("tr"),
      job_id: ctx.jobId,
      buyer_intent: ctx.buyerIntent,
      candidate_agents: results,
      recommended_service_id,
      recommended_reason,
      execution_log_hash: executionLogHash,
      generated_at: new Date().toISOString(),
      ...stats,
    };

    const reportHash = hashReport(baseReport as any);

    return {
      ...baseReport,
      report_hash: reportHash,
    };
  }

  // ─── Helpers (stubbed for now, real implementation needs WebSocket) ────────

  private async waitAndPay(negId: string, timeout: number): Promise<void> {
    // In production, listen to WebSocket for OrderCreated event, then call payOrder
    // For now, this is a no-op as we handle it in the main event loop
  }

  private async waitForDelivery(negId: string, timeout: number): Promise<any> {
    // In production, listen to WebSocket for OrderCompleted event
    // For now, return null to trigger simulated flow
    return null;
  }
}

export default TrustRouterOrchestrator;
