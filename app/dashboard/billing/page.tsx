'use client'

export default function BillingPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-core-text">Billing</h1>
        <p className="text-sm text-core-text-dim mt-1">Track your usage and manage your subscription.</p>
      </div>

      {/* Current Plan */}
      <div className="bg-core-card border border-core-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-core-text">Current Plan</h2>
          <span className="text-xs bg-core-green/10 text-core-green px-3 py-1 rounded-full font-medium">
            Pay-per-run
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-core-bg border border-core-border rounded-lg p-4">
            <div className="text-sm text-core-text-dim mb-1">Price per run</div>
            <div className="text-2xl font-bold text-core-green">$0.01</div>
          </div>
          <div className="bg-core-bg border border-core-border rounded-lg p-4">
            <div className="text-sm text-core-text-dim mb-1">This month</div>
            <div className="text-2xl font-bold text-core-text">0 runs</div>
          </div>
          <div className="bg-core-bg border border-core-border rounded-lg p-4">
            <div className="text-sm text-core-text-dim mb-1">Amount due</div>
            <div className="text-2xl font-bold text-core-text">$0.00</div>
          </div>
        </div>
      </div>

      {/* Usage History */}
      <div className="bg-core-card border border-core-border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-core-text mb-4">Usage History</h2>
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-core-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p className="text-core-text-dim text-sm">No usage data yet. Run a workflow to see billing activity.</p>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-core-card border border-core-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-core-text">Payment Method</h2>
            <p className="text-sm text-core-text-dim mt-1">No payment method on file.</p>
          </div>
          <button className="text-sm font-medium text-core-green hover:underline">
            Add Card
          </button>
        </div>
      </div>
    </div>
  )
}
