import { getJob } from "@/lib/api";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

function StatusBadge({ status }: { status: string }) {
  const cls = status === "completed" ? "badge-completed" : status === "in_progress" ? "badge-in-progress" : status === "pending" ? "badge-pending" : "badge-failed";
  return <span className={`badge ${cls}`}>{status === "completed" && "✓ "}{status.replace("_", " ")}</span>;
}

function CheckIcon({ checked }: { checked: boolean }) {
  return checked
    ? <span className="check-pass">✓</span>
    : <span className="check-fail">✗</span>;
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  const report = job.trust_report;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-sm text-brand-muted hover:text-brand-dark transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
          Dashboard
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-sm text-brand-dark font-semibold truncate max-w-md">{job.buyer_intent.slice(0, 60)}...</span>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Job Overview */}
        <section className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="flex-1 min-w-0">
              <div className="section-label mb-2">
                <span className="section-label-text">Trust Evaluation</span>
              </div>
              <h1 className="text-3xl font-bold text-brand-dark mb-4">{job.buyer_intent}</h1>
              <div className="flex items-center gap-3 mb-4">
                <StatusBadge status={job.status} />
                <span className="text-[10px] text-text-light font-mono">{job.id}</span>
              </div>
              <div className="flex flex-wrap gap-6 text-xs text-brand-muted">
                <span>Buyer: <span className="font-mono font-semibold text-brand-dark">{job.buyer_wallet?.slice(0, 10)}...{job.buyer_wallet?.slice(-6)}</span></span>
                <span>Order: <span className="font-mono font-semibold text-brand-dark">{job.order_id?.slice(0, 16)}...</span></span>
                <span>Created: <span className="font-semibold text-brand-dark">{formatTimestamp(job.created_at)}</span></span>
              </div>
            </div>
            {report && (
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1">Avg Score</span>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 bg-brand-lime rounded-full status-dot-glow"></div>
                  <span className="text-5xl font-bold text-brand-dark">{report.average_score}</span>
                  <span className="text-lg text-text-light">/100</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recommendation */}
        {report && (
          <section className="croo-card p-8 mb-12 border-l-4 border-l-brand-lime">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-lime/20 flex items-center justify-center flex-shrink-0">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#A3FF12" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-bold text-brand-lime uppercase tracking-widest mb-1">Routing Recommendation</h3>
                <p className="text-xl font-bold text-brand-dark mb-1">{report.recommended_service_id}</p>
                <p className="text-sm text-brand-muted">{report.recommended_reason}</p>
              </div>
            </div>
          </section>
        )}

        {/* Candidate Agents */}
        {report && (
          <section className="mb-12">
            <div className="section-label section-label-muted mb-2">
              <span className="section-label-text">Candidates</span>
            </div>
            <h2 className="text-2xl font-bold text-brand-dark mb-6">Agent Comparison</h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {report.candidate_agents.map((c, i) => {
                const isRecommended = c.service_id === report.recommended_service_id;
                const scoreColor = c.score >= 75 ? "text-status-green" : c.score >= 50 ? "text-status-amber" : "text-status-red";
                return (
                  <div key={i} className={`croo-card p-6 relative ${isRecommended ? "border-brand-lime" : ""}`}>
                    {isRecommended && (
                      <div className="absolute -top-2.5 right-4 px-3 py-0.5 rounded-full bg-brand-lime text-[10px] font-bold text-brand-dark uppercase tracking-wider">
                        Recommended
                      </div>
                    )}
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-lg font-bold text-brand-dark">{c.agent_name}</h3>
                        <p className="text-[10px] text-text-light font-mono">{c.service_id}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-3xl font-bold tabular-nums ${scoreColor}`}>{c.score}</span>
                        <span className="text-xs text-text-light">/100</span>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {[
                        { label: "Schema Valid", value: c.schema_valid },
                        { label: "Proof Present", value: c.proof_present },
                        { label: "Sources", value: c.sources_present },
                        { label: "SLA Passed", value: c.sla_passed },
                        { label: "Consistent", value: c.delivery_consistency },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-brand-muted">{label}</span>
                          <CheckIcon checked={value} />
                        </div>
                      ))}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-brand-muted">Latency</span>
                        <span className="text-xs font-mono font-semibold text-brand-dark">{(c.latency_ms / 1000).toFixed(1)}s</span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border-default">
                      <StatusBadge status={c.status} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Proof Hashes */}
        {report && (
          <section className="mb-12">
            <div className="section-label section-label-muted mb-2">
              <span className="section-label-text">Verification</span>
            </div>
            <h2 className="text-2xl font-bold text-brand-dark mb-6">Verifiable Proofs</h2>
            <div className="croo-card p-8 space-y-6">
              <div>
                <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Report Hash (SHA-256)</p>
                <div className="code-block">{report.report_hash}</div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Execution Log Hash (SHA-256)</p>
                <div className="code-block">{report.execution_log_hash}</div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Report ID</p>
                  <div className="code-block">{report.report_id}</div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-2">Generated At</p>
                  <div className="code-block">{report.generated_at}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Event Timeline */}
        {job.event_log && job.event_log.length > 0 && (
          <section className="mb-12">
            <div className="section-label section-label-muted mb-2">
              <span className="section-label-text">Activity</span>
            </div>
            <h2 className="text-2xl font-bold text-brand-dark mb-6">
              Event Timeline <span className="text-sm text-text-light font-normal">({job.event_log.length} events)</span>
            </h2>
            <div className="croo-card overflow-hidden">
              <div className="divide-y divide-gray-50">
                {job.event_log.map((evt, i) => {
                  const badgeCls =
                    evt.event.includes("Completed") || evt.event.includes("Delivered") ? "badge-completed" :
                    evt.event.includes("Failed") ? "badge-failed" :
                    evt.event.includes("Paid") ? "badge-pending" :
                    "badge-in-progress";

                  return (
                    <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4 min-w-0">
                        <span className={`badge ${badgeCls}`}>{evt.event}</span>
                        <span className="text-xs text-brand-muted font-mono truncate">{evt.actor}</span>
                        {evt.target && (
                          <span className="text-xs text-text-light">→ <span className="font-mono">{evt.target}</span></span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {evt.details && (
                          <span className="text-[10px] text-text-light max-w-xs truncate hidden lg:inline">{evt.details}</span>
                        )}
                        <span className="text-[10px] text-text-light font-mono">{formatTimestamp(evt.timestamp)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Raw Report */}
        {report && (
          <section className="mb-12">
            <div className="section-label section-label-muted mb-2">
              <span className="section-label-text">Raw Data</span>
            </div>
            <h2 className="text-2xl font-bold text-brand-dark mb-6">Trust Report JSON</h2>
            <div className="code-block max-h-[400px] overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(report, null, 2)}</pre>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
