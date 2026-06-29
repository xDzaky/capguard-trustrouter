# DoraHacks Submission Copy — CAPGuard TrustRouter

> Copy-paste ready for DoraHacks BUIDL form.

---

## BUIDL Name

**CAPGuard TrustRouter**

---

## One-Liner

> The first agent that hires other agents before you do — evaluating CROO services through real paid CAP orders before routing your request.

---

## Problem

Agent marketplaces have a **pre-purchase trust problem**. When you browse the CROO Agent Store, all you see is static metadata: names, descriptions, and pricing. But metadata can be gamed. Demos can be rehearsed. Reviews can be faked.

Buyers have no way to verify agent quality before committing real money. The only true test of an agent's trustworthiness is **making it do real work** — and that's exactly what CAPGuard does.

---

## Solution

CAPGuard TrustRouter is an **active paid agent procurement router**:

1. **Buyer sends intent** — e.g., "Research the top 5 DeFi protocols by TVL"
2. **CAPGuard accepts** the buyer's CAP order and begins evaluation
3. **CAPGuard fans out paid sub-orders** to 2–4 candidate agents (real CAP orders, real payments)
4. **Each agent delivers** — CAPGuard validates their schema, proof, sources, SLA, and latency
5. **CAPGuard scores** every candidate using a transparent weighted formula
6. **CAPGuard delivers** a cryptographically verifiable trust report with routing recommendation
7. **Optional route-and-execute**: CAPGuard creates a second-stage order to the winning agent

This is not a passive auditor. It is a **buyer, evaluator, and router** — all in one CAP flow.

---

## A2A Depth

CAPGuard operates at **3 levels of A2A composability**:

- **Level 1**: Human/Agent Buyer → CAPGuard TrustRouter (provider role)
- **Level 2**: CAPGuard → Candidate Agent A, B, C (executor/buyer role)
- **Level 3**: CAPGuard → Winner agent (route-and-execute, optional)

Every `auto_route=true` evaluation generates **4–6 real CAP transactions** from a single buyer intent.

---

## Why Only CROO / CAP Makes This Possible

Without CAP, CAPGuard would be just another API aggregator. With CAP:

- Every sub-order is a **real negotiation + payment + delivery**
- Every delivery comes with **proof of settlement** on-chain
- **No proof, no payment** — the protocol enforces verifiable delivery
- Order history is **tamper-resistant** — reputation builds automatically
- CAPGuard acts as **both provider and buyer** in the same flow

---

## Technical Execution

- **WebSocket event-driven architecture**: listens for `NegotiationCreated`, `OrderPaid`, `OrderCompleted`
- **Real CAP lifecycle**: `negotiateOrder` → `payOrder` → `getDelivery` → `deliverOrder`
- **Strict vs Demo mode**: `STRICT_CAP_MODE=true` prevents simulation fallback for real judging
- **SHA-256 proof hashing**: `report_hash` + `execution_log_hash` for every job
- **Public verification**: `GET /api/verify/:report_hash` recomputes and validates all hashes
- **Route-and-execute**: second-stage order to winner agent when `auto_route=true`
- **MCP integration**: callable from Claude Desktop, Cursor, agy via `evaluate_agents` tool

---

## Tracks

- ✅ **Data & Verification Agents** — provenance, delivery proof, trust scoring
- ✅ **Open – Any A2A Agents** — buyer + evaluator + router in one CAP flow

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

All values mapped to 0–100, weighted, and normalized.

---

## Links

- **GitHub**: https://github.com/xDzaky/capguard-trustrouter
- **Agent Store**: `[TO BE FILLED AFTER LISTING]`
- **Demo Video**: `[TO BE RECORDED — max 5 min]`
- **Verify Endpoint**: `http://your-deployment/api/verify/:hash`

---

## Metrics (fill in before submission)

- Total CAP orders: `TBD (target: 15+)`
- Unique counterparty agents: `TBD (target: 3+)`
- Unique buyer wallets: `TBD (target: 5+)`
- Average trust score: `TBD`

---

## Submission Checklist

- [ ] Listed on CROO Agent Store
- [ ] CAP integration verified (real orders, not seed data)
- [ ] Open source: MIT License
- [ ] Demo video recorded (≤ 5 min)
- [ ] README updated (no "coming soon")
- [ ] docs/live-evidence.md filled
- [ ] BUIDL submitted on DoraHacks
