"use client";

import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { useFetch } from "../../../lib/useFetch";
import StatusBadge from "../../../components/ui/StatusBadge";

interface DashboardData {
  total_patients?: number;
  pending_triage?: number;
  in_consultation?: number;
  emergency?: number;
  discharged_today?: number;
  registered_today?: number;
  recent_patients?: Array<{
    id: number;
    hospital_number: string;
    first_name: string;
    last_name: string;
    gender: string;
    patient_category: string;
    village: string;
    district: string;
    created_at: string;
    registration_completed_at: string | null;
  }>;
  pending_orders?: number;
  pending_prescriptions?: number;
  active_admissions?: number;
  pending_referrals?: number;
  unpaid_bills?: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: dashboard, loading, error } = useFetch<DashboardData>("/dashboard");

  const staffName = user?.name?.split(" ")[0] || "Staff";
  const userRoles = (user?.roles || []).map((r) => r.toLowerCase());
  const isAdmin = userRoles.includes("admin");

  const stats = {
    totalPatients: dashboard?.total_patients ?? 0,
    pendingTriage: dashboard?.pending_triage ?? 0,
    inConsultation: dashboard?.in_consultation ?? 0,
    emergency: dashboard?.emergency ?? 0,
    dischargedToday: dashboard?.discharged_today ?? 0,
    registeredToday: dashboard?.registered_today ?? 0,
    pendingOrders: dashboard?.pending_orders ?? 0,
    pendingPrescriptions: dashboard?.pending_prescriptions ?? 0,
    activeAdmissions: dashboard?.active_admissions ?? 0,
    pendingReferrals: dashboard?.pending_referrals ?? 0,
    unpaidBills: dashboard?.unpaid_bills ?? 0,
  };

  const recentPatients = dashboard?.recent_patients ?? [];

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans">
      {/* Welcome Section */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">
            Clinical Workspace
          </span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">
            Good morning, {staffName}
          </h1>
          <p className="text-sm text-[#5f5e5e] mt-1 font-mono">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <Link
            href="/patients/register"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all focus:outline-none cursor-pointer"
          >
            <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Register Patient
          </Link>
          <Link
            href="/patients/register?emergency=true"
            className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-bold rounded bg-amber-600 text-white hover:bg-amber-700 shadow-sm transition-all focus:outline-none cursor-pointer"
          >
            <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Emergency
          </Link>
        </div>
      </section>

      {/* Primary Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Total Patients</dt>
          <dd className="text-3xl font-extrabold text-[#1b1c1c] font-mono">
            {loading ? "..." : stats.totalPatients}
          </dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Registered Today</dt>
          <dd className="text-3xl font-extrabold text-[#1b1c1c] font-mono">
            {loading ? "..." : stats.registeredToday}
          </dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Pending Triage</dt>
          <dd className={`text-3xl font-extrabold font-mono ${stats.pendingTriage > 0 ? "text-amber-600" : "text-[#1b1c1c]"}`}>
            {loading ? "..." : stats.pendingTriage}
          </dd>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">Active Admissions</dt>
          <dd className="text-3xl font-extrabold text-[#1b1c1c] font-mono">
            {loading ? "..." : stats.activeAdmissions}
          </dd>
        </div>
      </section>

      {/* Operational Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/pharmacy" className="bg-white rounded border border-[#becab7]/50 p-5 hover:border-brand-green hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Pending Prescriptions</p>
              <p className={`text-2xl font-extrabold font-mono mt-1 ${stats.pendingPrescriptions > 0 ? "text-amber-600" : "text-[#1b1c1c]"}`}>
                {loading ? "..." : stats.pendingPrescriptions}
              </p>
            </div>
            <div className="h-10 w-10 rounded bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              <svg className="h-5 w-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/lab" className="bg-white rounded border border-[#becab7]/50 p-5 hover:border-brand-green hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Pending Lab Orders</p>
              <p className={`text-2xl font-extrabold font-mono mt-1 ${stats.pendingOrders > 0 ? "text-sky-600" : "text-[#1b1c1c]"}`}>
                {loading ? "..." : stats.pendingOrders}
              </p>
            </div>
            <div className="h-10 w-10 rounded bg-sky-100 flex items-center justify-center group-hover:bg-sky-200 transition-colors">
              <svg className="h-5 w-5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
          </div>
        </Link>

        <Link href="/billing" className="bg-white rounded border border-[#becab7]/50 p-5 hover:border-brand-green hover:shadow-sm transition-all group">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Unpaid Bills</p>
              <p className={`text-2xl font-extrabold font-mono mt-1 ${stats.unpaidBills > 0 ? "text-red-600" : "text-[#1b1c1c]"}`}>
                {loading ? "..." : stats.unpaidBills}
              </p>
            </div>
            <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </Link>
      </section>

      {/* Quick Actions - Role Based */}
      {isAdmin && (
        <section className="bg-white rounded border border-[#becab7]/50 p-6">
          <h2 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/pharmacy" className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-brand-green hover:bg-[#fcf9f8] transition-all">
              <div className="h-8 w-8 rounded bg-amber-100 flex items-center justify-center"><span className="text-amber-600 text-sm">Rx</span></div>
              <span className="text-sm font-bold text-gray-700">Pharmacy Queue</span>
            </Link>
            <Link href="/lab" className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-brand-green hover:bg-[#fcf9f8] transition-all">
              <div className="h-8 w-8 rounded bg-sky-100 flex items-center justify-center"><span className="text-sky-600 text-sm font-bold">Lab</span></div>
              <span className="text-sm font-bold text-gray-700">Lab Orders</span>
            </Link>
            <Link href="/billing" className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-brand-green hover:bg-[#fcf9f8] transition-all">
              <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center"><span className="text-emerald-600 text-sm font-bold">$</span></div>
              <span className="text-sm font-bold text-gray-700">Billing</span>
            </Link>
            <Link href="/admin" className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-brand-green hover:bg-[#fcf9f8] transition-all">
              <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center"><span className="text-purple-600 text-sm font-bold">Ad</span></div>
              <span className="text-sm font-bold text-gray-700">Administration</span>
            </Link>
          </div>
        </section>
      )}

      {/* Recent Activity Table Section */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">
            Recent Patient Registrations
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500 font-mono">
            Loading patient records from server...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">
            Error: {error}
          </div>
        ) : recentPatients.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            No patient registrations recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">
                    Patient Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">
                    Hospital Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">
                    Gender / Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">
                    Village / District
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">
                    Status / Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {recentPatients.map((patient) => {
                  const hasIncompleteReg = !patient.registration_completed_at;
                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-[#fcf9f8]/40 hover:border-l-4 hover:border-brand-green/80 transition-all divide-x divide-gray-100"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {patient.first_name} {patient.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-xs text-gray-500">
                        {patient.hospital_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {patient.gender} · {patient.patient_category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.village || "N/A"}, {patient.district || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-between gap-4">
                          {hasIncompleteReg ? (
                            <StatusBadge label="Emergency Draft" variant="warning" />
                          ) : (
                            <StatusBadge label="Registered" variant="success" />
                          )}

                          <div className="flex gap-3">
                            {hasIncompleteReg ? (
                              <Link
                                href={`/patients/register?complete=${patient.id}`}
                                className="text-xs font-bold text-[#0ea5e9] hover:text-[#0288c4] uppercase tracking-wider"
                              >
                                Complete
                              </Link>
                            ) : (
                              <>
                                <Link
                                  href={`/patients/${patient.id}/triage`}
                                  className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider"
                                >
                                  Triage
                                </Link>
                                <span className="text-gray-300">|</span>
                                <Link
                                  href={`/patients/${patient.id}/consultation`}
                                  className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider"
                                >
                                  Consult
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
