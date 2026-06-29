import type { DashboardStats } from "@/lib/api";

interface StatsGridProps {
  stats: DashboardStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section className="flex flex-col md:flex-row justify-between items-start mb-16">
      {/* Left: Title & Description */}
      <div className="max-w-2xl">
        <div className="section-label">
          <span className="section-label-text">Trust Dashboard</span>
        </div>
        <h1 className="text-5xl font-bold mb-4 text-brand-dark">CAPGuard TrustRouter</h1>
        <p className="text-brand-muted text-lg leading-relaxed mb-6">
          Evaluates candidate agents through real A2A CAP orders and returns verifiable trust reports with routing recommendations.
        </p>
      </div>

      {/* Right: Key Stats */}
      <div className="flex flex-col items-end gap-4 mt-8 md:mt-0">
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold text-text-light uppercase tracking-widest mb-1">
            CAP Transactions
          </span>
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-brand-lime rounded-full status-dot-glow"></div>
            <span className="text-6xl font-bold text-brand-dark">{stats.total_cap_transactions}</span>
          </div>
        </div>
        <div className="flex gap-12 mt-2 text-right">
          <div>
            <span className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1">
              Completed Jobs
            </span>
            <span className="text-2xl font-bold text-brand-dark">{stats.completed_jobs}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-text-light uppercase tracking-widest block mb-1">
              Avg Score
            </span>
            <span className="text-2xl font-bold text-brand-dark">{stats.average_trust_score}<span className="text-base text-text-light">/100</span></span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StatsCards({ stats }: StatsGridProps) {
  const cards = [
    { label: "Unique Counterparties", value: stats.unique_counterparties },
    { label: "Buyer Wallets", value: stats.unique_buyer_wallets },
    { label: "Sub-Orders", value: stats.total_sub_orders },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
      {cards.map((card) => (
        <div key={card.label} className="croo-card p-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] text-text-light font-bold uppercase tracking-widest mb-2">
                {card.label}
              </p>
              <p className="text-3xl font-bold text-brand-dark">{card.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
