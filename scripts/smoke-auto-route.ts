// ─── Smoke Test: Auto-Route (Route-and-Execute) ───────────────────────────────
// Tests that auto_route=true produces a routed_execution field in trust report.
// Run: npx tsx scripts/smoke-auto-route.ts

const API_URL = process.env.CAPGUARD_API_URL || "http://localhost:3001";

async function main() {
  console.log("🎯 Smoke test: auto_route=true (route-and-execute)\n");

  // Step 1: Trigger with auto_route=true
  console.log("1. Triggering job with auto_route=true...");
  const res = await fetch(`${API_URL}/api/jobs/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "Smoke test: route-and-execute flow",
      buyer_wallet: "smoke_autoroute_wallet",
      auto_route: true,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("❌ Failed to trigger job:", err);
    process.exit(1);
  }

  const report = await res.json();
  console.log(`   ✅ Job complete: ${report.report_id}`);
  console.log(`   Recommended: ${report.recommended_service_id}`);

  // Step 2: Check routed_execution field
  console.log("\n2. Checking routed_execution field...");
  const routed = report.routed_execution;

  if (!routed) {
    console.error("❌ FAIL: routed_execution field missing from trust report!");
    process.exit(1);
  }

  if (routed.status === "skipped") {
    console.error("❌ FAIL: routed_execution.status is 'skipped' but auto_route was true!");
    process.exit(1);
  }

  console.log("   Routed execution:", JSON.stringify(routed, null, 2));

  if (routed.enabled !== true) {
    console.error("❌ FAIL: routed_execution.enabled should be true");
    process.exit(1);
  }

  if (!routed.winner_service_id) {
    console.error("❌ FAIL: routed_execution.winner_service_id is empty");
    process.exit(1);
  }

  // Step 3: Trigger with auto_route=false, verify status is skipped
  console.log("\n3. Triggering job with auto_route=false (should skip)...");
  const res2 = await fetch(`${API_URL}/api/jobs/trigger`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "Smoke test: auto_route false",
      buyer_wallet: "smoke_noroute_wallet",
      auto_route: false,
    }),
  });

  const report2 = await res2.json();
  const routed2 = report2.routed_execution;

  if (routed2?.status !== "skipped") {
    console.error("❌ FAIL: Expected routed_execution.status = 'skipped'");
    process.exit(1);
  }

  console.log("   ✅ auto_route=false correctly sets status to 'skipped'");

  console.log("\n✅ ALL AUTO-ROUTE CHECKS PASSED");
  console.log(`   - Winner: ${routed.winner_service_id}`);
  console.log(`   - Status: ${routed.status}`);
  console.log(`   - Latency: ${routed.latency_ms}ms`);
}

main().catch((e) => {
  console.error("Fatal error:", e.message);
  process.exit(1);
});
