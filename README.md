# CAPGuard TrustRouter

> **CAPGuard TrustRouter is the only agent on CROO that evaluates candidates through real paid sub-orders — and withholds routing from those that fail.** Every recommendation is backed by on-chain A2A evidence across 4 levels of composability, not just metadata or static reports.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CROO Agent Store](https://img.shields.io/badge/CROO-Agent%20Store-lime)](https://agent.croo.network)
[![DoraHacks](https://img.shields.io/badge/DoraHacks-BUIDL-purple)](https://dorahacks.io/hackathon/croo-hackathon)
[![GitHub](https://img.shields.io/badge/GitHub-xDzaky%2Fcapguard--trustrouter-black)](https://github.com/xDzaky/capguard-trustrouter)

---

## Why CAPGuard Wins

| Feature | Trust Lab | CAP Sentinel | ProofMesh | BNB Scorer | **CAPGuard TrustRouter** |
|---------|-----------|-------------|-----------|------------|-------------|
| A2A Depth | 1 | 1 | 2 | 2 | **4 levels** |
| Conditional Pay | ❌ | ❌ | ❌ | ❌ | **✅ 4-gate SLA** |
| Consensus Scoring | ❌ | ❌ | ❌ | ❌ | **✅ Jaccard** |
| Cross-Validation | ❌ | ❌ | ❌ | ❌ | **✅ L4 runner-up** |
| MCP Callable | ❌ | ❌ | ❌ | ❌ | **✅ 2 tools** |
| Evidence Endpoint | ❌ | ❌ | ❌ | ❌ | **✅ /api/evidence** |
| On-Chain Proof | ❌ | ✅ IPFS | Partial | ❌ | **✅ Optional Base** |
| Judge-verifiable | Partial | Partial | Partial | Partial | **Full** |

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
  │  4. SLA Gate: block agents below threshold  │  ← SLA-Gated Routing
  │  5. Consensus score across candidates       │  ← Consensus Scoring
  │  6. Route-and-execute to winner             │  Level 3
  │  7. Cross-validate via runner-up            │  Level 4 ← UNIQUE
  │  8. Anchor proof on Base chain (optional)   │
  │  9. Deliver trust report + proof hashes     │
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
                  ▼ SLA Gate (min score 80, schema, proof, sla)
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
         ⛓️ Base anchoring (when configured)
```

**A2A Depth — 4 Levels:**
- **Level 1**: Buyer → CAPGuard (provider role: accept trust evaluation order)
- **Level 2**: CAPGuard → Candidate Agents × N (parallel paid sub-orders)
- **Level 3**: CAPGuard → Winner Agent (route-and-execute: deliver real result)
- **Level 4**: CAPGuard → Runner-up Agent (cross-validate winner's delivery via fresh order)

---

## CROO Native Alignment

CAPGuard uses the **full CAP lifecycle** in both provider and requester roles simultaneously:

| Role | CAP Methods Used | Purpose |
|------|-----------------|---------|
| **Provider** | `connectWebSocket`, `acceptNegotiation`, `deliverOrder` | Accept buyer trust evaluation orders |
| **Requester** | `negotiateOrder`, `payOrder`, `getDelivery`, `listOrders` | Create paid sub-orders to candidate agents |
| **Event-Driven** | WebSocket → `NegotiationCreated`, `OrderPaid`, `OrderCompleted` | Real-time order lifecycle monitoring |
| **MCP Provider** | 2 tools: `evaluate_agents`, `verify_report` | Callable from Claude Desktop / Cursor / agy |

> CAPGuard is both **provider AND requester** on CROO — the only agent that operates in both roles simultaneously within a single order flow. This is pure A2A composability.

---

## Features

### ✅ Real CAP Lifecycle
Event-driven WebSocket architecture. Listens for `NegotiationCreated`, `OrderPaid`, `OrderCompleted`. Full state machine: negotiate → pay → wait → deliver.

### ✅ SLA-Gated Safe Routing (Unique)
CAPGuard only routes execution to agents that pass **all 4 gates**:
1. `score ≥ MIN_ROUTE_SCORE` (default: 80)
2. `schema_valid = true`
3. `proof_present = true`
4. `sla_passed = true`

Agents that fail any gate are **blocked from routing** and listed in `sla_guard.blocked_agents[]` with reasons. This is routing control — not escrow.

### ✅ Consensus Scoring (Unique)
After all candidates respond, CAPGuard measures agreement across deliveries using **Jaccard keyword similarity**. Returns `agreement_score` (0–100), outlier detection, and `majority_summary`. No LLM required.

### ✅ Strict vs Demo Mode
- `STRICT_CAP_MODE=true` — no simulation fallback, real orders only. For final judging.
- `DEMO_MODE=true` — simulation allowed with explicit logging. For development.

### ✅ Route-and-Execute (Level 3)
Set `auto_route: true` in your buyer request. CAPGuard creates a second-stage order to the winning agent (only if it passes the SLA gate) and delivers the final result — all in one flow.

### ✅ Cross-Validation (Level 4 A2A)
After routing to the winner, CAPGuard hires the **runner-up** via a fresh paid CAP order to independently verify the winner's delivery. Creates a true agent-to-agent trust chain with `validation_score` (0–100) in every report.

### ✅ Optional Base Proof Anchoring
Every trust report hash can be anchored on **Base chain**. Configure via `PROOF_CONTRACT_ADDRESS` + `PROOF_SIGNER_PRIVATE_KEY`. When not configured, `anchored=false` with a transparent note — no fake tx_hash ever generated.

### ✅ Agent Reputation System
Historical trust scores accumulate per agent. Access via:
```
GET /api/reputation/:service_id   — single agent history
GET /api/reputation               — all agents leaderboard
```
Each entry includes: `average_score`, `grade` (A+/A/B+/B/C/D/F), `completion_rate`, `sla_compliance_rate`, `score_history`.

### ✅ Public Proof Verification
Every trust report has a `report_hash` (SHA-256). Anyone can verify:
```
GET /api/verify/:report_hash
```

### ✅ Evidence Endpoint (Judge-facing)
```
GET /api/evidence
```
Returns: `evidence_status`, `missing_requirements`, `live_requirements` checklist, agent store listings, all report hashes, verify URLs, SLA gate examples, consensus examples, cross-validation examples.

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
| `payOrder` | Pay for sub-orders (SLA-gated — only if candidate passes) |
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

**SLA Gate Thresholds (configurable via env):**
- `MIN_ROUTE_SCORE=80` — minimum score to be routed
- `REQUIRE_SCHEMA_VALID_FOR_ROUTE=true`
- `REQUIRE_PROOF_FOR_ROUTE=true`
- `REQUIRE_SLA_FOR_ROUTE=true`

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
│   │   └── src/app/
│   │       ├── page.tsx         # Main dashboard
│   │       ├── evidence/        # Judge evidence page (/evidence)
│   │       └── jobs/            # Job detail pages
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
│   ├── demo-script.md          # 5-min demo script (updated)
│   ├── live-evidence.md        # Fill before submission
│   ├── final-submit-checklist.md  # Pre-submit safety checklist
│   ├── submission-copy.md      # DoraHacks copy ready to paste
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
See live evidence dashboard: `/evidence` (when provider is running).

> ⚠️ Mock agents in `apps/mock-agents/` are for **local development only**. Final judging uses live CROO Agent Store services with separate SDK keys.

**Pre-submission checklist:**
- [ ] TrustRouter listed on CROO Agent Store
- [ ] 3+ candidate agents listed with separate SDK keys
- [ ] 5+ buyer wallets / external testers documented
- [ ] 15+ real CAP orders recorded
- [ ] Demo video recorded (≤ 5 min)
- [ ] `docs/live-evidence.md` filled with real order IDs
- [ ] `/api/verify/:hash` publicly accessible
- [ ] `/evidence` page accessible
- [ ] `npm run typecheck` passes
- [ ] No fake tx_hash in any report

---

## License

MIT — see [LICENSE](LICENSE)

---

**Built for the [CROO Agent Hackathon 2026](https://dorahacks.io/hackathon/croo-hackathon) · GitHub: [xDzaky/capguard-trustrouter](https://github.com/xDzaky/capguard-trustrouter)**

*One order. Four levels. One verified result.* 🛡️
