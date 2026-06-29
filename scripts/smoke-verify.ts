// ─── Smoke Test: Verify Endpoint ─────────────────────────────────────────────
// Tests that /api/verify/:hash works correctly after seeding a job.
// Run: npx tsx scripts/smoke-verify.ts

import { hashReport, hashExecutionLog, generateId } from "@capguard/shared";

const API_URL = process.env.CAPGUARD_API_URL || "http://localhost:3001";

async function main() {
  console.log("🔍 Smoke test: /api/verify endpoint\n");

  // Step 1: Trigger a job
  console.log("1. Triggering test job...");
  const triggerRes = await fetch(`${API_URL}/api/jobs/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "Smoke test: verify endpoint validation",
      buyer_wallet: "smoke_test_wallet",
      auto_route: false,
    }),
  });

  if (!triggerRes.ok) {
    const err = await triggerRes.text();
    console.error("❌ Failed to trigger job:", err);
    process.exit(1);
  }

  const report = await triggerRes.json();
  const reportHash = report.report_hash;
  console.log(`   ✅ Job created: ${report.report_id}`);
  console.log(`   Report hash: ${reportHash.slice(0, 32)}...`);

  // Step 2: Verify the report
  console.log("\n2. Calling /api/verify/:hash...");
  const verifyRes = await fetch(`${API_URL}/api/verify/${reportHash}`);
  
  if (!verifyRes.ok) {
    const err = await verifyRes.text();
    console.error("❌ Verify endpoint failed:", err);
    process.exit(1);
  }

  const verification = await verifyRes.json();
  console.log("   Verification result:", JSON.stringify(verification, null, 2));

  if (!verification.valid) {
    console.error("❌ FAIL: Proof verification returned invalid!");
    console.error("   Notes:", verification.verification_notes);
    process.exit(1);
  }

  // Step 3: Check hash match
  console.log("\n3. Checking hash consistency...");
  if (verification.report_hash !== verification.recomputed_report_hash) {
    console.error("❌ FAIL: Report hash mismatch!");
    process.exit(1);
  }
  if (verification.execution_log_hash !== verification.recomputed_execution_log_hash) {
    console.error("❌ FAIL: Execution log hash mismatch!");
    process.exit(1);
  }

  console.log("\n✅ ALL CHECKS PASSED");
  console.log(`   - Report hash valid: ${verification.valid}`);
  console.log(`   - Sub-order IDs: ${verification.sub_order_ids?.length || 0}`);
  console.log(`   - Notes: ${verification.verification_notes?.join(", ")}`);
}

main().catch((e) => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});
