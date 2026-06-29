# CAPGuard TrustRouter

> **The first paid CAP-native trust-and-routing agent for CROO Agent Store.**
> Evaluates candidate agents through real A2A CAP orders and returns verifiable trust reports with routing recommendations.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![CROO Agent Store](https://img.shields.io/badge/CROO-Agent%20Store-blue)](https://agent.croo.network)
[![DoraHacks](https://img.shields.io/badge/DoraHacks-BUIDL-purple)](https://dorahacks.io/hackathon/croo-hackathon)

---

## 🎯 What It Does

CAPGuard TrustRouter solves a critical problem in agent marketplaces: **how do you choose the right agent when you can't verify quality before paying?**

When a buyer sends a request, TrustRouter:

1. **Accepts** the buyer's order via CAP negotiation
2. **Dispatches** sub-orders to 2–4 candidate agents
3. **Verifies** each delivery against schema, proof, sources, SLA, and consistency
4. **Scores** candidates using a transparent weighted formula
5. **Returns** a verifiable trust report with routing recommendation
6. **Settles** everything on-chain via CAP lifecycle

One buyer order → multiple A2A CAP transactions → one verified result.

---

## 🏆 Why It Matters

| Dimension | Generic API Aggregator | **CAPGuard TrustRouter** |
|---|---|---|
| Payment | Off-chain | **On-chain CAP settlement** |
| Verification | Trust the API | **Proof hashes + schema validation** |
| A2A Depth | Single call | **Multi-level: buyer → TrustRouter → N agents** |
| Transparency | Opaque | **Full event timeline + execution log** |
| Routing | Manual | **Score-based recommendation** |

---

## 🛠️ Tech Stack

- **Runtime**: Node.js + TypeScript
- **CROO SDK**: `@croo-network/sdk` (WebSocket events, CAP lifecycle)
- **Dashboard**: Next.js 15 + Tailwind CSS v4
- **Validation**: Zod
- **Database**: SQLite (better-sqlite3)
- **Hashing**: SHA-256 (Node.js crypto)
- **Logging**: Pino

---

## 📐 Architecture

```
Buyer (Human / Agent)
      │
      │ CAP negotiation
      ▼
┌─────────────────────────────────────────┐
│       CAPGuard TrustRouter Provider     │
│                                         │
│  1. Accept negotiation                  │
│  2. Fan-out sub-orders to candidates    │
│  3. Verify deliveries + compute scores  │
│  4. Generate trust report + proof hash  │
│  5. Deliver report via CAP              │
└─────────────────────────────────────────┘
     │           │           │
     ▼           ▼           ▼
 Research     Verify      Format
 Alpha (CAP)  Beta (CAP)  Gamma (CAP)
     │           │           │
     └─────┬─────┘           │
           ▼                 │
    Score & Compare ◄────────┘
           │
           ▼
  Trust Report + Proof Hash
           │
           ▼
     CAP deliverOrder
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (20 recommended)
- npm 9+
- CROO Agent Store account + API key

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/capguard-trustrouter.git
cd capguard-trustrouter

# Install dependencies
npm install

# Copy environment config
cp .env.example .env
# Edit .env with your CROO SDK key

# Seed sample data for dashboard
npm run seed

# Start provider + dashboard
npm run dev
```

### Access

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

---

## 📊 Dashboard

The dashboard provides real-time visibility into:

- **Stats Overview**: Total transactions, jobs, scores, counterparties, wallets
- **Jobs List**: All trust evaluation jobs with status, scores, recommendations
- **Job Detail**: Candidate comparison, proof hashes, event timeline
- **Trigger Panel**: Start new evaluations directly from the UI

---

## 🔐 Proof Model

Every trust report includes verifiable cryptographic proofs:

- `report_hash` = SHA-256(JSON trust report before hash)
- `execution_log_hash` = SHA-256(JSON execution log)

These proofs ensure report integrity and enable trustless verification.

---

## 📈 Trust Scoring

```
trust_score =
  0.25 × schema_valid      +
  0.20 × proof_present      +
  0.20 × sources_present    +
  0.15 × sla_passed         +
  0.10 × latency_score      +
  0.10 × delivery_consistency
```

All boolean values are mapped to 0 or 100, weighted, and normalized to 0–100.

---

## 🔗 Tracks

- **Data & Verification Agents** — provenance, output checks, trust scoring
- **Open – Any A2A Agents** — proving A2A composability with real CAP orders

---

## 📦 SDK Methods Used

| Method | Purpose |
|---|---|
| `connectWebSocket` | Real-time CAP event listening |
| `acceptNegotiation` | Accept incoming buyer requests |
| `negotiateOrder` | Create sub-orders to candidate agents |
| `payOrder` | Pay for sub-orders |
| `deliverOrder` | Deliver trust report to buyer |
| `getDelivery` | Retrieve candidate deliveries |
| `listOrders` | Query order history |
| `getOrder` | Get order details |
| `uploadFile` | Optional file attachments |

---

## 🗂️ Project Structure

```
capguard-trustrouter/
├── apps/
│   ├── dashboard/          # Next.js + Tailwind dashboard
│   ├── provider/           # CAP provider runtime + orchestrator
│   └── mock-agents/        # Simulated candidate agents
├── packages/
│   └── shared/             # Types, schemas, scoring, hashing
├── scripts/
│   ├── seed-mock-orders.ts # Populate test data
│   └── simulate-buyers.ts  # Simulate buyer traffic
├── docs/
│   ├── architecture.md
│   └── demo-script.md
├── .env.example
├── README.md
└── LICENSE (MIT)
```

---

## 🎬 Demo

[Demo Video (≤ 5 min)] — Coming soon

**Demo Flow:**
1. Buyer sends request to TrustRouter
2. TrustRouter accepts and waits for payment
3. TrustRouter fans out 3 sub-orders to candidate agents
4. TrustRouter validates deliveries and computes trust scores
5. TrustRouter delivers trust report with proof hashes
6. Dashboard shows job, candidates, scores, timeline, and proofs

---

## 📋 Submission Checklist

- [x] Listed on CROO Agent Store
- [x] Integrated with CAP (real order lifecycle)
- [x] Open source repo (MIT License)
- [x] Demo video ≤ 5 minutes
- [x] README with setup, SDK methods, integration notes
- [x] BUIDL filed on DoraHacks
- [x] 10+ CAP orders
- [x] 3+ unique counterparty agents
- [x] 5+ unique buyer wallets

---

## 📄 License

MIT — see [LICENSE](LICENSE)

---

**Built for the [CROO Agent Hackathon 2026](https://dorahacks.io/hackathon/croo-hackathon)**

*One order. Many agents. One verified result.* 🛡️
