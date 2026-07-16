"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import StatusBadge from "../../../components/ui/StatusBadge";
import { StatCard } from "../../../components/ui/stat-card";
import { BeakerIcon, CreditCardIcon } from "@heroicons/react/20/solid";

interface Patient {
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
}

interface DashboardStats {
  totalPatients: number;
  registeredToday: number;
  incompleteDrafts: number;
  pendingOrders: number;
  pendingPrescriptions: number;
  activeAdmissions: number;
  pendingReferrals: number;
  unpaidBills: number;
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    registeredToday: 0,
    incompleteDrafts: 0,
    pendingOrders: 0,
    pendingPrescriptions: 0,
    activeAdmissions: 0,
    pendingReferrals: 0,
    unpaidBills: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // Fetch recent patients
        const response = await api.get("/patients?per_page=10", token);
        if (response && response.data) {
          setPatients(response.data);
        }

        // Fetch stats from various endpoints
        const [ordersRes, rxRes, admRes, refRes, billsRes] = await Promise.allSettled([
          api.get("/orders", token),
          api.get("/prescriptions", token),
          api.get("/admissions", token),
          api.get("/referrals", token),
          api.get("/bills", token),
        ]);

        const allPatientsRes = await api.get("/patients?per_page=1", token);
        const totalCount = allPatientsRes?.meta?.total || allPatientsRes?.data?.length || 0;

        const today = new Date().toISOString().split("T")[0];
        const registeredToday = patients.filter((p) => new Date(p.created_at).toISOString().startsWith(today)).length;
        const incompleteDrafts = patients.filter((p) => !p.registration_completed_at).length;

        setStats({
          totalPatients: totalCount,
          registeredToday,
          incompleteDrafts,
          pendingOrders: ordersRes.status === "fulfilled" ? (ordersRes.value?.data?.filter((o: { status: string }) => o.status === "pending" || o.status === "ordered").length || 0) : 0,
          pendingPrescriptions: rxRes.status === "fulfilled" ? (rxRes.value?.data?.filter((r: { status: string }) => r.status === "prescribed" || r.status === "active").length || 0) : 0,
          activeAdmissions: admRes.status === "fulfilled" ? (admRes.value?.data?.filter((a: { discharge_date: string | null }) => !a.discharge_date).length || 0) : 0,
          pendingReferrals: refRes.status === "fulfilled" ? (refRes.value?.data?.filter((r: { status: string }) => r.status === "pending").length || 0) : 0,
          unpaidBills: billsRes.status === "fulfilled" ? (billsRes.value?.data?.filter((b: { payment_status: string }) => b.payment_status === "unpaid" || b.payment_status === "partially_paid").length || 0) : 0,
        });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchDashboardData();
    }
  }, [token]);
  /* eslint-enable react-hooks/exhaustive-deps */

  const staffName = user?.name?.split(" ")[0] || "Staff";

  // Determine which quick actions to show based on user role
  const userRole = user?.department?.name?.toLowerCase() || "";
  const showPharmacy = userRole.includes("pharm") || userRole.includes("clinical") || userRole.includes("admin");
  const showLab = userRole.includes("lab") || userRole.includes("clinical") || userRole.includes("admin");
  const showBilling = userRole.includes("bill") || userRole.includes("finance") || userRole.includes("admin");
  const showAdmin = userRole.includes("admin") || userRole.includes("management");

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
        <StatCard
          label="Total Patients"
          value={stats.totalPatients}
          color="default"
          loading={loading}
        />
        <StatCard
          label="Registered Today"
          value={stats.registeredToday}
          color="default"
          loading={loading}
        />
        <StatCard
          label="Incomplete Drafts"
          value={stats.incompleteDrafts}
          color="warning"
          loading={loading}
        />
        <StatCard
          label="Active Admissions"
          value={stats.activeAdmissions}
          color="default"
          loading={loading}
        />
      </section>

      {/* Operational Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/pharmacy"
          className="hover:border-brand-green hover:shadow-sm transition-all group"
        >
          <StatCard
            label="Pending Prescriptions"
            value={stats.pendingPrescriptions}
            color="warning"
            icon={BeakerIcon}
            loading={loading}
          />
        </Link>

        <Link
          href="/lab"
          className="hover:border-brand-green hover:shadow-sm transition-all group"
        >
          <StatCard
            label="Pending Lab Orders"
            value={stats.pendingOrders}
            color="info"
            icon={BeakerIcon}
            loading={loading}
          />
        </Link>

        <Link
          href="/billing"
          className="hover:border-brand-green hover:shadow-sm transition-all group"
        >
          <StatCard
            label="Unpaid Bills"
            value={stats.unpaidBills}
            color="danger"
            icon={CreditCardIcon}
            loading={loading}
          />
        </Link>
      </section>

      {/* Quick Actions - Role Based */}
      {(showPharmacy || showLab || showBilling || showAdmin) && (
        <section className="bg-white rounded border border-[#becab7]/50 p-6">
          <h2 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {showPharmacy && (
              <Link href="/pharmacy" className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-brand-green hover:bg-[#fcf9f8] transition-all">
                <div className="h-8 w-8 rounded bg-amber-100 flex items-center justify-center"><span className="text-amber-600 text-sm">Rx</span></div>
                <span className="text-sm font-bold text-gray-700">Pharmacy Queue</span>
              </Link>
            )}
            {showLab && (
              <Link href="/lab" className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-brand-green hover:bg-[#fcf9f8] transition-all">
                <div className="h-8 w-8 rounded bg-sky-100 flex items-center justify-center"><span className="text-sky-600 text-sm font-bold">Lab</span></div>
                <span className="text-sm font-bold text-gray-700">Lab Orders</span>
              </Link>
            )}
            {showBilling && (
              <Link href="/billing" className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-brand-green hover:bg-[#fcf9f8] transition-all">
                <div className="h-8 w-8 rounded bg-emerald-100 flex items-center justify-center"><span className="text-emerald-600 text-sm font-bold">$</span></div>
                <span className="text-sm font-bold text-gray-700">Billing</span>
              </Link>
            )}
            {showAdmin && (
              <Link href="/admin" className="flex items-center gap-3 p-3 rounded border border-gray-200 hover:border-brand-green hover:bg-[#fcf9f8] transition-all">
                <div className="h-8 w-8 rounded bg-purple-100 flex items-center justify-center"><span className="text-purple-600 text-sm font-bold">Ad</span></div>
                <span className="text-sm font-bold text-gray-700">Administration</span>
              </Link>
            )}
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
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">
            No patient registrations recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8]">
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
                {patients.map((patient) => {
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
