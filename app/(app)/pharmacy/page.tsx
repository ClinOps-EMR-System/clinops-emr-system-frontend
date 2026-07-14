"use client";

export default function PharmacyPage() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      <div>
        <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Pharmacy</span>
        <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Pharmacy Workstation</h1>
        <p className="text-sm text-[#5f5e5e] mt-1">Review, verify, and dispense medications.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded border border-[#becab7]/50 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Pending Verification</h2>
          <div className="p-8 text-center text-sm text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            No prescriptions pending verification.
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Dispensed Today</h2>
          <div className="p-8 text-center text-sm text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            No medications dispensed today.
          </div>
        </div>
        <div className="bg-white rounded border border-rose-200 p-6">
          <h2 className="text-sm font-bold text-rose-800 mb-4">Drug Alerts</h2>
          <div className="p-8 text-center text-sm text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01" />
            </svg>
            No drug interaction or allergy alerts.
          </div>
        </div>
      </div>
    </div>
  );
}
