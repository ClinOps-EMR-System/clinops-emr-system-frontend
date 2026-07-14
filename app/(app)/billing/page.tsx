"use client";

export default function BillingPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      <div>
        <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Billing</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Billing & Accounts</h1>
        <p className="text-sm text-[#5f5e5e] mt-1">Manage patient bills, payments, and waivers.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded border border-[#becab7]/50 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Recent Bills</h2>
          <div className="p-8 text-center text-sm text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21v-6m-6 6v-6m-6 6V9m0 0l-6 6m6-6V3" />
            </svg>
            No bills recorded today.
          </div>
        </div>
        <div className="bg-white rounded border border-amber-200 p-6">
          <h2 className="text-sm font-bold text-amber-800 mb-4">Pending Waivers</h2>
          <div className="p-8 text-center text-sm text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            No waiver requests.
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Payments</h2>
          <div className="p-8 text-center text-sm text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            No payments recorded today.
          </div>
        </div>
      </div>
    </div>
  );
}
