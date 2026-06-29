"use client";

import { useState } from "react";

export function TriggerPanel() {
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleTrigger = async () => {
    if (!intent.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${API_URL}/api/jobs/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent, buyer_wallet: "dashboard_user" }),
      });

      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      const data = await res.json();
      setResult(data);
      setIntent("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      setError(e.message || "Failed to trigger job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="croo-card p-8 mb-16">
      <div className="section-label mb-2">
        <span className="section-label-text">Evaluate</span>
      </div>
      <h2 className="text-2xl font-bold text-brand-dark mb-2">Trigger Trust Evaluation</h2>
      <p className="text-brand-muted text-sm mb-6">
        Send a buyer intent to evaluate candidate agents via CAP sub-orders.
      </p>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </span>
          <input
            type="text"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTrigger()}
            placeholder="e.g., Research the top 5 DeFi protocols by TVL..."
            className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-full focus:ring-2 focus:ring-brand-lime focus:border-brand-lime outline-none text-sm"
            disabled={loading}
            id="trigger-intent-input"
          />
        </div>
        <button
          onClick={handleTrigger}
          disabled={loading || !intent.trim()}
          className="btn-lime px-8 py-4 text-sm flex items-center gap-2"
          id="trigger-job-button"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeLinecap="round" />
              </svg>
              Evaluating...
            </>
          ) : (
            <>Evaluate <span className="text-lg">→</span></>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-status-red-bg border border-red-200 text-xs text-status-red font-medium">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 px-4 py-3 rounded-xl bg-status-green-bg border border-green-200">
          <div className="text-xs text-status-green font-bold uppercase tracking-wider mb-1">
            ✓ Evaluation Complete
          </div>
          <div className="text-sm text-text-secondary">
            Recommended: <span className="font-mono font-bold">{result.recommended_service_id}</span>
            {" · "}Score: <span className="font-bold">{result.average_score}/100</span>
          </div>
        </div>
      )}
    </div>
  );
}
