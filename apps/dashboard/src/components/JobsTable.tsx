import Link from "next/link";
import type { DashboardJob } from "@/lib/api";

interface JobsTableProps {
  jobs: DashboardJob[];
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "completed" ? "badge-completed" :
    status === "in_progress" ? "badge-in-progress" :
    status === "pending" ? "badge-pending" :
    "badge-failed";

  return (
    <span className={`badge ${cls}`}>
      {status === "completed" && "✓ "}
      {status.replace("_", " ")}
    </span>
  );
}

function ScoreIndicator({ score }: { score?: number }) {
  if (score == null) return <span className="text-text-light text-sm">—</span>;

  const color =
    score >= 75 ? "text-status-green" :
    score >= 50 ? "text-status-amber" :
    "text-status-red";

  const barClass =
    score >= 75 ? "score-high" :
    score >= 50 ? "score-medium" :
    "score-low";

  return (
    <div className="flex items-center gap-3 min-w-[100px]">
      <span className={`text-sm font-bold tabular-nums ${color}`}>{score}</span>
      <div className="flex-1 score-bar">
        <div className={`score-bar-fill ${barClass}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function JobsTable({ jobs }: JobsTableProps) {
  if (jobs.length === 0) {
    return (
      <div className="croo-card p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-brand-dark mb-2">No Jobs Yet</h3>
        <p className="text-sm text-brand-muted max-w-md mx-auto">
          Trigger a trust evaluation above, or seed sample data:
          <code className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">npm run seed</code>
        </p>
      </div>
    );
  }

  return (
    <div className="croo-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default">
              <th className="text-left px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest">Intent</th>
              <th className="text-left px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest">Status</th>
              <th className="text-left px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest">Candidates</th>
              <th className="text-left px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest">Top Score</th>
              <th className="text-left px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest">Recommended</th>
              <th className="text-left px-6 py-4 text-[10px] font-bold text-text-light uppercase tracking-widest">Time</th>
              <th className="text-right px-6 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job.id}
                className="border-b border-gray-50 hover:bg-gray-50 transition-colors group"
              >
                <td className="px-6 py-4">
                  <div className="max-w-xs truncate text-sm font-semibold text-brand-dark">
                    {job.buyer_intent}
                  </div>
                  <div className="text-[10px] text-text-light font-mono mt-0.5">
                    {job.id.slice(0, 20)}...
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-brand-dark">{job.completed_candidates}</span>
                  <span className="text-text-light text-sm"> / {job.total_candidates}</span>
                </td>
                <td className="px-6 py-4">
                  <ScoreIndicator score={job.top_score} />
                </td>
                <td className="px-6 py-4">
                  {job.recommended_agent ? (
                    <span className="text-xs font-mono font-bold text-brand-dark">
                      {job.recommended_agent.replace("svc_", "")}
                    </span>
                  ) : (
                    <span className="text-text-light text-sm">—</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs text-text-light">{formatTime(job.created_at)}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="inline-flex items-center gap-1 text-brand-lime text-[10px] font-bold hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
