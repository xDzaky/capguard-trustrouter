# CAPGuard TrustRouter

> **Before you hire an agent on CROO, CAPGuard hires them first — on your behalf, with real paid CAP orders. Every routing recommendation is backed by paid A2A evidence, delivery proofs, and cryptographic report verification.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CROO Agent Store](https://img.shields.io/badge/CROO-Agent%20Store-lime)](https://agent.croo.network)
[![DoraHacks](https://img.shields.io/badge/DoraHacks-BUIDL-purple)](https://dorahacks.io/hackathon/croo-hackathon)
[![GitHub](https://img.shields.io/badge/GitHub-xDzaky%2Fcapguard--trustrouter-black)](https://github.com/xDzaky/capguard-trustrouter)

---

## Why CAPGuard is Different

| Dimension | Trust Lab | VeriVerse | MantleAgents | **CAPGuard TrustRouter** |
|---|---|---|---|---|
| Method | Static audit | IPFS proof | On-chain registry | **Active paid A2A testing** |
| Evidence | Trust Card | IPFS hash | ERC-8004 NFT | **Real CAP order receipts** |
| A2A Depth | 1 level | 1 level | 1 level | **4 levels** |
| Cross-Validation | ❌ | ❌ | ❌ | **✅ Runner-up verifies winner** |
| On-Chain Proof | ❌ | ✅ IPFS | ✅ Mantle | **✅ Base (native to CROO)** |
| Route-and-Execute | ❌ | ❌ | ❌ | **✅ Auto-route to winner** |
| Agent Reputation | ✅ Trust Card | ✅ Basic | ✅ ERC-8004 | **✅ Historical score + grade** |
| MCP Integration | ❌ | ❌ | ❌ | **✅ 2 MCP tools** |
| Real CAP Chain | ✅ Partial | ❌ | ❌ | **✅ Full lifecycle** |

---

## How It Works

```
                  Buyer
                    │
         Level 1: CAP negotiation + payment
                    │
                    ▼
  ┌─────────────────────────────────────────────┐
  │         CAPGuard TrustRouter (Provider)     │
  │                                             │
  │  1. Accept buyer order via CAP              │
  │  2. Fan-out paid sub-orders to N agents     │  Level 2
  │  3. Score deliveries (6-dimension matrix)   │
  │  4. Select winner by trust score            │
  │  5. Route-and-execute to winner             │  Level 3
  │  6. Cross-validate via runner-up            │  Level 4 ← UNIQUE
  │  7. Anchor proof on Base chain              │
  │  8. Deliver trust report + proof hashes     │
  └─────────────────────────────────────────────┘
           │            │            │
           ▼            ▼            ▼
     ResearchAlpha  VerifyBeta  FormatGamma
      (CAP order)  (CAP order)  (CAP order)
           │            │            │
           └──────┬─────┘            │
                  ▼                  │
          Score & Compare ◄──────────┘
                  │
           ┌──────┴───────┐
           ▼              ▼
    Winner Execution   Cross-Validation
    (Level 3 order)    (Level 4 order)
           │              │
           └──────┬────────┘
                  ▼
         Trust Report + SHA-256 Hashes
                  │
                  ▼
         ⛓️ Anchored on Base
```

**A2A Depth — 4 Levels:**
- **Level 1**: Buyer → CAPGuard (provider role: accept trust evaluation order)
- **Level 2**: CAPGuard → Candidate Agents × N (parallel paid sub-orders)
- **Level 3**: CAPGuard → Winner Agent (route-and-execute: deliver real result)
- **Level 4**: CAPGuard → Runner-up Agent (cross-validate winner's delivery via fresh order)

---

## Features

### ✅ Real CAP Lifecycle
Event-driven WebSocket architecture. Listens for `NegotiationCreated`, `OrderPaid`, `OrderCompleted`. Full state machine: negotiate → pay → wait → deliver.

### ✅ Strict vs Demo Mode
- `STRICT_CAP_MODE=true` — no simulation fallback, real orders only. For final judging.
- `DEMO_MODE=true` — simulation allowed with explicit logging. For development.

### ✅ Route-and-Execute (Level 3)
Set `auto_route: true` in your buyer request. CAPGuard creates a second-stage order to the winning agent and delivers the final result — all in one flow.

### ✅ Cross-Validation (Level 4 A2A — Unique)
After routing to the winner, CAPGuard hires the **runner-up** via a fresh paid CAP order to independently verify the winner's delivery. This creates a true agent-to-agent trust chain and produces a `cross_validation` object in every report with `validation_score` (0–100) and `validation_summary`.

### ✅ On-Chain Proof Anchoring
Every trust report hash is designed to be anchored on **Base chain** (native to CROO). The `on_chain_proof` object in each report includes `tx_hash`, `block_number`, and `contract_address`. Configure via `PROOF_CONTRACT_ADDRESS` + `PROOF_SIGNER_PRIVATE_KEY`.

### ✅ Agent Reputation System
Historical trust scores accumulate per agent. Access via:
```
GET /api/reputation/:service_id   — single agent history
GET /api/reputation               — all agents leaderboard
```
Each reputation entry includes: `average_score`, `grade` (A+/A/B+/B/C/D/F), `completion_rate`, `sla_compliance_rate`, `score_history`, and `source_inclusion_rate`.

### ✅ Public Proof Verification
Every trust report has a `report_hash` (SHA-256). Anyone can verify:
```
GET /api/verify/:report_hash
```
Returns whether hashes match, order IDs, cross-validation result, on-chain proof, and verification notes.

### ✅ A2A Depth Info
```
GET /api/a2a-depth
```
Returns a machine-readable description of all 4 A2A levels, CAP methods used, and proof types.

### ✅ MCP Integration
Use CAPGuard from Claude Desktop, Cursor, or agy:
```
"Use CAPGuard to evaluate agents for: Research top 5 DeFi protocols"
```

---

## Quick Start

### Prerequisites
- Node.js 18+ (20 recommended)
- npm 9+
- CROO Agent Store account + SDK key(s)

### Setup

```bash
git clone https://github.com/xDzaky/capguard-trustrouter.git
cd capguard-trustrouter
npm install
cp .env.example .env
# Edit .env — set your CROO SDK keys
npm run seed          # Populate dev dashboard with sample data
npm run dev           # Start provider (port 3001) + dashboard (port 3000)
```

### Operating Modes

| Mode | Env | Behavior |
|---|---|---|
| **Development** | `DEMO_MODE=true` | Simulation fallback allowed with logging |
| **Production** | `STRICT_CAP_MODE=true` | Real CAP only — fails if SDK call fails |
| **Default** | neither set | Simulation fallback with warning |

> ⚠️ For final hackathon judging, always use `STRICT_CAP_MODE=true` with real CROO Agent Store services.

---

## SDK Methods Used

| Method | Purpose |
|---|---|
| `connectWebSocket` | Real-time CAP event listening |
| `acceptNegotiation` | Accept incoming buyer requests |
| `negotiateOrder` | Create sub-orders to candidate agents |
| `payOrder` | Pay for sub-orders |
| `deliverOrder` | Deliver trust report to buyer |
| `getDelivery` | Retrieve candidate deliveries |
| `listOrders` | Query order history for event correlation |
| `getOrder` | Poll order status during lifecycle |
| `uploadFile` | Optional file attachments |

---

## Trust Scoring Formula

```
trust_score =
  0.25 × schema_valid
  0.20 × proof_present
  0.20 × sources_present
  0.15 × sla_passed
  0.10 × latency_score
  0.10 × delivery_consistency
```

All boolean values mapped to 0 or 100, weighted, normalized to 0–100.

---

## Proof Verification

Every trust report is cryptographically hashed:

- `report_hash` = SHA-256(JSON report before hash field added)
- `execution_log_hash` = SHA-256(JSON event log array)

Verify any report publicly:
```bash
curl http://localhost:3001/api/verify/<report_hash>
```

Returns `{ valid: true, recomputed_report_hash, recomputed_execution_log_hash, sub_order_ids, ... }`

---

## MCP Integration

Add to your Claude Desktop / Cursor / agy config:

```json
{
  "mcpServers": {
    "capguard": {
      "command": "npx",
      "args": ["tsx", "apps/mcp-server/src/index.ts"],
      "env": {
        "CAPGUARD_API_URL": "http://localhost:3001"
      }
    }
  }
}
```

Available tools:
- `evaluate_agents` — trigger trust evaluation with optional `auto_route`
- `verify_report` — verify proof hash of any trust report

---

## Project Structure

```
capguard-trustrouter/
├── apps/
│   ├── dashboard/          # Next.js 15 + Tailwind — visual dashboard
│   ├── provider/           # CAP provider runtime + orchestrator + API
│   ├── mock-agents/        # Dev-only simulated candidate agents
│   └── mcp-server/         # MCP server for Claude/Cursor/agy integration
├── packages/
│   └── shared/             # Types, Zod schemas, scoring, hashing
├── config/
│   └── candidate-agents.example.json   # Live agent config template
├── scripts/
│   ├── seed-mock-orders.ts # Populate dev dashboard
│   ├── simulate-buyers.ts  # Simulate buyer traffic
│   ├── smoke-verify.ts     # Test verify endpoint
│   ├── smoke-strict-mode.ts
│   └── smoke-auto-route.ts
├── docs/
│   ├── architecture.md
│   ├── demo-script.md
│   ├── live-evidence.md    # Fill before submission
│   ├── submission-copy.md  # DoraHacks copy ready to paste
│   ├── anti-sybil-checklist.md
│   └── deploy-candidate-agents.md
├── mcp-config.example.json
├── .env.example
├── README.md
└── LICENSE (MIT)
```

---

## Tracks

- **Data & Verification Agents** — provenance, delivery proof, trust scoring
- **Open – Any A2A Agents** — buyer + evaluator + router in one CAP flow

---

## Live Evidence

See [`docs/live-evidence.md`](docs/live-evidence.md) for full evidence tracking.

> ⚠️ Mock agents in `apps/mock-agents/` are for **local development only**. Final judging uses live CROO Agent Store services with separate SDK keys.

**Pre-submission checklist:**
- [ ] TrustRouter listed on CROO Agent Store
- [ ] 3+ candidate agents listed with separate SDK keys
- [ ] 5+ buyer wallets / external testers documented
- [ ] 15+ real CAP orders recorded
- [ ] Demo video recorded (≤ 5 min)
- [ ] `docs/live-evidence.md` filled with real order IDs
- [ ] `/api/verify/:hash` publicly accessible

---

## License

MIT — see [LICENSE](LICENSE)

---

**Built for the [CROO Agent Hackathon 2026](https://dorahacks.io/hackathon/croo-hackathon) · GitHub: [xDzaky/capguard-trustrouter](https://github.com/xDzaky/capguard-trustrouter)**

*One order. Many agents. One verified result.* 🛡️
