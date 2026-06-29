"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveRequirements {
  has_agent_listings: boolean;
  has_10_orders: boolean;
  has_3_counterparties: boolean;
  has_5_buyers: boolean;
  has_report_hashes: boolean;
  has_verify_urls: boolean;
}

interface EvidenceData {
  generated_at: string;
  mode: "STRICT_CAP" | "DEMO" | "DEFAULT";
  evidence_status?: "ready" | "incomplete";
  missing_requirements?: string[];
  live_requirements?: LiveRequirements;
  agent_store_listings: Record<string, string>;
  architecture: {
    a2a_depth: number;
    sla_gated_routing: boolean;
    consensus_scoring: boolean;
    cross_validation: boolean;
    on_chain_proof: string;
  };
  stats: {
    total_jobs: number;
    completed_jobs: number;
    total_sub_orders: number;
    total_cap_transactions: number;
    average_trust_score: number;
    unique_counterparties: number;
    unique_buyer_wallets: number;
  };
  report_hashes?: string[];
  verify_urls?: string[];
  sla_guard_examples?: any[];
  cross_validation_examples?: any[];
  consensus_examples?: any[];
  on_chain_anchor_examples?: any[];
  latest_jobs?: {
    job_id: string;
    status: string;
    created_at: string;
    candidates_evaluated: number;
    winner: string;
    avg_score: number;
    sla_gate_passed: boolean;
    consensus_score: number;
  }[];
}

const API_URL = process.env.NEXT_PUBLIC_PROVIDER_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001";

// ─── Helper Components ────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <div className="w-4 h-0.5 bg-[#A3FF12]" />
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function RequirementRow({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 font-bold ${
        met ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"
      }`}>
        {met ? "✓" : "○"}
      </span>
      <span className={`text-sm ${met ? "text-gray-700" : "text-gray-400"}`}>{label}</span>
      {met && <span className="ml-auto text-[10px] font-bold text-green-600 uppercase tracking-wider">Met</span>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="px-3 py-1.5 text-xs font-mono bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors whitespace-nowrap"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function VerifyButton({ hash, verifyUrl }: { hash: string; verifyUrl: string }) {
  const fullUrl = verifyUrl.startsWith("http") ? verifyUrl : `${API_URL}${verifyUrl}`;
  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#A3FF12] text-black rounded-lg hover:bg-[#8AE600] transition-colors whitespace-nowrap"
    >
      Verify →
    </a>
  );
}

function StatCard({ label, value, sub, highlight }: { label: string; value: string | number; sub?: string; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl p-6 border ${highlight ? "border-[#A3FF12] bg-[#A3FF12]/5" : "border-gray-100 bg-white"}`}
      style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{label}</p>
      <p className={`text-4xl font-bold ${highlight ? "text-[#0A0A0A]" : "text-[#0A0A0A]"}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  );
}

function ModeBadge({ mode }: { mode: string }) {
  const styles: Record<string, string> = {
    STRICT_CAP: "bg-[#A3FF12] text-black",
    DEMO: "bg-gray-800 text-[#A3FF12]",
    DEFAULT: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${styles[mode] ?? styles.DEFAULT}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {mode}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EvidencePage() {
  const [data, setData] = useState<EvidenceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/evidence`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .then((d: EvidenceData) => { setData(d); setLoading(false); })
      .catch((e: Error) => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#A3FF12] border-t-black rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm font-mono">Loading evidence…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-4xl mb-4">⚠️</p>
          <p className="font-bold text-[#0A0A0A] mb-2">Provider API not reachable</p>
          <p className="text-sm text-gray-400 font-mono mb-4">{error}</p>
          <p className="text-xs text-gray-400">Run <code className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">npm run dev:provider</code> first</p>
        </div>
      </div>
    );
  }

  // ─── Safe local vars with ?? fallbacks ────────────────────────────────────
  const lr: LiveRequirements = data.live_requirements ?? {
    has_agent_listings: Object.keys(data.agent_store_listings ?? {}).length >= 4,
    has_10_orders: (data.stats?.completed_jobs ?? 0) >= 10,
    has_3_counterparties: (data.stats?.unique_counterparties ?? 0) >= 3,
    has_5_buyers: (data.stats?.unique_buyer_wallets ?? 0) >= 5,
    has_report_hashes: (data.report_hashes?.length ?? 0) > 0,
    has_verify_urls: (data.verify_urls?.length ?? 0) > 0,
  };
  const stats = data.stats ?? { total_jobs: 0, completed_jobs: 0, total_sub_orders: 0, total_cap_transactions: 0, average_trust_score: 0, unique_counterparties: 0, unique_buyer_wallets: 0 };
  const missingReqs = data.missing_requirements ?? [];
  const reportHashes = data.report_hashes ?? [];
  const verifyUrls = data.verify_urls ?? [];
  const slaGuardExamples = data.sla_guard_examples ?? [];
  const consensusExamples = data.consensus_examples ?? [];
  const crossValExamples = data.cross_validation_examples ?? [];
  const onChainExamples = data.on_chain_anchor_examples ?? [];
  const latestJobs = data.latest_jobs ?? [];
  const agentListings = data.agent_store_listings ?? {};
  const arch = data.architecture ?? { a2a_depth: 4, sla_gated_routing: true, consensus_scoring: true, cross_validation: true, on_chain_proof: "when configured" };
  const evidenceStatus = data.evidence_status ?? (missingReqs.length === 0 ? "ready" : "incomplete");
  const isReady = evidenceStatus === "ready";

  const lrMet = Object.values(lr).filter(Boolean).length;
  const lrTotal = Object.values(lr).length;

  return (
    <div className="min-h-screen bg-white antialiased" style={{ fontFamily: "'Inter', sans-serif" }}>

      {/* ── Shared Header (CROO design) ── */}
      <Header activePage="evidence" contextLabel="EVIDENCE PACK" />

      {/* ── Page Hero ── */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-8 py-12">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-0.5 bg-[#A3FF12]" />
                <span className="text-[10px] font-bold text-[#A3FF12] uppercase tracking-[0.2em]">Judge Verification</span>
                <span className="ml-2">
                  <ModeBadge mode={data.mode} />
                </span>
                {isReady ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-900/40 border border-green-700/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-900/40 border border-amber-700/50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Incomplete
                  </span>
                )}
              </div>
              <h1 className="text-5xl font-bold mb-3">Evidence Pack</h1>
              <p className="text-gray-400 text-base">
                Live proof · Updated {new Date(data.generated_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Requirements Met</p>
                <p className="text-4xl font-bold">
                  <span className="text-[#A3FF12]">{lrMet}</span>
                  <span className="text-gray-600">/{lrTotal}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">CAP Transactions</p>
                <p className="text-4xl font-bold">{stats.total_cap_transactions}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Trust Score</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#A3FF12] rounded-full" style={{ boxShadow: "0 0 15px rgba(163,255,18,0.6)" }} />
                  <p className="text-4xl font-bold">{stats.average_trust_score}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-12 space-y-16">

        {/* ── Missing Requirements Warning ── */}
        {!isReady && missingReqs.length > 0 && (
          <div className="border border-red-100 rounded-3xl p-8 bg-red-50" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <div className="flex items-start gap-4">
              <span className="text-3xl flex-shrink-0">🚨</span>
              <div>
                <p className="font-bold text-red-700 text-lg mb-1">Evidence Incomplete</p>
                <p className="text-sm text-red-600 mb-4">Generate real CROO orders before claiming final metrics.</p>
                <ul className="space-y-2">
                  {missingReqs.map((req, i) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5 flex-shrink-0">•</span> {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Anti-Sybil Compliance ── */}
        <section>
          <SectionLabel label="Anti-Sybil Compliance" />
          <h2 className="text-2xl font-bold mb-8">Live Requirements</h2>
          <div className="bg-white rounded-3xl border border-gray-100 p-8" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            <RequirementRow label="Agent Store listings (CAPGuard + 3 candidates)" met={lr.has_agent_listings} />
            <RequirementRow label="10+ completed evaluation jobs" met={lr.has_10_orders} />
            <RequirementRow label="3+ unique counterparty agents" met={lr.has_3_counterparties} />
            <RequirementRow label="5+ unique buyer wallets" met={lr.has_5_buyers} />
            <RequirementRow label="Report hashes available" met={lr.has_report_hashes} />
            <RequirementRow label="Verify URLs publicly accessible" met={lr.has_verify_urls} />
          </div>
        </section>

        {/* ── Real Order Metrics ── */}
        <section>
          <SectionLabel label="CAP Activity" />
          <h2 className="text-2xl font-bold mb-8">Real Order Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard label="Total Jobs" value={stats.total_jobs} />
            <StatCard label="Completed Jobs" value={stats.completed_jobs} />
            <StatCard label="CAP Transactions" value={stats.total_cap_transactions} highlight />
            <StatCard label="Avg Trust Score" value={`${stats.average_trust_score}/100`} />
            <StatCard label="Sub-Orders" value={stats.total_sub_orders} />
            <StatCard label="Unique Buyers" value={stats.unique_buyer_wallets} sub="min 5 required" />
            <StatCard label="Counterparties" value={stats.unique_counterparties} sub="min 3 required" />
            <StatCard label="A2A Depth" value={`${arch.a2a_depth} Levels`} highlight />
          </div>
        </section>

        {/* ── Agent Store Listings ── */}
        {Object.keys(agentListings).length > 0 && (
          <section>
            <SectionLabel label="Agent Store" />
            <h2 className="text-2xl font-bold mb-8">Live Listings</h2>
            <div className="bg-white rounded-3xl border border-gray-100 p-8" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <div className="space-y-0">
                {Object.entries(agentListings).map(([name, url], i) => {
                  const displayName = name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                  const agentId = url.split("/agents/")[1] ?? "";
                  const isCapguard = name === "capguard";
                  return (
                    <div key={name} className={`flex items-center justify-between py-4 ${i < Object.keys(agentListings).length - 1 ? "border-b border-gray-50" : ""}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-2xl flex items-center justify-center text-xs font-bold ${isCapguard ? "bg-[#A3FF12] text-black" : "bg-gray-100 text-gray-500"}`}>
                          {displayName[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-[#0A0A0A]">{displayName}</p>
                          <p className="text-xs font-mono text-gray-400">{agentId}</p>
                        </div>
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-[#A3FF12] hover:opacity-70 transition-opacity"
                      >
                        View on Store →
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Architecture ── */}
        <section>
          <SectionLabel label="Architecture" />
          <h2 className="text-2xl font-bold mb-8">4-Level A2A Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "SLA-Gated Routing", active: arch.sla_gated_routing, icon: "🚦", desc: "4-gate quality filter" },
              { label: "Consensus Scoring", active: arch.consensus_scoring, icon: "🤝", desc: "Jaccard agreement" },
              { label: "Cross-Validation", active: arch.cross_validation, icon: "🔄", desc: "Level 4 runner-up" },
              { label: "On-Chain Proof", active: (arch.on_chain_proof ?? "").includes("when"), icon: "⛓️", desc: "Base optional" },
            ].map(({ label, active, icon, desc }) => (
              <div key={label} className="bg-white rounded-3xl border border-gray-100 p-6 text-center" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                <p className="text-3xl mb-3">{icon}</p>
                <p className="font-bold text-sm text-[#0A0A0A] mb-1">{label}</p>
                <p className="text-xs text-gray-400 mb-3">{desc}</p>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
                  {active ? "✓ Active" : "○ Optional"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Report Hashes ── */}
        <section>
          <SectionLabel label="Cryptographic Proof" />
          <h2 className="text-2xl font-bold mb-8">Report Hashes & Verify URLs</h2>
          <div className="bg-white rounded-3xl border border-gray-100 p-8" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
            {reportHashes.length === 0 ? (
              <p className="text-sm text-gray-400 font-mono text-center py-6">
                No report hashes yet — run real evaluations to generate
              </p>
            ) : (
              <div className="space-y-0">
                {reportHashes.map((hash, i) => {
                  const vUrl = verifyUrls[i] ?? `/api/verify/${hash}`;
                  return (
                    <div key={hash} className={`flex items-center justify-between py-4 gap-4 ${i < reportHashes.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <p className="font-mono text-xs text-gray-500 truncate flex-1">{hash}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <CopyButton text={hash} />
                        <VerifyButton hash={hash} verifyUrl={vUrl} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-6 pt-6 border-t border-gray-50">
              <p className="text-xs text-gray-400 font-mono">
                Verify endpoint: <span className="text-gray-600">{API_URL}/api/verify/:report_hash</span>
              </p>
            </div>
          </div>
        </section>

        {/* ── SLA Guard Examples ── */}
        {slaGuardExamples.length > 0 && (
          <section>
            <SectionLabel label="SLA-Gated Routing" />
            <h2 className="text-2xl font-bold mb-8">Routing Gate Examples</h2>
            <div className="space-y-4">
              {slaGuardExamples.map((ex: any, i: number) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 p-8" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between mb-6">
                    <p className="font-mono text-xs text-gray-400">{ex.job_id}</p>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${ex.winner_passed_gate ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                      Winner: {ex.winner_passed_gate ? "PASSED" : "BLOCKED"}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(ex.blocked_agents ?? []).map((a: any, j: number) => (
                      <div key={j} className="flex items-start gap-3 bg-red-50 rounded-2xl p-4">
                        <span className="text-base flex-shrink-0">🚦</span>
                        <div>
                          <p className="text-sm font-bold text-red-700">{a.agent_name} — BLOCKED</p>
                          <p className="text-xs text-red-500 font-mono mt-1">{(a.reasons ?? []).join(", ")}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Consensus Examples ── */}
        {consensusExamples.length > 0 && (
          <section>
            <SectionLabel label="Consensus Scoring" />
            <h2 className="text-2xl font-bold mb-8">Agreement Scoring Examples</h2>
            <div className="space-y-4">
              {consensusExamples.map((ex: any, i: number) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 p-8" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <p className="font-mono text-xs text-gray-400">{ex.job_id}</p>
                    <span className={`text-2xl font-bold ${ex.agreement_score >= 70 ? "text-green-600" : ex.agreement_score >= 40 ? "text-amber-600" : "text-red-600"}`}>
                      {ex.agreement_score}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
                    <div
                      className={`h-2 rounded-full transition-all ${ex.agreement_score >= 70 ? "bg-green-500" : ex.agreement_score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                      style={{ width: `${ex.agreement_score}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">{ex.summary}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Cross-Validation Examples ── */}
        {crossValExamples.length > 0 && (
          <section>
            <SectionLabel label="Level 4 A2A" />
            <h2 className="text-2xl font-bold mb-8">Cross-Validation Examples</h2>
            <div className="space-y-4">
              {crossValExamples.map((ex: any, i: number) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 p-8" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#0A0A0A]">Validator: {ex.validator}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1">{ex.job_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-bold text-[#A3FF12]">{ex.validation_score}</p>
                      <p className="text-xs text-gray-400">/100</p>
                    </div>
                  </div>
                  {ex.summary && <p className="text-xs text-gray-500 mt-4">{ex.summary}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Latest Jobs ── */}
        {latestJobs.length > 0 && (
          <section>
            <SectionLabel label="Recent Activity" />
            <h2 className="text-2xl font-bold mb-8">Latest Completed Jobs</h2>
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Job ID</th>
                    <th className="text-left px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Winner</th>
                    <th className="text-center px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg Score</th>
                    <th className="text-center px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">SLA Gate</th>
                    <th className="text-center px-8 py-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consensus</th>
                  </tr>
                </thead>
                <tbody>
                  {latestJobs.map((job, i) => (
                    <tr key={job.job_id} className={`hover:bg-gray-50 transition-colors ${i < latestJobs.length - 1 ? "border-b border-gray-50" : ""}`}>
                      <td className="px-8 py-4 font-mono text-xs text-gray-500">
                        <a href={`/jobs/${job.job_id}`} className="hover:text-[#0A0A0A] transition-colors">
                          {job.job_id.slice(0, 16)}…
                        </a>
                      </td>
                      <td className="px-8 py-4 font-mono text-xs text-gray-600">
                        {job.winner === "none" ? "—" : job.winner.slice(0, 16) + "…"}
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="font-bold text-[#0A0A0A]">{job.avg_score}</span>
                        <span className="text-gray-400 text-xs">/100</span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${job.sla_gate_passed ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                          {job.sla_gate_passed ? "✓" : "✗"}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-center">
                        <span className="text-xs font-mono text-gray-600">{job.consensus_score}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── On-Chain Anchor ── */}
        {onChainExamples.length > 0 && (
          <section>
            <SectionLabel label="On-Chain" />
            <h2 className="text-2xl font-bold mb-8">Base Chain Anchors</h2>
            <div className="space-y-4">
              {onChainExamples.map((ex: any, i: number) => (
                <div key={i} className="bg-white rounded-3xl border border-gray-100 p-8 flex items-center justify-between gap-4" style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-xs text-gray-400 mb-1">{ex.job_id}</p>
                    <p className="font-mono text-xs text-gray-700 truncate">{ex.tx_hash}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{ex.chain}</p>
                    <p className="font-mono text-xs text-gray-600">Block #{ex.block_number}</p>
                    <a href={`https://basescan.org/tx/${ex.tx_hash}`} target="_blank" rel="noopener noreferrer"
                      className="text-xs font-bold text-[#A3FF12] hover:opacity-70 transition-opacity">
                      BaseScan →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#0A0A0A] text-white py-16 px-8 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-12">
            <div>
              <p className="text-[#A3FF12] text-[10px] font-bold uppercase tracking-widest mb-2">CROO Agent Hackathon</p>
              <h2 className="text-3xl font-bold mb-3">CAPGuard TrustRouter</h2>
              <p className="text-gray-500 max-w-md text-sm">
                One order. Four levels. One verified result.
              </p>
            </div>
            <div className="mt-8 md:mt-0">
              <a
                href="https://agent.croo.network/agents/413395a1-dadd-4775-a3a6-f193c10bac98"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#A3FF12] text-black font-bold px-8 py-4 rounded-full flex items-center gap-2 hover:opacity-90 transition-opacity text-sm"
              >
                View on Agent Store <span className="text-lg">→</span>
              </a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-800 pt-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#A3FF12] rounded-full" />
              <span className="font-bold text-lg">CROO</span>
            </div>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mt-4 md:mt-0">
              Track: Data &amp; Verification + Open A2A · MIT License · Built on Base · 2026
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
