// ─── Seed Mock Orders ───────────────────────────────────────────────────────
// Populates the database with sample trust evaluation jobs for dashboard demo.

import "dotenv/config";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { database } from "../apps/provider/src/database.js";
import { generateId, calculateTrustScore, selectBestCandidate, hashReport, hashExecutionLog } from "../packages/shared/src/index.js";

console.log("🌱 Seeding mock data...\n");

const SAMPLE_INTENTS = [
  "Find the best CROO research agent for hackathon competitive analysis",
  "Analyze the top 5 DeFi protocols by TVL this week",
  "Research wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f8fCb2 activity",
  "Compare Layer 2 scaling solutions: Arbitrum vs Optimism vs Base",
  "Generate a comprehensive report on CROO Agent Protocol market fit",
  "Evaluate the security posture of top 3 DEX protocols",
  "Research and summarize recent AI agent marketplace developments",
];

const BUYER_WALLETS = [
  "0x742d35Cc6634C0532925a3b844Bc9e7595f8fCb2",
  "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
  "0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097",
  "0xcd3B766CCDd6AE721141F452C550Ca635964ce71",
  "0x2546BcD3c84621e976D8185a91A922aE77ECEc30",
];

const CANDIDATES = [
  { service_id: "svc_research_alpha", agent_name: "ResearchAlpha" },
  { service_id: "svc_verify_beta", agent_name: "VerifyBeta" },
  { service_id: "svc_format_gamma", agent_name: "FormatGamma" },
];

for (let i = 0; i < SAMPLE_INTENTS.length; i++) {
  const jobId = generateId("job");
  const orderId = generateId("ord");
  const intent = SAMPLE_INTENTS[i];
  const wallet = BUYER_WALLETS[i % BUYER_WALLETS.length];
  const createdAt = new Date(Date.now() - (SAMPLE_INTENTS.length - i) * 3600_000).toISOString();

  database.createJob({
    id: jobId,
    buyer_wallet: wallet,
    buyer_intent: intent,
    order_id: orderId,
  });

  database.addEventLog(jobId, {
    event: "NegotiationCreated",
    actor: wallet,
    target: "capguard_trustrouter",
    negotiation_id: generateId("neg"),
  });

  database.addEventLog(jobId, {
    event: "NegotiationAccepted",
    actor: "capguard_trustrouter",
    order_id: orderId,
  });

  database.addEventLog(jobId, {
    event: "OrderPaid",
    actor: wallet,
    order_id: orderId,
  });

  // Create sub-orders for each candidate
  const candidateResults = CANDIDATES.map((c, ci) => {
    const subId = generateId("sub");
    const negId = generateId("neg");
    const latencyMs = 3000 + Math.random() * 20000;
    const quality = [0.92, 0.75, 0.45][ci];

    const schemaValid = quality > 0.5;
    const sourcesPresent = quality > 0.6;
    const proofPresent = quality > 0.4;
    const slaPassed = latencyMs < 60000;
    const consistent = quality > 0.5;

    const score = calculateTrustScore({
      schema_valid: schemaValid,
      proof_present: proofPresent,
      sources_present: sourcesPresent,
      sla_passed: slaPassed,
      latency_ms: latencyMs,
      delivery_consistency: consistent,
    });

    database.createSubOrder({
      id: subId,
      job_id: jobId,
      service_id: c.service_id,
      agent_name: c.agent_name,
      negotiation_id: negId,
    });

    database.completeSubOrder(subId, {
      latency_ms: Math.round(latencyMs),
      delivery_text: JSON.stringify({
        content: `Analysis result from ${c.agent_name} for: ${intent}`,
        sources: sourcesPresent ? ["https://source1.com", "https://source2.com"] : [],
        confidence: quality,
      }),
      score,
    });

    database.addEventLog(jobId, {
      event: "SubOrderCreated",
      actor: "trustrouter_executor",
      target: c.service_id,
      negotiation_id: negId,
    });

    database.addEventLog(jobId, {
      event: "SubOrderCompleted",
      actor: c.service_id,
      target: "trustrouter",
      details: `Score: ${score}/100`,
    });

    return {
      service_id: c.service_id,
      agent_name: c.agent_name,
      order_id: generateId("ord"),
      negotiation_id: negId,
      status: schemaValid ? "completed" : "failed",
      schema_valid: schemaValid,
      sources_present: sourcesPresent,
      sla_passed: slaPassed,
      proof_present: proofPresent,
      latency_ms: Math.round(latencyMs),
      delivery_consistency: consistent,
      score,
    };
  });

  const { recommended_service_id, recommended_reason } = selectBestCandidate(candidateResults as any);
  const eventLogs = database.getEventLogs(jobId);

  const report = {
    report_id: generateId("tr"),
    job_id: jobId,
    buyer_intent: intent,
    candidate_agents: candidateResults,
    recommended_service_id,
    recommended_reason,
    report_hash: "",
    execution_log_hash: hashExecutionLog(eventLogs),
    generated_at: createdAt,
    total_candidates: candidateResults.length,
    completed_candidates: candidateResults.filter((c) => c.status === "completed").length,
    failed_candidates: candidateResults.filter((c) => c.status === "failed").length,
    average_score: Math.round(candidateResults.reduce((a, b) => a + b.score, 0) / candidateResults.length),
  };

  report.report_hash = hashReport(report);

  database.completeJob(jobId, report as any);

  database.addEventLog(jobId, {
    event: "OrderDelivered",
    actor: "capguard_trustrouter",
    order_id: orderId,
    details: `Report hash: ${report.report_hash.slice(0, 20)}...`,
  });

  console.log(`  ✅ Job ${i + 1}/${SAMPLE_INTENTS.length}: "${intent.slice(0, 50)}..." → Recommended: ${recommended_service_id}`);
}

const stats = database.getStats();
console.log("\n📊 Seed Summary:");
console.log(`  Total jobs: ${stats.total_jobs}`);
console.log(`  Total sub-orders: ${stats.total_sub_orders}`);
console.log(`  Total CAP transactions: ${stats.total_cap_transactions}`);
console.log(`  Unique counterparties: ${stats.unique_counterparties}`);
console.log(`  Unique buyer wallets: ${stats.unique_buyer_wallets}`);
console.log(`  Average trust score: ${stats.average_trust_score}`);
console.log("\n🌱 Seeding complete!");

database.close();
