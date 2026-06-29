# Demo Script — CAPGuard TrustRouter (5 Minutes)

## Pre-Demo Setup

1. Start the provider: `npm run dev:provider`
2. Seed sample data: `npm run seed`
3. Start the dashboard: `npm run dev:dashboard`
4. Open http://localhost:3000

---

## Script

### 0:00–0:30 — The Problem

> "There are 20+ agents on CROO Agent Store, but how does a buyer know which one to trust? Right now, the only way is to try them all — paying each one and hoping for the best. That's expensive and unreliable."
>
> "CAPGuard TrustRouter solves this. It's a paid CAP-native trust evaluation agent. You send one request, we test multiple agents, and we tell you exactly which one to use — with proof."

### 0:30–1:30 — Live Demo: Dashboard Overview

*Show the dashboard*

> "Here's our dashboard. You can see [X] total CAP transactions, [Y] completed jobs, and our average trust score across all evaluations."
>
> "Each job represents a real buyer request. Let me trigger a new one live."

*Type in the trigger panel:* "Research the top 5 DeFi protocols by TVL this week"

*Click Evaluate*

> "TrustRouter just accepted this request. Behind the scenes, it's creating sub-orders to three candidate agents: ResearchAlpha, VerifyBeta, and FormatGamma."

### 1:30–2:30 — Live Demo: Job Detail

*Click into the completed job*

> "Let's look at a completed evaluation. Here you can see all three candidates compared side by side."
>
> "ResearchAlpha scored 89 out of 100 — valid schema, sources included, proof verified, within SLA."
>
> "VerifyBeta scored 72 — sources were incomplete."
>
> "FormatGamma scored only 35 — no sources, no proof, failed consistency check."
>
> "TrustRouter automatically recommends ResearchAlpha as the best choice."

### 2:30–3:30 — Technical Deep Dive

*Show the proof hashes section*

> "Every report includes SHA-256 proof hashes. The report hash covers the entire trust report — if any data changes, the hash breaks. The execution log hash covers every event in the pipeline."
>
> "This isn't just a recommendation engine. It's a verifiable routing decision."

*Show the event timeline*

> "Here's the full audit trail: NegotiationCreated, OrderPaid, three SubOrderCreated events, three SubOrderCompleted events, and finally OrderDelivered with the report hash."
>
> "That's 8+ CAP events from one buyer request."

### 3:30–4:30 — Why CROO / CAP

> "This architecture is only possible because of CAP:"
>
> - "Negotiation and order creation give us structured buyer→provider flow"
> - "Payment and settlement mean every sub-order is a real transaction"
> - "Verifiable delivery ensures candidate agents can't fake responses"
> - "WebSocket events give us real-time pipeline monitoring"
>
> "On a regular API marketplace, you'd need to build all of this yourself. On CROO, it's built into the protocol."

### 4:30–5:00 — Closing

> "CAPGuard TrustRouter isn't just one agent — it's infrastructure that makes every other agent in the CROO ecosystem more valuable."
>
> "One order. Many agents. One verified result."
>
> "Thank you."

---

## Key Talking Points for Q&A

- **A2A Composability**: TrustRouter is both a provider (accepts buyer orders) and a buyer (creates sub-orders to candidates). This demonstrates the deepest A2A composability in the hackathon.

- **Real CAP Orders**: Every demo generates 4-6+ real CAP transactions.

- **Innovation**: Trust routing based on real order outcomes and verifiable proofs — not just API response checking.

- **Scalability**: The architecture supports any number of candidate agents and scoring dimensions.
