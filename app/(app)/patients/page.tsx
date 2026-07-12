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
  date_of_birth: string;
  gender: string;
  patient_category: string;
  village: string;
  district: string;
  phone: string;
  registration_completed_at: string | null;
}

export default function PatientSearchDirectory() {
  const { user, token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchPatients(page = 1) {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint = `/patients?page=${page}&per_page=10`;
      
      if (search.trim()) {
        endpoint += `&search=${encodeURIComponent(search)}`;
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
    } catch (err: any) {
      setError(err.message || "Failed to retrieve patients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      fetchPatients(1);
    }
  }, [token, genderFilter, categoryFilter, incompleteFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPatients(1);
  };

  const role = user?.role || "clerk";

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Directory Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#1b1c1c]">Patient Master Directory</h1>
          <p className="text-sm text-[#5f5e5e] mt-1">
            Lookup, filter, and access clinical logs for patients active in the hospital.
          </p>
        </div>
        {role === "clerk" && (
          <Link
            href="/patients/register"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clinical-primary cursor-pointer"
          >
            Register New Patient
          </Link>
        )}
      </section>

      {/* Filter and Search Bar Card */}
      <section className="bg-white rounded border border-[#becab7]/50 p-6">
        <form onSubmit={handleSearchSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Field */}
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
            {/* Search Submit Button */}
            <button
              type="submit"
              className="px-6 py-2.5 bg-clinical-primary hover:bg-clinical-primary-hover text-white rounded font-bold text-sm shadow-sm transition-all focus:outline-none"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            {/* Gender Filter */}
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

            {/* Category Filter */}
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

            {/* Incomplete Emergency Checkbox */}
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
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Hospital #</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">DOB / Age</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Village, District</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Payer Category</th>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {patients.map((patient) => {
                  const birthDate = new Date(patient.date_of_birth);
                  const age = new Date().getFullYear() - birthDate.getFullYear();
                  const isDraft = !patient.registration_completed_at;

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
                        {birthDate.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                        <span className="text-xs text-gray-400 ml-1">({age} yrs)</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {patient.village || "N/A"}, {patient.district || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {patient.patient_category}
                        </span>
                        {isDraft && (
                          <span className="ml-1.5 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 font-mono">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-3">
                          {isDraft && role === "clerk" ? (
                            <Link
                              href={`/patients/register?complete=${patient.id}`}
                              className="text-xs font-bold text-[#0ea5e9] hover:text-[#0288c4] uppercase tracking-wider"
                            >
                              Complete Intake
                            </Link>
                          ) : (
                            <>
                              {role === "nurse" && (
                                <Link
                                  href={`/patients/${patient.id}/triage`}
                                  className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider"
                                >
                                  Triage
                                </Link>
                              )}
                              {role === "clinician" && (
                                <Link
                                  href={`/patients/${patient.id}/consultation`}
                                  className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider"
                                >
                                  Consult
                                </Link>
                              )}
                              <Link
                                href={`/patients/${patient.id}`}
                                className="text-xs font-bold text-[#5f5e5e] hover:text-gray-900 uppercase tracking-wider"
                              >
                                Profile
                              </Link>
                            </>
                          )}
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
