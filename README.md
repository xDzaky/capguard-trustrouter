# CAPGuard TrustRouter

> **Before you hire an agent on CROO, CAPGuard hires them first — on your behalf, with real paid CAP orders. Every routing recommendation is backed by paid A2A evidence, delivery proofs, and cryptographic report verification.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CROO Agent Store](https://img.shields.io/badge/CROO-Agent%20Store-lime)](https://agent.croo.network)
[![DoraHacks](https://img.shields.io/badge/DoraHacks-BUIDL-purple)](https://dorahacks.io/hackathon/croo-hackathon)
[![GitHub](https://img.shields.io/badge/GitHub-xDzaky%2Fcapguard--trustrouter-black)](https://github.com/xDzaky/capguard-trustrouter)

---

## Why CAPGuard is Different

| Dimension | Passive Audit Tools | **CAPGuard TrustRouter** |
|---|---|---|
| Method | Static metadata review | **Active paid testing** |
| Evidence | Listing / API info | **Real CAP order receipts** |
| Role | Observer | **Buyer + Evaluator + Router** |
| A2A Depth | 1 level | **3 levels** |
| Timing | Before listing | **At purchase time** |
| Output | Trust card / checklist | **Verified routing + optional execution** |

---

## How It Works

```
Human/Agent Buyer
      │
      │  CAP negotiation + payment
      ▼
┌─────────────────────────────────────────┐
│       CAPGuard TrustRouter (Provider)   │
│                                         │
│  1. Accept buyer order via CAP          │
│  2. Fan-out paid sub-orders to N agents │
│  3. Validate delivery proofs + score    │
│  4. Select winner by trust score        │
│  5. Optional: route-and-execute winner  │
│  6. Deliver trust report + proof hash   │
└─────────────────────────────────────────┘
       │           │           │
       ▼           ▼           ▼
  ResearchAlpha  VerifyBeta  FormatGamma
  (CAP order)   (CAP order)  (CAP order)
       │           │           │
       └─────┬─────┘           │
             ▼                 │
      Score & Compare ◄────────┘
             │
             ▼
   Trust Report + SHA-256 Proof Hash
             │
             ▼  [if auto_route=true]
   Winner Execution Order (Level 3)
```

**A2A Depth:**
- **Level 1**: Buyer → CAPGuard (provider role)
- **Level 2**: CAPGuard → Candidate Agents (buyer/executor role)
- **Level 3**: CAPGuard → Winner Agent (route-and-execute)

---

## Features

### ✅ Real CAP Lifecycle
Event-driven WebSocket architecture. Listens for `NegotiationCreated`, `OrderPaid`, `OrderCompleted`. Full state machine: negotiate → pay → wait → deliver.

### ✅ Strict vs Demo Mode
- `STRICT_CAP_MODE=true` — no simulation fallback, real orders only. For final judging.
- `DEMO_MODE=true` — simulation allowed with explicit logging. For development.

### ✅ Route-and-Execute
Set `auto_route: true` in your buyer request. CAPGuard creates a second-stage order to the winning agent and delivers the final result — all in one flow.

### ✅ Public Proof Verification
Every trust report has a `report_hash` (SHA-256). Anyone can verify:
```
GET /api/verify/:report_hash
```
Returns whether hashes match, order IDs, and verification notes.

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
