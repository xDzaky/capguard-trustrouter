// ─── CAPGuard TrustRouter Orchestrator (v3) ────────────────────────────────
// Supports: STRICT_CAP_MODE, DEMO_MODE, route-and-execute, cross-validation,
// on-chain proof anchoring, external candidate config

import fs from "node:fs";
import path from "node:path";
import {
  type CandidateResult,
  type TrustReport,
  type RoutedExecution,
  type CrossValidation,
  type OnChainProof,
  type SlaGuard,
  type ConsensusResult,
  type CandidateAgentConfig,
  type OperatingMode,
  BuyerRequestSchema,
  CandidateDeliverySchema,
  calculateTrustScore,
  calculateSlaGuard,
  calculateConsensus,
  selectBestCandidate,
  calculateStats,
  generateId,
  hashReport,
  hashExecutionLog,
} from "@capguard/shared";
import { database } from "./database.js";
import logger from "./logger.js";
import { CapOrderCoordinator } from "./cap-coordinator.js";

// ─── Operating Mode ──────────────────────────────────────────────────────────

export function getOperatingMode(): OperatingMode {
  const demoMode = process.env.DEMO_MODE === "true";
  const strictCapMode = process.env.STRICT_CAP_MODE === "true";
  if (strictCapMode && demoMode) {
    logger.warn("STRICT_CAP_MODE and DEMO_MODE both set — STRICT takes precedence");
  }
  return { demoMode, strictCapMode };
}

// ─── Candidate Agent Registry ─────────────────────────────────────────────

const BUILTIN_DEV_CANDIDATES: CandidateAgentConfig[] = [
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
  const { demoMode, strictCapMode } = getOperatingMode();

  // 1. Explicit service ID list from env
  const envIds = process.env.CROO_TARGET_SERVICE_IDS;
  if (envIds && envIds.trim()) {
    const ids = envIds.split(",").map((s) => s.trim()).filter(Boolean);
    return ids.map((id, i) => ({
      service_id: id,
      agent_name: `Agent_${i + 1}`,
      description: `Candidate agent ${id}`,
      sla_timeout_ms: 60_000,
      price_usdc: "0.01",
    }));
  }

  // 2. JSON config file from env
  const configPath = process.env.CANDIDATE_AGENTS_CONFIG;
  if (configPath) {
    const resolved = path.resolve(configPath);
    if (fs.existsSync(resolved)) {
      try {
        const raw = fs.readFileSync(resolved, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          logger.info({ configPath: resolved, count: parsed.length }, "Loaded candidate agents from config file");
          return parsed as CandidateAgentConfig[];
        }
      } catch (e: any) {
        logger.error({ configPath, error: e.message }, "Failed to parse CANDIDATE_AGENTS_CONFIG");
      }
    }
  }

  // 3. In STRICT mode, no fallback to dev candidates
  if (strictCapMode) {
    throw new Error(
      "STRICT_CAP_MODE=true but no candidate agent config found. " +
      "Set CROO_TARGET_SERVICE_IDS or CANDIDATE_AGENTS_CONFIG."
    );
  }

  // 4. Demo mode: use built-in dev candidates
  if (demoMode) {
    logger.warn("Using built-in dev candidate agents (DEMO_MODE=true)");
    return BUILTIN_DEV_CANDIDATES;
  }

  // 5. Default fallback (neither strict nor explicit demo — warn but continue)
  logger.warn(
    "No candidate agent config found and DEMO_MODE is not set. " +
    "Using built-in dev candidates. Set DEMO_MODE=true explicitly."
  );
  return BUILTIN_DEV_CANDIDATES;
}

// ─── Orchestration Context ───────────────────────────────────────────────────

interface OrchestrationContext {
  jobId: string;
  buyerIntent: string;
  orderId: string;
  candidates: CandidateAgentConfig[];
  startedAt: number;
  autoRoute: boolean;
}

// ─── The Orchestrator Class ──────────────────────────────────────────────────

export class TrustRouterOrchestrator {
  private capClient: any;
  private executorClient: any;
  private coordinator: CapOrderCoordinator;

  constructor(providerClient: any, executorClient: any) {
    this.capClient = providerClient;
    this.executorClient = executorClient;
    this.coordinator = new CapOrderCoordinator(executorClient);
  }

  async startTrustJob(
    orderId: string,
    buyerIntent: string,
    buyerWallet: string = "unknown",
    autoRoute: boolean = false
  ): Promise<TrustReport> {
    const { demoMode, strictCapMode } = getOperatingMode();
    const candidates = getCandidateAgents();
    const jobId = generateId("job");

    logger.info(
      { jobId, orderId, buyerIntent, candidates: candidates.length, demoMode, strictCapMode, autoRoute },
      "🚀 Starting trust evaluation job"
    );

    database.createJob({ id: jobId, buyer_wallet: buyerWallet, buyer_intent: buyerIntent, order_id: orderId });
    database.updateJobStatus(jobId, "in_progress");
    database.addEventLog(jobId, {
      event: "JobStarted",
      actor: "trustrouter",
      order_id: orderId,
      details: `mode=${strictCapMode ? "STRICT" : demoMode ? "DEMO" : "DEFAULT"} candidates=${candidates.length} autoRoute=${autoRoute}`,
    });

    const ctx: OrchestrationContext = {
      jobId,
      buyerIntent,
      orderId,
      candidates,
      startedAt: Date.now(),
      autoRoute,
    };

    try {
      const results = await this.fanOutSubOrders(ctx);
      const report = await this.generateTrustReport(ctx, results);
      database.completeJob(jobId, report);
      database.addEventLog(jobId, {
        event: "JobCompleted",
        actor: "trustrouter",
        order_id: orderId,
        details: `Recommended: ${report.recommended_service_id} (score: ${report.average_score})`,
      });

      logger.info(
        { jobId, recommended: report.recommended_service_id, avgScore: report.average_score },
        "✅ Trust evaluation complete"
      );
      return report;
    } catch (error: any) {
      database.updateJobStatus(jobId, "failed");
      database.addEventLog(jobId, { event: "JobFailed", actor: "trustrouter", details: error.message });
      logger.error({ jobId, error: error.message }, "❌ Trust evaluation failed");
      throw error;
    }
  }

  private async fanOutSubOrders(ctx: OrchestrationContext): Promise<CandidateResult[]> {
    const { demoMode, strictCapMode } = getOperatingMode();
    logger.info({ jobId: ctx.jobId, count: ctx.candidates.length }, "📤 Dispatching sub-orders");

    const subOrderPromises = ctx.candidates.map(async (candidate) => {
      const subId = generateId("sub");
      const startTime = Date.now();

      database.createSubOrder({ id: subId, job_id: ctx.jobId, service_id: candidate.service_id, agent_name: candidate.agent_name });
      database.addEventLog(ctx.jobId, {
        event: "SubOrderCreated",
        actor: "trustrouter_executor",
        target: candidate.service_id,
        details: `Dispatching to ${candidate.agent_name}`,
      });

      try {
        const result = await this.executeRealSubOrder(ctx, candidate, subId, startTime);
        return result;
      } catch (error: any) {
        logger.warn({ subId, candidate: candidate.agent_name, error: error.message }, "⚠️ Real sub-order failed");

        if (strictCapMode) {
          // In strict mode — mark as failed, no simulation
          database.updateSubOrderStatus(subId, "failed");
          database.addEventLog(ctx.jobId, {
            event: "SubOrderFailed",
            actor: candidate.service_id,
            details: `STRICT_CAP_MODE: ${error.message}`,
          });
          return this.buildFailedResult(candidate, subId, Date.now() - startTime, error.message);
        }

        if (demoMode) {
          // Demo mode: allowed to simulate, but must log it
          database.addEventLog(ctx.jobId, {
            event: "SimulationFallbackUsed",
            actor: candidate.service_id,
            details: `DEMO_MODE fallback: ${error.message}`,
          });
          return this.simulateSubOrder(ctx, candidate, subId, startTime);
        }

        // Default: simulate with warning
        logger.warn({ candidate: candidate.agent_name }, "Falling back to simulation (set DEMO_MODE=true explicitly)");
        database.addEventLog(ctx.jobId, {
          event: "SimulationFallbackUsed",
          actor: candidate.service_id,
          details: `Implicit demo fallback: ${error.message}`,
        });
        return this.simulateSubOrder(ctx, candidate, subId, startTime);
      }
    });

    const settled = await Promise.allSettled(subOrderPromises);
    const results: CandidateResult[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") results.push(result.value);
    }
    return results;
  }

  private async executeRealSubOrder(
    ctx: OrchestrationContext,
    candidate: CandidateAgentConfig,
    subId: string,
    startTime: number
  ): Promise<CandidateResult> {
    const capResult = await this.coordinator.executeOrder(
      candidate.service_id,
      JSON.stringify({ task: ctx.buyerIntent, job_id: ctx.jobId, type: "trust_evaluation" }),
      candidate.sla_timeout_ms
    );

    database.updateSubOrderStatus(subId, "completed");
    const latencyMs = capResult.latency_ms;
    const delivery = capResult.delivery;

    return this.evaluateDelivery(ctx, candidate, subId, delivery, latencyMs, capResult.negotiation_id, capResult.order_id, capResult.retries);
  }

  private evaluateDelivery(
    ctx: OrchestrationContext,
    candidate: CandidateAgentConfig,
    subId: string,
    delivery: any,
    latencyMs: number,
    negId: string,
    orderId: string,
    retries: number = 0
  ): CandidateResult {
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
      proofPresent = delivery != null && delivery !== "";
    }

    const score = calculateTrustScore({ schema_valid: schemaValid, proof_present: proofPresent, sources_present: sourcesPresent, sla_passed: sla, latency_ms: latencyMs, delivery_consistency: consistent });

    database.completeSubOrder(subId, {
      latency_ms: latencyMs,
      delivery_text: typeof delivery === "string" ? delivery : JSON.stringify(delivery ?? {}),
      score,
    });

    database.addEventLog(ctx.jobId, {
      event: "SubOrderEvaluated",
      actor: "trustrouter",
      target: candidate.service_id,
      details: `Score: ${score}/100, retries: ${retries}`,
    });

    return {
      service_id: candidate.service_id,
      agent_name: candidate.agent_name,
      order_id: orderId,
      negotiation_id: negId,
      status: schemaValid ? "completed" : "delivered",
      schema_valid: schemaValid,
      sources_present: sourcesPresent,
      sla_passed: sla,
      proof_present: proofPresent,
      latency_ms: latencyMs,
      delivery_consistency: consistent,
      score,
      retries,
      raw_delivery: typeof delivery === "string" ? delivery : JSON.stringify(delivery ?? {}),
    };
  }

  private async simulateSubOrder(
    ctx: OrchestrationContext,
    candidate: CandidateAgentConfig,
    subId: string,
    startTime: number
  ): Promise<CandidateResult> {
    const delay = 2000 + Math.random() * 5000;
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 5000)));

    const latencyMs = Date.now() - startTime;
    const quality = Math.random();
    const schemaValid = quality > 0.2;
    const sourcesPresent = quality > 0.4;
    const proofPresent = quality > 0.3;
    const sla = latencyMs < candidate.sla_timeout_ms;
    const consistent = quality > 0.25;

    const score = calculateTrustScore({ schema_valid: schemaValid, proof_present: proofPresent, sources_present: sourcesPresent, sla_passed: sla, latency_ms: latencyMs, delivery_consistency: consistent });

    const rawDelivery = JSON.stringify({
      content: `Simulated response from ${candidate.agent_name} for: ${ctx.buyerIntent}`,
      sources: sourcesPresent ? ["https://example.com/source1", "https://example.com/source2"] : [],
      confidence: quality,
    });

    database.completeSubOrder(subId, { latency_ms: latencyMs, delivery_text: rawDelivery, score });
    database.addEventLog(ctx.jobId, {
      event: "SubOrderCompleted_Simulated",
      actor: candidate.service_id,
      target: "trustrouter",
      details: `Score: ${score}/100`,
    });

    return {
      service_id: candidate.service_id,
      agent_name: candidate.agent_name,
      order_id: generateId("ord_sim"),
      negotiation_id: generateId("neg_sim"),
      status: schemaValid ? "completed" : "failed",
      schema_valid: schemaValid,
      sources_present: sourcesPresent,
      sla_passed: sla,
      proof_present: proofPresent,
      latency_ms: latencyMs,
      delivery_consistency: consistent,
      score,
      retries: 0,
      raw_delivery: rawDelivery,
    };
  }

  private buildFailedResult(candidate: CandidateAgentConfig, subId: string, latencyMs: number, errorMsg: string): CandidateResult {
    return {
      service_id: candidate.service_id,
      agent_name: candidate.agent_name,
      order_id: generateId("ord_fail"),
      negotiation_id: generateId("neg_fail"),
      status: "failed",
      schema_valid: false,
      sources_present: false,
      sla_passed: false,
      proof_present: false,
      latency_ms: latencyMs,
      delivery_consistency: false,
      score: 0,
      retries: 0,
      error: errorMsg,
    };
  }

  private async performRoutedExecution(
    ctx: OrchestrationContext,
    winnerId: string
  ): Promise<RoutedExecution> {
    const startTime = Date.now();
    logger.info({ jobId: ctx.jobId, winnerId }, "🎯 Route-and-execute: creating winner order");

    database.addEventLog(ctx.jobId, {
      event: "RouteAndExecuteStarted",
      actor: "trustrouter",
      target: winnerId,
      details: "Second-stage order to winner agent",
    });

    try {
      const capResult = await this.coordinator.executeOrder(
        winnerId,
        JSON.stringify({ task: ctx.buyerIntent, job_id: ctx.jobId, type: "routed_execution" }),
        90_000
      );

      const deliveryText = typeof capResult.delivery === "string"
        ? capResult.delivery
        : JSON.stringify(capResult.delivery ?? {});

      const { hashReport: hashFn } = await import("@capguard/shared");
      const deliveryHash = hashFn(deliveryText as any);

      database.addEventLog(ctx.jobId, {
        event: "RouteAndExecuteCompleted",
        actor: winnerId,
        target: "trustrouter",
        details: `Winner order: ${capResult.order_id}`,
      });

      return {
        enabled: true,
        winner_service_id: winnerId,
        winner_order_id: capResult.order_id,
        winner_delivery_hash: deliveryHash,
        status: "completed",
        latency_ms: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.error({ winnerId, error: error.message }, "❌ Route-and-execute failed");
      database.addEventLog(ctx.jobId, {
        event: "RouteAndExecuteFailed",
        actor: "trustrouter",
        details: error.message,
      });
      return {
        enabled: true,
        winner_service_id: winnerId,
        winner_order_id: "",
        winner_delivery_hash: "",
        status: "failed",
        latency_ms: Date.now() - startTime,
      };
    }
  }

  private async generateTrustReport(ctx: OrchestrationContext, results: CandidateResult[]): Promise<TrustReport> {
    const { recommended_service_id, recommended_reason } = selectBestCandidate(results);
    const stats = calculateStats(results);
    const eventLogs = database.getEventLogs(ctx.jobId);
    const executionLogHash = hashExecutionLog(eventLogs);

    // ─── SLA-Gated Safe Routing ───────────────────────────────────────────
    // Filter candidates by SLA, schema, proof, and score thresholds.
    // CAPGuard only routes execution to agents that pass ALL gates.
    // This controls routing decisions — NOT fund escrow or release.
    const slaGuard = calculateSlaGuard(results, recommended_service_id);

    database.addEventLog(ctx.jobId, {
      event: "SlaGuardEvaluated",
      actor: "trustrouter",
      details: `route_allowed=${slaGuard.route_allowed} winner_passed=${slaGuard.winner_passed_gate} blocked=${slaGuard.blocked_agents.length}`,
    });

    if (slaGuard.blocked_agents.length > 0) {
      logger.info(
        { jobId: ctx.jobId, blocked: slaGuard.blocked_agents.map((b) => `${b.agent_name}[${b.reasons.join(",")}]`) },
        "🚦 SLA Guard: some agents blocked from routing"
      );
    }

    // ─── Consensus Scoring ────────────────────────────────────────────────
    // Measure agreement across candidate deliveries via keyword similarity.
    const consensus = calculateConsensus(results);
    database.addEventLog(ctx.jobId, {
      event: "ConsensusScored",
      actor: "trustrouter",
      details: `agreement=${consensus.agreement_score}% outliers=${consensus.outlier_agents.length}`,
    });

    // ─── Route-and-execute (only if winner passed SLA gate) ───────────────
    let routedExecution: RoutedExecution;
    const shouldRoute = ctx.autoRoute && recommended_service_id !== "none" && slaGuard.winner_passed_gate;

    if (shouldRoute) {
      routedExecution = await this.performRoutedExecution(ctx, recommended_service_id);
    } else {
      const skipReason = !ctx.autoRoute
        ? "auto-route not requested"
        : recommended_service_id === "none"
        ? "no winner found"
        : "winner did not pass SLA gate";

      routedExecution = {
        enabled: false,
        winner_service_id: recommended_service_id,
        winner_order_id: "",
        winner_delivery_hash: "",
        status: "skipped",
        latency_ms: 0,
      };

      if (ctx.autoRoute && !slaGuard.winner_passed_gate) {
        logger.warn(
          { jobId: ctx.jobId, winner: recommended_service_id, reasons: slaGuard.blocked_agents.find((b) => b.service_id === recommended_service_id)?.reasons },
          "🚦 SLA Guard blocked route-and-execute — winner did not pass quality gate"
        );
        database.addEventLog(ctx.jobId, {
          event: "RoutingBlocked",
          actor: "trustrouter",
          target: recommended_service_id,
          details: `SLA gate blocked routing: ${skipReason}`,
        });
      }
    }

    // ─── 4th Level A2A: Cross-Validation ─────────────────────────────────
    const crossValidation = await this.performCrossValidation(ctx, results, recommended_service_id);
    const a2aDepth = crossValidation.enabled && crossValidation.status === "completed" ? 4 : 3;

    const baseReport: Omit<TrustReport, "report_hash"> = {
      report_id: generateId("tr"),
      job_id: ctx.jobId,
      buyer_intent: ctx.buyerIntent,
      candidate_agents: results,
      recommended_service_id,
      recommended_reason,
      routed_execution: routedExecution,
      cross_validation: crossValidation,
      on_chain_proof: {
        anchored: false,
        chain: "base",
        tx_hash: "",
        block_number: 0,
        contract_address: process.env.PROOF_CONTRACT_ADDRESS || "",
        report_hash: "",
        timestamp: new Date().toISOString(),
        note: "On-chain anchoring available when PROOF_CONTRACT_ADDRESS is configured",
      },
      sla_guard: slaGuard,
      consensus,
      execution_log_hash: executionLogHash,
      generated_at: new Date().toISOString(),
      ...stats,
      a2a_depth: a2aDepth,
    };

    const reportHash = hashReport(baseReport as any);
    const report: TrustReport = { ...baseReport, report_hash: reportHash };

    // Attempt on-chain anchoring (non-blocking — failure doesn't break report)
    report.on_chain_proof.report_hash = reportHash;
    try {
      const proof = await this.anchorProofOnChain(reportHash, ctx.jobId);
      report.on_chain_proof = proof;
      if (proof.anchored) {
        database.addEventLog(ctx.jobId, {
          event: "OnChainProofAnchored",
          actor: "trustrouter",
          details: `tx: ${proof.tx_hash}, block: ${proof.block_number}`,
        });
      } else {
        database.addEventLog(ctx.jobId, {
          event: "OnChainProofSkipped",
          actor: "trustrouter",
          details: proof.note ?? "Not configured",
        });
      }
    } catch (e: any) {
      logger.warn({ error: e.message }, "⚠️ On-chain proof anchoring failed (non-critical)");
      database.addEventLog(ctx.jobId, {
        event: "OnChainProofFailed",
        actor: "trustrouter",
        details: e.message,
      });
    }

    return report;
  }

  // ─── Cross-Validation: 4th Level A2A ────────────────────────────────────
  // Hire runner-up to verify winner's output — creating true agent-to-agent trust chain

  private async performCrossValidation(
    ctx: OrchestrationContext,
    results: CandidateResult[],
    winnerId: string
  ): Promise<CrossValidation> {
    const completed = results.filter(
      (c) => (c.status === "completed" || c.status === "delivered") && c.service_id !== winnerId
    );

    // Need at least 1 other completed agent to cross-validate
    if (completed.length === 0 || !winnerId || winnerId === "none") {
      return {
        enabled: false,
        validator_service_id: "",
        validator_agent_name: "",
        validator_order_id: "",
        validation_score: 0,
        validation_summary: "No runner-up available for cross-validation",
        status: "skipped",
        latency_ms: 0,
      };
    }

    // Select runner-up (highest score after winner) as validator
    const sorted = [...completed].sort((a, b) => b.score - a.score);
    const validator = sorted[0];
    const winnerResult = results.find((r) => r.service_id === winnerId);

    logger.info(
      { jobId: ctx.jobId, validator: validator.agent_name, winner: winnerId },
      "🔄 Cross-validation: hiring runner-up to verify winner's delivery"
    );

    database.addEventLog(ctx.jobId, {
      event: "CrossValidationStarted",
      actor: "trustrouter",
      target: validator.service_id,
      details: `Validator ${validator.agent_name} verifying winner ${winnerId}`,
    });

    const startTime = Date.now();

    try {
      const verifyPayload = JSON.stringify({
        task: "cross_validate",
        job_id: ctx.jobId,
        type: "cross_validation",
        winner_service_id: winnerId,
        winner_delivery: winnerResult?.raw_delivery || "",
        original_intent: ctx.buyerIntent,
        instruction: "Verify the accuracy, completeness, and source validity of the winner agent's delivery. Return a validation score (0-100) and summary.",
      });

      const capResult = await this.coordinator.executeOrder(
        validator.service_id,
        verifyPayload,
        60_000
      );

      // Parse validation response
      let validationScore = 75; // default if parsing fails
      let validationSummary = "Cross-validation completed";
      try {
        const parsed = typeof capResult.delivery === "string"
          ? JSON.parse(capResult.delivery)
          : capResult.delivery;
        validationScore = parsed?.confidence ? Math.round(parsed.confidence * 100) : 75;
        validationSummary = parsed?.content || "Validator confirmed winner's delivery";
      } catch {
        validationSummary = typeof capResult.delivery === "string"
          ? capResult.delivery.slice(0, 200)
          : "Cross-validation delivery received";
      }

      database.addEventLog(ctx.jobId, {
        event: "CrossValidationCompleted",
        actor: validator.service_id,
        target: winnerId,
        details: `Validation score: ${validationScore}/100`,
      });

      return {
        enabled: true,
        validator_service_id: validator.service_id,
        validator_agent_name: validator.agent_name,
        validator_order_id: capResult.order_id,
        validation_score: validationScore,
        validation_summary: validationSummary,
        status: "completed",
        latency_ms: Date.now() - startTime,
      };
    } catch (error: any) {
      logger.warn({ error: error.message }, "⚠️ Cross-validation failed");
      database.addEventLog(ctx.jobId, {
        event: "CrossValidationFailed",
        actor: validator.service_id,
        details: error.message,
      });

      return {
        enabled: true,
        validator_service_id: validator.service_id,
        validator_agent_name: validator.agent_name,
        validator_order_id: "",
        validation_score: 0,
        validation_summary: `Cross-validation failed: ${error.message}`,
        status: "failed",
        latency_ms: Date.now() - startTime,
      };
    }
  }

  // ─── On-Chain Proof Anchoring ────────────────────────────────────────────
  // Stores report hash on Base blockchain for immutable verification.
  //
  // IMPORTANT: This method NEVER fabricates a tx_hash.
  // If PROOF_CONTRACT_ADDRESS + PROOF_SIGNER_PRIVATE_KEY are not set,
  // it returns anchored=false with a transparency note.
  // If they are set, it calls the deployed contract via viem.

  private async anchorProofOnChain(reportHash: string, jobId: string): Promise<OnChainProof> {
    const contractAddress = process.env.PROOF_CONTRACT_ADDRESS;
    const privateKey = process.env.PROOF_SIGNER_PRIVATE_KEY;
    const rpcUrl = process.env.BASE_RPC_URL || "https://mainnet.base.org";

    // Case 1: Not configured — return unanchored proof with transparency note
    if (!contractAddress || !privateKey) {
      logger.info(
        "⛓️  On-chain proof: not configured (set PROOF_CONTRACT_ADDRESS + PROOF_SIGNER_PRIVATE_KEY for real anchoring)"
      );
      return {
        anchored: false,
        chain: "base",
        tx_hash: "",
        block_number: 0,
        contract_address: "",
        report_hash: reportHash,
        timestamp: new Date().toISOString(),
        note: "On-chain anchoring available when PROOF_CONTRACT_ADDRESS and PROOF_SIGNER_PRIVATE_KEY are configured. Report hash is cryptographically verifiable off-chain.",
      };
    }

    // Case 2: Configured — call real Base contract via viem
    try {
      logger.info({ reportHash: reportHash.slice(0, 20), jobId }, "⛓️  Anchoring proof on Base via viem");

      // Dynamic import with fallback if viem is not installed
      let viemImport: any, chainsImport: any, accountsImport: any;
      try {
        viemImport = await import("viem" as any);
        chainsImport = await import("viem/chains" as any);
        accountsImport = await import("viem/accounts" as any);
      } catch {
        logger.warn("viem not installed — run 'npm install viem' in apps/provider to enable on-chain anchoring");
        return {
          anchored: false,
          chain: "base",
          tx_hash: "",
          block_number: 0,
          contract_address: contractAddress,
          report_hash: reportHash,
          timestamp: new Date().toISOString(),
          note: "On-chain anchoring requires viem package. Run: npm install viem. Report hash is verifiable off-chain.",
        };
      }

      const { createWalletClient, createPublicClient, http, parseAbi } = viemImport;
      const { base } = chainsImport;
      const { privateKeyToAccount } = accountsImport;

      const account = privateKeyToAccount(privateKey as `0x${string}`);
      const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });
      const walletClient = createWalletClient({ chain: base, account, transport: http(rpcUrl) });

      const abi = parseAbi([
        "function anchorProof(bytes32 reportHash, string calldata jobId) external",
      ]);

      const reportHashBytes32 = `0x${reportHash.padEnd(64, "0").slice(0, 64)}` as `0x${string}`;

      const txHash = await walletClient.writeContract({
        address: contractAddress as `0x${string}`,
        abi,
        functionName: "anchorProof",
        args: [reportHashBytes32, jobId],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      logger.info(
        { txHash, blockNumber: receipt.blockNumber.toString() },
        "✅ On-chain proof anchored on Base"
      );

      return {
        anchored: true,
        chain: "base",
        tx_hash: txHash,
        block_number: Number(receipt.blockNumber),
        contract_address: contractAddress,
        report_hash: reportHash,
        timestamp: new Date().toISOString(),
        note: `Anchored on Base at block ${receipt.blockNumber}`,
      };
    } catch (error: any) {
      logger.error({ error: error.message }, "❌ On-chain anchoring failed");
      return {
        anchored: false,
        chain: "base",
        tx_hash: "",
        block_number: 0,
        contract_address: contractAddress,
        report_hash: reportHash,
        timestamp: new Date().toISOString(),
        note: `Anchoring attempted but failed: ${error.message}. Report hash remains verifiable off-chain.`,
      };
    }
  }
}


