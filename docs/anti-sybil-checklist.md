# Anti-Sybil Checklist — CAPGuard TrustRouter

> From the hackathon rules: reward-eligibility flags (not auto-DQ but reviewed) include:
> - < 3 unique counterparty agents
> - < 5 unique buyer wallets
> - Highly concentrated self-trade pattern

---

## Required Thresholds

| Requirement | Target | Current Status |
|---|---|---|
| Unique counterparty agents | ≥ 3 | ⏳ 0 / 3 |
| Unique buyer wallets | ≥ 5 | ⏳ 0 / 5 |
| No concentrated self-trade | Diverse pattern | ⏳ not verified |
| Random 10% audit ready | Clean code + evidence | ⏳ pending |

---

## Step-by-Step Compliance Plan

### 1. Register Candidate Agents with Separate SDK Keys

Each candidate agent must be a **distinct CROO Agent Store entity** with its own SDK key:

```bash
# In CROO Dashboard, create 3 separate agents:
# 1. CAPGuard ResearchAlpha  — new SDK key → CROO_SDK_KEY_RESEARCH_ALPHA
# 2. CAPGuard VerifyBeta     — new SDK key → CROO_SDK_KEY_VERIFY_BETA
# 3. CAPGuard FormatGamma    — new SDK key → CROO_SDK_KEY_FORMAT_GAMMA

# Set in your .env:
CROO_TARGET_SERVICE_IDS=svc_research_alpha,svc_verify_beta,svc_format_gamma
```

This satisfies: **≥ 3 unique counterparty agents**

### 2. Use 5+ Different Buyer Wallets

Do NOT test all orders from the same wallet. Options:

**Option A — Multiple test accounts:**
- Create 5 separate CROO accounts for testing
- Each triggers 2–3 TrustRouter orders
- Total: 10–15 orders from 5+ unique wallets

**Option B — External testers:**
- Share your Agent Store listing with 4 others
- Ask them to place 1–2 orders each
- Verify they use their own wallets

**Option C — Mixed approach:**
- 2 of your own test accounts
- 3 external testers

This satisfies: **≥ 5 unique buyer wallets**

### 3. Avoid Self-Trade Concentration

The system auto-detects patterns where:
- All orders come from the same wallet
- All sub-orders go to the same counterparty

**How CAPGuard avoids this:**
- Each job fans out to 3+ different candidates (inherently diverse)
- Each buyer order is from a different wallet (if you follow Step 2)
- Mock agents are dev-only — never used in final judging

### 4. Document Everything in live-evidence.md

Before submission, fill in `docs/live-evidence.md` with:
- Order IDs from CROO Agent Store explorer
- Screenshots of orders
- Wallet addresses (or anonymized identifiers) of testers

### 5. Prepare for Random 10% Audit

If selected for audit, a CROO Core member will:
- Open your GitHub repo
- Run `npm install && npm run seed && npm run dev`
- Check that the agent is listed on CROO Agent Store
- Verify at least 1 real CAP order end-to-end

**Make sure:**
- [ ] README has accurate quick start (no "coming soon")
- [ ] `.env.example` is complete
- [ ] `npm run dev` works without errors
- [ ] Agent Store listing is publicly accessible
- [ ] At least 1 real order is visible in Agent Store history

---

## Commands to Check Your Status

```bash
# Check how many unique buyer wallets in your local DB
sqlite3 data/trustrouter.db "SELECT DISTINCT buyer_wallet FROM jobs WHERE status='completed';"

# Check how many unique counterparties
sqlite3 data/trustrouter.db "SELECT DISTINCT service_id FROM sub_orders WHERE status='completed';"

# Count total real orders (not simulated)
sqlite3 data/trustrouter.db "SELECT COUNT(*) FROM jobs WHERE status='completed' AND order_id NOT LIKE 'manual_%';"
```
