# Demo Script — CAPGuard TrustRouter (5 Minutes)
> Updated for Round 4 — includes SLA gate blocking, consensus scoring, evidence page

---

## Pre-Demo Setup

```bash
# Terminal 1 — provider
npm run dev:provider

# Terminal 2 — mock agents
npm run dev:mock-agents

# Terminal 3 — dashboard
npm run dev:dashboard

# Seed sample data if no real orders yet
npm run seed
```

Open: http://localhost:3000 (dashboard) and http://localhost:3000/evidence (evidence page)

---

## Script

### [00:00–00:25] HOOK

> "In the CROO Agent Store, there are agents you can hire. But how do you know which one actually works?"
>
> "You could hire them all and compare results yourself. That's expensive and unreliable."
>
> "CAPGuard TrustRouter does it for you — it hires agents before you do, with real paid CAP orders, runs them in parallel, blocks the ones that fail, and hands you a cryptographically verified recommendation."
>
> "One order. Four levels of A2A. One verified result."

---

### [00:25–01:30] LIVE DEMO — Dashboard + Fan-Out

*Open http://localhost:3000*

> "Here's our dashboard — [X] total CAP transactions, [Y] completed evaluations, average trust score [Z]/100."

*Click "New Evaluation" / Trigger Panel*

> "Let me trigger a live evaluation."

*Type intent:* `"Research top DeFi protocols on Base chain"`

*Click Evaluate — watch jobs list update*

> "CAPGuard just accepted this request as a provider. Now it's acting as a requester — creating paid sub-orders to three candidate agents simultaneously: ResearchAlpha, VerifyBeta, FormatGamma."
>
> "All three are real CROO Agent Store listings. Each gets a real CAP order, a real payment, and must deliver within their SLA."

*Job completes — click into it*

> "Let's look at the results..."

---

### [01:30–02:15] EVIDENCE PAGE

*Open http://localhost:3000/evidence*

> "Before I show you the trust report — let's look at the evidence page. This is what judges can use to verify everything."
>
> "You can see: total jobs, CAP transactions, unique buyer wallets. Every report hash is listed here with a Verify button."

*Click a Verify button*

> "This calls /api/verify/:hash — it recomputes the SHA-256 hash from the raw report and confirms nothing was tampered with. If you see valid: true, the report is cryptographically intact."

---

### [02:15–03:00] 4-LEVEL A2A + CROSS-VALIDATION

> "Now let me explain why this is architecturally unique."
>
> "Most agents on CROO are Level 1 — one buyer, one agent. BNB Deployer Scorer reaches Level 2 with one sub-order. CAPGuard reaches Level 4."
>
> "Level 1: you hire CAPGuard."
> "Level 2: CAPGuard hires 3 candidates in parallel — all paid."
> "Level 3: CAPGuard hires the winner again for actual execution."
> "Level 4: CAPGuard hires the runner-up to verify the winner's output."

*Show cross-validation result in trust report*

> "Here — VerifyBeta scored ResearchAlpha's delivery 88/100. That's independent validation, not CAPGuard's own judgment."

---

### [03:00–03:45] SLA GATE + CONSENSUS SCORING

*Show sla_guard object in trust report or evidence page*

> "Here's one of CAPGuard's core innovations: SLA-Gated Routing."
>
> "FormatGamma scored 41/100 — it failed schema validation and came in below the minimum score threshold. It's in the blocked_agents list with reasons: schema_invalid, score_below_threshold."
>
> "CAPGuard didn't route execution to FormatGamma. It was blocked at the gate."
>
> "This is what we mean by SLA-gated — it's not just ranking agents, it's refusing to forward to agents that don't meet the bar."

*Show consensus object*

> "And here's consensus scoring — using keyword overlap across all three deliveries, we get an agreement score of [X]%. This tells you how reliable the recommendation is: high agreement means the agents broadly agree."

---

### [03:45–04:30] MCP INTEGRATION

*Open MCP config or Claude Desktop*

> "CAPGuard is also callable as an MCP tool — from Claude Desktop, Cursor, or agy."

*Demo: send prompt via MCP*

> "I can say: 'Use CAPGuard to evaluate agents for: research DeFi protocols.' Claude calls the evaluate_agents MCP tool, CAPGuard runs the full 4-level A2A evaluation, and returns the trust report — all from inside my AI assistant."

---

### [04:30–05:00] CLOSE

> "CAPGuard TrustRouter isn't just one agent — it's infrastructure that makes every other agent in the CROO ecosystem more accountable."
>
> "Before you hire an agent, CAPGuard hires them first — with real paid CAP orders, SLA verification, cross-validation, and cryptographic proof."
>
> "One order. Four levels. One verified result."

*Show GitHub link + Agent Store listing + DoraHacks link*

---

## Key Talking Points (Q&A)

**On A2A Composability:**
> "We're the only BUIDL with 4-level depth. BNB Deployer Scorer is 2 levels with 1 sub-agent. We're 4 levels with 3 parallel sub-orders + route-and-execute + cross-validation."

**On SLA Gate vs Escrow:**
> "This is routing control, not escrow. CAPGuard defers the payOrder call until a candidate passes all 4 quality gates. It doesn't hold or release funds after delivery."

**On Consensus Scoring:**
> "Jaccard keyword similarity across all candidate deliveries. No LLM required. Agreement score 0-100 with outlier detection."

**On On-Chain Proof:**
> "We generate a SHA-256 report hash that's tamper-evident. Optional Base chain anchoring is available when PROOF_CONTRACT_ADDRESS is configured. We never fabricate a tx_hash."

**On Real Orders:**
> "Every evaluation you see generated real CAP orders. Each job = 1 buyer order + 3 sub-orders + 1-2 validation orders = 5-6 real CAP transactions."
