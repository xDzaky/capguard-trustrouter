"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EvidenceData {
  generated_at: string;
  mode: "STRICT_CAP" | "DEMO" | "DEFAULT";
  evidence_status: "ready" | "incomplete";
  missing_requirements: string[];
  live_requirements: {
    has_agent_listings: boolean;
    has_10_orders: boolean;
    has_3_counterparties: boolean;
    has_5_buyers: boolean;
    has_report_hashes: boolean;
    has_verify_urls: boolean;
  };
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
  report_hashes: string[];
  verify_urls: string[];
  sla_guard_examples: any[];
  cross_validation_examples: any[];
  consensus_examples: any[];
  on_chain_anchor_examples: any[];
  latest_jobs: {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_PROVIDER_URL || "http://localhost:3001";

function ModeBadge({ mode }: { mode: string }) {
  const styles: Record<string, string> = {
    STRICT_CAP: "bg-black text-[#A3FF12] border border-[#A3FF12]",
    DEMO: "bg-amber-50 text-amber-700 border border-amber-200",
    DEFAULT: "bg-gray-50 text-gray-600 border border-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-widest ${styles[mode] ?? styles.DEFAULT}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
      {mode}
    </span>
  );
}

function RequirementRow({ label, met }: { label: string; met: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${met ? "bg-green-100 text-green-600" : "bg-red-50 text-red-500"}`}>
        {met ? "✓" : "✗"}
      </span>
      <span className={`text-sm ${met ? "text-gray-700" : "text-red-600"}`}>{label}</span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      id={`copy-${text.slice(0, 12)}`}
      className="px-2 py-1 text-xs font-mono bg-gray-100 hover:bg-[#A3FF12] hover:text-black rounded transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function HashRow({ hash, verifyUrl }: { hash: string; verifyUrl: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 gap-4">
      <span className="font-mono text-xs text-gray-600 truncate">{hash.slice(0, 24)}…</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <CopyButton text={hash} />
        <a
          href={`${API_URL}${verifyUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 text-xs bg-[#A3FF12] text-black font-bold rounded hover:bg-[#8AE600] transition-colors"
        >
          Verify →
        </a>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <p className="text-xs text-gray-400 font-mono uppercase tracking-widest mb-2">{label}</p>
      <p className="text-3xl font-black text-[#0A0A0A]">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EvidencePage() {
  const [data, setData] = useState<EvidenceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/evidence`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
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
          <div className="text-4xl mb-4">⚠️</div>
          <p className="font-bold text-[#0A0A0A] mb-2">Provider API not reachable</p>
          <p className="text-sm text-gray-400 font-mono mb-4">{error}</p>
          <p className="text-xs text-gray-400">Run <code className="bg-gray-100 px-1 rounded">npm run dev:provider</code> first</p>
        </div>
      </div>
    );
  }

  const lr = data.live_requirements;

  return (
    <div className="min-h-screen bg-white">
      {/* ── Header ── */}
      <div className="bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <a href="/" className="text-gray-500 text-xs font-mono hover:text-[#A3FF12] transition-colors">← Dashboard</a>
              <h1 className="text-3xl font-black mt-2">Evidence Pack</h1>
              <p className="text-gray-400 text-sm mt-1">
                Live proof for judges · Updated {new Date(data.generated_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ModeBadge mode={data.mode} />
              {data.evidence_status === "ready" ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-900 text-green-300 border border-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> READY
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-900 text-amber-300 border border-amber-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> INCOMPLETE
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12 space-y-12">

        {/* ── Incomplete Warning ── */}
        {data.evidence_status === "incomplete" && data.missing_requirements.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🚨</span>
              <div>
                <p className="font-bold text-red-700 mb-2">Evidence Incomplete — Do NOT claim final metrics</p>
                <p className="text-sm text-red-600 mb-4">Generate real CROO orders before submission. Missing requirements:</p>
                <ul className="space-y-1">
                  {data.missing_requirements.map((req, i) => (
                    <li key={i} className="text-sm text-red-600 flex items-start gap-2">
                      <span className="text-red-400 mt-0.5">•</span> {req}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── Live Requirements Checklist ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-0.5 bg-[#A3FF12]" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Anti-Sybil Compliance</p>
          </div>
          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Live Requirements</h2>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <RequirementRow label="Agent Store listings (CAPGuard + 3 candidates)" met={lr.has_agent_listings} />
            <RequirementRow label="10+ completed evaluation jobs" met={lr.has_10_orders} />
            <RequirementRow label="3+ unique counterparty agents" met={lr.has_3_counterparties} />
            <RequirementRow label="5+ unique buyer wallets" met={lr.has_5_buyers} />
            <RequirementRow label="Report hashes available" met={lr.has_report_hashes} />
            <RequirementRow label="Verify URLs publicly accessible" met={lr.has_verify_urls} />
          </div>
        </section>

        {/* ── Stats Grid ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-0.5 bg-[#A3FF12]" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">CAP Activity</p>
          </div>
          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Real Order Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Jobs" value={data.stats.total_jobs} />
            <StatCard label="Completed Jobs" value={data.stats.completed_jobs} />
            <StatCard label="CAP Transactions" value={data.stats.total_cap_transactions} />
            <StatCard label="Avg Trust Score" value={`${data.stats.average_trust_score}/100`} />
            <StatCard label="Sub-Orders" value={data.stats.total_sub_orders} />
            <StatCard label="Unique Buyers" value={data.stats.unique_buyer_wallets} sub="min 5 required" />
            <StatCard label="Counterparties" value={data.stats.unique_counterparties} sub="min 3 required" />
            <StatCard label="A2A Depth" value={`${data.architecture.a2a_depth} Levels`} />
          </div>
        </section>

        {/* ── Agent Store Listings ── */}
        {Object.keys(data.agent_store_listings).length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-0.5 bg-[#A3FF12]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Agent Store</p>
            </div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Live Listings</h2>
            <div className="bg-white border border-gray-100 rounded-2xl p-6 space-y-3">
              {Object.entries(data.agent_store_listings).map(([name, url]) => (
                <div key={name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="font-mono text-sm text-gray-700 capitalize">{name}</span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-[#A3FF12] font-mono underline transition-colors"
                  >
                    {url.replace("https://", "")}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Architecture ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-0.5 bg-[#A3FF12]" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Architecture</p>
          </div>
          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">4-Level A2A Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "SLA-Gated Routing", active: data.architecture.sla_gated_routing, icon: "🚦" },
              { label: "Consensus Scoring", active: data.architecture.consensus_scoring, icon: "🤝" },
              { label: "Cross-Validation", active: data.architecture.cross_validation, icon: "🔄" },
              { label: "On-Chain Proof", active: data.architecture.on_chain_proof.includes("when"), icon: "⛓️" },
            ].map(({ label, active, icon }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5 text-center">
                <p className="text-2xl mb-2">{icon}</p>
                <p className="font-bold text-sm text-[#0A0A0A] mb-1">{label}</p>
                <span className={`text-xs font-mono ${active ? "text-green-600" : "text-amber-500"}`}>
                  {active ? "✓ Active" : "○ Optional"}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Report Hashes ── */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-4 h-0.5 bg-[#A3FF12]" />
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cryptographic Proof</p>
          </div>
          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Report Hashes & Verify URLs</h2>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            {data.report_hashes.length === 0 ? (
              <p className="text-sm text-gray-400 font-mono text-center py-4">
                No report hashes yet — run real evaluations to generate
              </p>
            ) : (
              data.report_hashes.map((hash, i) => (
                <HashRow key={hash} hash={hash} verifyUrl={data.verify_urls[i] ?? `/api/verify/${hash}`} />
              ))
            )}
          </div>
        </section>

        {/* ── SLA Guard Examples ── */}
        {data.sla_guard_examples.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-0.5 bg-[#A3FF12]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">SLA-Gated Routing</p>
            </div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Routing Gate Examples</h2>
            <div className="space-y-4">
              {data.sla_guard_examples.map((ex: any, i: number) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs text-gray-400">{ex.job_id}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${ex.winner_passed_gate ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
                        Winner: {ex.winner_passed_gate ? "PASSED" : "BLOCKED"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {ex.blocked_agents?.map((a: any, j: number) => (
                      <div key={j} className="flex items-start gap-3 bg-red-50 rounded-xl p-3">
                        <span className="text-red-500 text-sm flex-shrink-0">🚦</span>
                        <div>
                          <p className="text-sm font-bold text-red-700">{a.agent_name} — BLOCKED</p>
                          <p className="text-xs text-red-500 font-mono mt-0.5">{a.reasons.join(", ")}</p>
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
        {data.consensus_examples.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-0.5 bg-[#A3FF12]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Consensus Scoring</p>
            </div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Agreement Scoring Examples</h2>
            <div className="space-y-4">
              {data.consensus_examples.map((ex: any, i: number) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-xs text-gray-400">{ex.job_id}</span>
                    <span className={`text-lg font-black ${ex.agreement_score >= 70 ? "text-green-600" : ex.agreement_score >= 40 ? "text-amber-600" : "text-red-600"}`}>
                      {ex.agreement_score}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                    <div
                      className={`h-2 rounded-full ${ex.agreement_score >= 70 ? "bg-green-500" : ex.agreement_score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
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
        {data.cross_validation_examples.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-0.5 bg-[#A3FF12]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Level 4 A2A</p>
            </div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Cross-Validation Examples</h2>
            <div className="space-y-4">
              {data.cross_validation_examples.map((ex: any, i: number) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-[#0A0A0A]">Validator: {ex.validator}</p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5">{ex.job_id}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-[#A3FF12]">{ex.validation_score}</p>
                      <p className="text-xs text-gray-400">/100</p>
                    </div>
                  </div>
                  {ex.summary && <p className="text-xs text-gray-500 mt-3">{ex.summary}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Latest Jobs ── */}
        {data.latest_jobs.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-0.5 bg-[#A3FF12]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Activity</p>
            </div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Latest Completed Jobs</h2>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Job ID</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Winner</th>
                    <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Avg Score</th>
                    <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">SLA Gate</th>
                    <th className="text-center px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Consensus</th>
                  </tr>
                </thead>
                <tbody>
                  {data.latest_jobs.map((job) => (
                    <tr key={job.job_id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">
                        <a href={`/jobs/${job.job_id}`} className="hover:text-[#0A0A0A] transition-colors">
                          {job.job_id.slice(0, 16)}…
                        </a>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">
                        {job.winner === "none" ? "—" : job.winner.slice(0, 16) + "…"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-[#0A0A0A]">{job.avg_score}</span>
                        <span className="text-gray-400 text-xs">/100</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-xs font-bold ${job.sla_gate_passed ? "text-green-600" : "text-red-500"}`}>
                          {job.sla_gate_passed ? "✓" : "✗"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
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
        {data.on_chain_anchor_examples.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-0.5 bg-[#A3FF12]" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">On-Chain</p>
            </div>
            <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">Base Chain Anchors</h2>
            <div className="space-y-3">
              {data.on_chain_anchor_examples.map((ex: any, i: number) => (
                <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-mono text-xs text-gray-400 mb-1">{ex.job_id}</p>
                    <p className="font-mono text-xs text-gray-700 truncate">{ex.tx_hash}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">{ex.chain}</p>
                    <p className="font-mono text-xs text-gray-600">Block #{ex.block_number}</p>
                    <a
                      href={`https://basescan.org/tx/${ex.tx_hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:text-[#A3FF12] transition-colors"
                    >
                      BaseScan →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Footer note ── */}
        <div className="text-center pb-12">
          <p className="text-xs text-gray-300 font-mono">
            CAPGuard TrustRouter · Evidence Pack · Built for CROO Agent Hackathon 2026
          </p>
          <p className="text-xs text-gray-300 font-mono mt-1">
            Verify any report: <code className="bg-gray-100 text-gray-500 px-1 rounded">{API_URL}/api/verify/:report_hash</code>
          </p>
        </div>

      </div>
    </div>
  );
}
