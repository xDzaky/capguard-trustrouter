// ─── Simulate Buyers ────────────────────────────────────────────────────────
// Sends test requests to the TrustRouter API to simulate real buyer traffic.

import "dotenv/config";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const TEST_REQUESTS = [
  {
    intent: "Research the top 3 AI agent platforms by market cap",
    buyer_wallet: "0xTestBuyer001",
  },
  {
    intent: "Analyze CROO Network token economics and protocol design",
    buyer_wallet: "0xTestBuyer002",
  },
  {
    intent: "Compare CAP protocol with other A2A standards",
    buyer_wallet: "0xTestBuyer003",
  },
  {
    intent: "Generate security assessment for DeFi protocol 0x1234",
    buyer_wallet: "0xTestBuyer004",
  },
  {
    intent: "Research emerging trends in autonomous agent economies",
    buyer_wallet: "0xTestBuyer005",
  },
];

async function simulateBuyers() {
  console.log("🎯 Simulating buyer requests to TrustRouter...\n");

  for (let i = 0; i < TEST_REQUESTS.length; i++) {
    const req = TEST_REQUESTS[i];
    console.log(`  📤 Request ${i + 1}/${TEST_REQUESTS.length}: "${req.intent.slice(0, 50)}..."`);

    try {
      const response = await fetch(`${API_URL}/api/jobs/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req),
      });

      if (response.ok) {
        const report = await response.json();
        console.log(`  ✅ Completed! Recommended: ${report.recommended_service_id} (score: ${report.average_score})`);
        console.log(`     Report hash: ${report.report_hash?.slice(0, 24)}...`);
      } else {
        const error = await response.text();
        console.log(`  ❌ Failed: ${error}`);
      }
    } catch (error: any) {
      console.log(`  ❌ Error: ${error.message}`);
    }

    // Wait between requests
    if (i < TEST_REQUESTS.length - 1) {
      console.log("  ⏳ Waiting 2s...\n");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log("\n✅ Simulation complete!");
  console.log(`  Check dashboard at http://localhost:3000`);
}

simulateBuyers().catch(console.error);
