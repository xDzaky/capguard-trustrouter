# Final Submission Checklist — CAPGuard TrustRouter
> Complete every item before filing BUIDL on DoraHacks. Do NOT submit until all ✅.

---

## 1. Code Quality

- [ ] `npm run typecheck` passes with 0 errors
- [ ] Provider starts: `npm run dev:provider` → no crash
- [ ] Dashboard loads: http://localhost:3000 → data appears
- [ ] Evidence page loads: http://localhost:3000/evidence → data appears
- [ ] `/api/health` returns `status: "ok"`
- [ ] `/api/evidence` returns `evidence_status: "ready"` (not "incomplete")
- [ ] No `anchored: true` with empty or fake `tx_hash` in any report

---

## 2. Agent Store Listings (Required)

- [ ] CAPGuard TrustRouter listed on agent.croo.network (status: Live)
  - URL: `https://agent.croo.network/agents/___________`
- [ ] ResearchAlpha listed with separate SDK key
  - URL: `https://agent.croo.network/agents/___________`
- [ ] VerifyBeta listed with separate SDK key
  - URL: `https://agent.croo.network/agents/___________`
- [ ] FormatGamma listed with separate SDK key
  - URL: `https://agent.croo.network/agents/___________`
- [ ] All 4 listings have correct pricing set

---

## 3. Real CAP Orders (Required for anti-sybil)

- [ ] ≥ 10 completed evaluation jobs in database
- [ ] ≥ 3 unique counterparty agent service IDs used
- [ ] ≥ 5 unique buyer wallets (external testers, not just yourself)
- [ ] No highly concentrated self-trade pattern
- [ ] Order IDs recorded in `docs/live-evidence.md`

---

## 4. Proof & Verification

- [ ] `/api/evidence` shows `report_hashes` (at least 3)
- [ ] `/api/verify/:hash` returns `valid: true` for at least 1 hash
- [ ] `on_chain_proof.anchored = false` when contract not configured (honest)
- [ ] OR `on_chain_proof.anchored = true` with real verifiable `tx_hash` on BaseScan

---

## 5. Documentation

- [ ] `docs/live-evidence.md` filled with real order IDs and links
- [ ] README updated with actual Agent Store URLs
- [ ] Demo video link added to README and DoraHacks form
- [ ] No placeholder/`pending` text remains in README

---

## 6. Demo Video (Required)

- [ ] Video is ≤ 5 minutes
- [ ] Video is publicly accessible (YouTube unlisted or equivalent)
- [ ] Video shows:
  - [ ] At least 2-3 agents online in Agent Store
  - [ ] Live CAP order being placed
  - [ ] Fan-out to multiple candidates
  - [ ] SLA gate blocking at least 1 agent
  - [ ] Trust report with report_hash shown
  - [ ] `/api/verify/:hash` endpoint called
  - [ ] `/evidence` page shown
  - [ ] (Bonus) MCP tool call demonstrated

---

## 7. DoraHacks BUIDL Fields

- [ ] Project name: "CAPGuard TrustRouter"
- [ ] Tracks selected: "Data & Verification Agents" + "Open – Any A2A Agents"
- [ ] GitHub URL: `https://github.com/xDzaky/capguard-trustrouter`
- [ ] Demo video URL: `___________`
- [ ] Agent Store URL: `https://agent.croo.network/agents/___________`
- [ ] Description written (from `docs/submission-copy.md`)
- [ ] All required fields completed

---

## 8. Final Safety Check

- [ ] License is MIT (check LICENSE file exists)
- [ ] Repo is public
- [ ] No private keys committed to git
- [ ] `.env` is in `.gitignore`
- [ ] `STRICT_CAP_MODE=true` works without crashing when configured
- [ ] `DEMO_MODE=true` works without crashing

---

## 9. Anti-Sybil Self-Audit

- [ ] Unique counterparty agents: ___ / 3 minimum
- [ ] Unique buyer wallets: ___ / 5 minimum
- [ ] Self-trade pattern: Not concentrated (< 50% from single wallet)
- [ ] Human audit ready: can explain every order in live-evidence.md

---

## Submission Date Target: 8 July 2026 (1 day before deadline)

> ⚠️ Do NOT wait until 9 July — submit on 8 July to allow for corrections.
