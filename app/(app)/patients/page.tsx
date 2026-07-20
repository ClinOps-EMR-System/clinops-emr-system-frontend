/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";

interface TriageInfo {
  triage_category: number | null;
  triage_color: string | null;
  recorded_at: string;
}

interface Patient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  patient_category: string;
  village: string;
  district: string;
  phone: string;
  registration_completed_at: string | null;
  vital_signs: TriageInfo[];
}

const categoryColors: Record<string, string> = {
  Emergency: "bg-red-100 text-red-800 border-red-200",
  Inpatient: "bg-sky-100 text-sky-800 border-sky-200",
  Outpatient: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Student: "bg-purple-100 text-purple-800 border-purple-200",
  Staff: "bg-amber-100 text-amber-800 border-amber-200",
};

const triageDotColors: Record<string, string> = {
  red: "bg-red-500 ring-red-200",
  yellow: "bg-amber-400 ring-amber-200",
  orange: "bg-orange-500 ring-orange-200",
  green: "bg-emerald-500 ring-emerald-200",
  blue: "bg-sky-500 ring-sky-200",
};

export default function PatientSearchDirectory() {
  const { token } = useAuth();
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  async function fetchPatients(page = 1) {
    try {
      setLoading(true);
      setError(null);

      let endpoint = `/patients?page=${page}&per_page=10`;

      if (debouncedSearch.trim()) {
        endpoint += `&search=${encodeURIComponent(debouncedSearch)}`;
      }
      if (genderFilter) {
        endpoint += `&gender=${genderFilter}`;
      }
      if (categoryFilter) {
        endpoint += `&patient_category=${categoryFilter}`;
      }
      if (incompleteFilter) {
        endpoint += `&incomplete=1`;
      }

      const response = await api.get(endpoint, token);
      if (response) {
        setPatients(response.data || []);
        setCurrentPage(response.current_page || 1);
        setTotalPages(response.last_page || 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to retrieve patients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      fetchPatients(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, debouncedSearch, genderFilter, categoryFilter, incompleteFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(1);
  };

  function getLatestTriage(patient: Patient): TriageInfo | null {
    if (!patient.vital_signs || patient.vital_signs.length === 0) return null;
    return patient.vital_signs[0];
  }

  function navigateToPatient(patientId: number, e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("a")) return;
    router.push(`/patients/${patientId}`);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Directory Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1b1c1c]">Patient Search</h1>
          <p className="text-sm text-[#5f5e5e] mt-1">
            Lookup, filter, and access clinical logs for patients active in the hospital.
          </p>
        </div>
        <Link
          href="/patients/register"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clinical-primary cursor-pointer"
        >
          Patient Registration
        </Link>
      </section>

      {/* Filter and Search Bar Card */}
      <section className="bg-white rounded border border-[#becab7]/50 p-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded shadow-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                placeholder="Search by name, hospital #, national ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-clinical-primary hover:bg-clinical-primary-hover text-white rounded font-bold text-sm shadow-sm transition-all focus:outline-none"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Gender</label>
              <select
                className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
              <select
                className="border border-gray-300 rounded px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                <option value="Outpatient">Outpatient</option>
                <option value="Inpatient">Inpatient</option>
                <option value="Emergency">Emergency</option>
                <option value="Student">Student</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            <div className="flex items-center self-end h-9 mt-4 sm:mt-0">
              <label className="flex items-center gap-2 text-sm text-[#5f5e5e] cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                  checked={incompleteFilter}
                  onChange={(e) => setIncompleteFilter(e.target.checked)}
                />
                Incomplete Drafts Only
              </label>
            </div>

            {(search || genderFilter || categoryFilter || incompleteFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setGenderFilter("");
                  setCategoryFilter("");
                  setIncompleteFilter(false);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 self-end h-9 uppercase tracking-wider transition-colors mt-4 sm:mt-0 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear Filters
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Patients Data Grid */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-sm font-mono text-gray-500">
            Fetching directory records...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-sm text-red-600 font-semibold">
            {error}
          </div>
        ) : patients.length === 0 ? (
          <div className="p-16 text-center text-gray-400 text-sm">
            No matching patient records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8]">
                <tr>
                  <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wider w-10">Triage</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Patient</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Hospital #</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Sex</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Age</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {patients.map((patient) => {
                  const birthDate = new Date(patient.date_of_birth);
                  const age = new Date().getFullYear() - birthDate.getFullYear();
                  const isDraft = !patient.registration_completed_at;
                  const triage = getLatestTriage(patient);
                  const dotColor = triage?.triage_color ? triageDotColors[triage.triage_color.toLowerCase()] : null;
                  const catColor = categoryColors[patient.patient_category] || "bg-gray-100 text-gray-700 border-gray-200";

                  return (
                    <tr
                      key={patient.id}
                      onClick={(e) => navigateToPatient(patient.id, e)}
                      className="group hover:bg-[#fcf9f8]/60 transition-colors cursor-pointer"
                    >
                      {/* Triage Indicator */}
                      <td className="px-4 py-3.5 text-center">
                        {dotColor ? (
                          <span className={`inline-block h-3 w-3 rounded-full ring-2 ring-offset-1 ${dotColor}`} title={`Triage: ${triage!.triage_color}`} />
                        ) : (
                          <span className="inline-block h-3 w-3 rounded-full bg-gray-200" title="No triage" />
                        )}
                      </td>

                      {/* Patient Name + Phone */}
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-gray-900 group-hover:text-clinical-primary transition-colors">
                            {patient.first_name} {patient.last_name}
                          </span>
                          <span className="text-xs text-gray-400 font-mono">{patient.phone || "—"}</span>
                        </div>
                      </td>

                      {/* Hospital Number */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-xs font-mono font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                          {patient.hospital_number}
                        </span>
                      </td>

                      {/* Gender */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider ${
                          patient.gender === "Male" ? "text-sky-700"
                            : patient.gender === "Female" ? "text-pink-700"
                              : "text-gray-500"
                        }`}>
                          {patient.gender === "Male" && (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <circle cx="10" cy="14" r="5" /><path d="M10 9V4m0 0H5m5 0l5 5" />
                            </svg>
                          )}
                          {patient.gender === "Female" && (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <circle cx="12" cy="10" r="5" /><path d="M12 15v6m-3-3h6" />
                            </svg>
                          )}
                          {patient.gender === "Other" && (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="5" /><path d="M12 7v10M7 12h10" />
                            </svg>
                          )}
                          {patient.gender?.charAt(0) || "—"}
                        </span>
                      </td>

                      {/* Age */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`text-sm font-bold ${
                          age >= 65 ? "text-amber-700" : age <= 5 ? "text-sky-700" : "text-gray-700"
                        }`}>
                          {age}
                        </span>
                        <span className="text-[10px] text-gray-400 ml-0.5">yrs</span>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500 font-mono">
                        {patient.phone || "—"}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-xs text-gray-500">
                        {patient.village || "—"}, {patient.district || "—"}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${catColor}`}>
                            {patient.patient_category}
                          </span>
                          {isDraft && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              Draft
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isDraft && (
                            <Link
                              href={`/patients/register?complete=${patient.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 transition-colors"
                              title="Complete registration"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Intake
                            </Link>
                          )}
                          <Link
                            href={`/patients/${patient.id}/triage`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                            title="Open triage"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            Triage
                          </Link>
                          <Link
                            href={`/patients/${patient.id}/consultation`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors"
                            title="Open consultation"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Consult
                          </Link>
                          <Link
                            href={`/patients/${patient.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                            title="View profile"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-[#fcf9f8]">
            <button
              onClick={() => fetchPatients(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="px-3 py-1.5 border border-gray-300 rounded text-xs font-bold text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-gray-500">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => fetchPatients(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="px-3 py-1.5 border border-gray-300 rounded text-xs font-bold text-gray-500 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
