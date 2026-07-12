"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";

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

export default function Dashboard() {
  const { user, token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // Fetch recent patients
        const response = await api.get("/patients?per_page=10", token);
        if (response && response.data) {
          setPatients(response.data);
        }
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

  const staffName = user?.name?.split(" ")[0] || "Staff";

  // Compute stats based on loaded data
  const registeredTodayCount = patients.filter((p) => {
    const today = new Date().toISOString().split("T")[0];
    const registeredDate = new Date(p.created_at).toISOString().split("T")[0];
    return today === registeredDate;
  }).length;

  const incompleteRegistrations = patients.filter((p) => !p.registration_completed_at).length;

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
        
        <Link
          href="/patients/register"
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clinical-primary cursor-pointer"
        >
          <svg className="mr-2 -ml-1 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Quick Register Patient
        </Link>
      </section>

      {/* Metrics Cards Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">
            Registered Today
          </dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">
            {loading ? "..." : registeredTodayCount}
          </dd>
        </div>
        {/* Card 2 */}
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">
            Incomplete Emergency Intake
          </dt>
          <dd className={`text-4xl font-extrabold font-mono ${incompleteRegistrations > 0 ? "text-yellow-600" : "text-[#1b1c1c]"}`}>
            {loading ? "..." : incompleteRegistrations}
          </dd>
        </div>
        {/* Card 3 */}
        <div className="bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between">
          <dt className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider mb-2">
            Avg. Patient Intake
          </dt>
          <dd className="text-4xl font-extrabold text-[#1b1c1c] font-mono">
            4<span className="text-lg font-normal text-[#5f5e5e] ml-1 font-sans">min</span>
          </dd>
        </div>
      </section>

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
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                              Emergency Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Registered
                            </span>
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
