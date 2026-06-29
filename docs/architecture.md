# Architecture — CAPGuard TrustRouter

## System Overview

CAPGuard TrustRouter is a **monorepo TypeScript** project with three main applications and one shared package.

## Components

### 1. Provider Runtime (`apps/provider/`)

The core CAP-integrated runtime that:
- Connects to CROO via WebSocket for real-time events
- Listens for `NegotiationCreated` and `OrderPaid` events
- Orchestrates trust evaluation jobs
- Delivers trust reports via CAP `deliverOrder`
- Serves the Dashboard REST API

**Key files:**
- `src/index.ts` — Main entry point, SDK initialization, WebSocket listeners
- `src/orchestrator.ts` — Trust evaluation engine (fan-out, verify, score, report)
- `src/database.ts` — SQLite persistence layer
- `src/api.ts` — Express REST API for dashboard
- `src/logger.ts` — Structured logging with Pino

### 2. Dashboard (`apps/dashboard/`)

Next.js 15 App Router dashboard with premium dark-mode UI:
- **Stats Grid** — Real-time metrics (transactions, scores, wallets)
- **Jobs Table** — All trust evaluation jobs with status and scores
- **Job Detail** — Candidate comparison, proof hashes, event timeline
- **Trigger Panel** — Manual job creation for demos

### 3. Mock Agents (`apps/mock-agents/`)

Three simulated candidate agents with varying quality levels:
- **ResearchAlpha** (high quality) — Complete responses with sources
- **VerifyBeta** (medium quality) — Partial source validation
- **FormatGamma** (low quality) — Basic responses, no sources

### 4. Shared Package (`packages/shared/`)

Shared utilities used by all components:
- **Types** — TypeScript interfaces for jobs, reports, sub-orders, events
- **Schemas** — Zod validation schemas for runtime safety
- **Scoring** — Trust score calculation and candidate selection
- **Hashing** — SHA-256 proof generation

## Data Flow

```
1. Buyer → CAP negotiation → TrustRouter Provider
2. TrustRouter accepts → waits for payment
3. Buyer pays order via CAP
4. TrustRouter → creates sub-orders → Candidate Agents
5. Candidates deliver responses
6. TrustRouter evaluates:
   - Schema validity (Zod)
   - Proof presence
   - Source completeness
   - SLA compliance
   - Latency
   - Delivery consistency
7. TrustRouter calculates trust scores
8. TrustRouter generates trust report + proof hashes
9. TrustRouter delivers report via CAP
10. Dashboard displays results in real-time
```

## Database Schema

**jobs** — Trust evaluation jobs
- `id`, `buyer_wallet`, `buyer_intent`, `order_id`, `status`, `trust_report_json`

**sub_orders** — Sub-orders to candidate agents
- `id`, `job_id`, `service_id`, `agent_name`, `status`, `latency_ms`, `score`

**event_logs** — Audit trail
- `job_id`, `timestamp`, `event`, `actor`, `target`, `details`

## Security

- No private keys stored — CROO platform handles signing
- API keys stored in `.env` (not committed)
- SHA-256 hashing for report integrity
- Zod validation on all inputs/outputs
