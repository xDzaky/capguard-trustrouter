import { getStats, getJobs } from "@/lib/api";
import { StatsGrid, StatsCards } from "@/components/StatsGrid";
import { JobsTable } from "@/components/JobsTable";
import { Header } from "@/components/Header";
import { TriggerPanel } from "@/components/TriggerPanel";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, jobs] = await Promise.all([getStats(), getJobs()]);

  return (
    <div className="min-h-screen bg-white">
      <Header activePage="dashboard" contextLabel="TRUSTROUTER" />

      <main className="max-w-7xl mx-auto px-8 py-12">
        {/* Hero Stats */}
        <StatsGrid stats={stats} />

        {/* Secondary Stats Cards */}
        <StatsCards stats={stats} />

        {/* Trigger Panel */}
        <TriggerPanel />

        {/* Jobs Table */}
        <section className="mb-20">
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="section-label section-label-muted">
                <span className="section-label-text">Trust Jobs</span>
              </div>
              <h2 className="text-2xl font-bold text-brand-dark">Evaluation History</h2>
            </div>
            <span className="text-xs text-text-light font-mono">
              {jobs.length} total · {jobs.filter(j => j.status === "completed").length} completed
            </span>
          </div>
          <JobsTable jobs={jobs} />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-brand-dark text-white py-16 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center mb-16">
            <div>
              <p className="text-brand-lime text-[10px] font-bold uppercase tracking-widest mb-2">
                CROO Agent Hackathon
              </p>
              <h2 className="text-3xl font-bold mb-3">CAPGuard TrustRouter</h2>
              <p className="text-gray-500 max-w-md text-sm">
                The first paid CAP-native trust-and-routing agent. One order, many agents, one verified result.
              </p>
            </div>
            <div className="mt-8 md:mt-0">
              <a
                href="https://agent.croo.network"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lime px-8 py-4 text-sm inline-flex items-center gap-2"
              >
                View on Agent Store <span className="text-lg">→</span>
              </a>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center border-t border-gray-800 pt-8">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-brand-lime rounded-full"></div>
              <span className="font-bold text-lg">CROO</span>
            </div>
            <div className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.3em] mt-4 md:mt-0">
              Track: Data & Verification + Open A2A · MIT License · Built on Base - 2026
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
