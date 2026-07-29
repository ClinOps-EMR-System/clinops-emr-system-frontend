"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import { Patient } from "../../../types/patient";
import DataTable, { Column } from "../../../components/ui/DataTable";
import { SectionHeader } from "../../../components/ui/PageLayout";

export default function PatientSearchDirectory() {
  const { token } = useAuth();
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
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  async function fetchPatients(page = 1) {
    try {
      setLoading(true);
      setError(null);
      let endpoint = `/patients?page=${page}&per_page=10`;
      if (debouncedSearch.trim()) endpoint += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (genderFilter) endpoint += `&gender=${genderFilter}`;
      if (categoryFilter) endpoint += `&patient_category=${categoryFilter}`;
      if (incompleteFilter) endpoint += `&incomplete=1`;

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
    if (token) fetchPatients(1); // eslint-disable-line react-hooks/set-state-in-effect
  }, [token, debouncedSearch, genderFilter, categoryFilter, incompleteFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: Column<Patient>[] = [
    {
      key: "first_name",
      header: "Patient Name",
      sortable: true,
      render: (p) => (
        <span className="font-semibold text-gray-900">{p.first_name} {p.last_name}</span>
      ),
    },
    {
      key: "hospital_number",
      header: "Hospital #",
      sortable: true,
      render: (p) => (
        <span className="font-mono text-xs text-gray-500">{p.hospital_number}</span>
      ),
    },
    {
      key: "date_of_birth",
      header: "DOB / Age",
      sortable: true,
      mobileHidden: true,
      render: (p) => {
        const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear();
        return (
          <span className="text-gray-600">
            {new Date(p.date_of_birth).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
            <span className="text-xs text-gray-400 ml-1">({age} yrs)</span>
          </span>
        );
      },
    },
    {
      key: "village",
      header: "Village, District",
      mobileHidden: true,
      render: (p) => (
        <span className="text-gray-500">{p.village || "N/A"}, {p.district || "N/A"}</span>
      ),
    },
    {
      key: "patient_category",
      header: "Payer Category",
      mobileHidden: true,
      render: (p) => (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {p.patient_category}
          </span>
          {!p.registration_completed_at && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 font-mono">
              Draft
            </span>
          )}
        </div>
      ),
    },
    {
      key: "id",
      header: "Action",
      render: (p) => {
        const isDraft = !p.registration_completed_at;
        return (
          <div className="flex gap-3">
            {isDraft ? (
              <Link
                href={`/patients/register?complete=${p.id}`}
                className="text-xs font-bold text-[#0ea5e9] hover:text-[#0288c4] uppercase tracking-wider"
              >
                Complete Intake
              </Link>
            ) : (
              <>
                <Link href={`/patients/${p.id}/triage`} className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider">
                  Triage
                </Link>
                <span className="text-gray-300">|</span>
                <Link href={`/patients/${p.id}/consultation`} className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider">
                  Consult
                </Link>
                <span className="text-gray-300">|</span>
                <Link href={`/patients/${p.id}`} className="text-xs font-bold text-[#5f5e5e] hover:text-gray-900 uppercase tracking-wider">
                  Profile
                </Link>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <SectionHeader
        title="Patient Search"
        description="Lookup, filter, and access clinical logs for patients active in the hospital."
        action={
          <Link
            href="/patients/register"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clinical-primary"
          >
            Patient Registration
          </Link>
        }
      />

      <div className="bg-white rounded border border-[#becab7]/50 p-6">
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
        </div>

        <div className="flex flex-wrap gap-4 items-center mt-4">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1" htmlFor="gender-filter">Gender</label>
            <select
              id="gender-filter"
              className="border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary min-h-[44px]"
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
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1" htmlFor="category-filter">Category</label>
            <select
              id="category-filter"
              className="border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary min-h-[44px]"
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
              onClick={() => { setSearch(""); setGenderFilter(""); setCategoryFilter(""); setIncompleteFilter(false); }}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-800 self-end h-9 uppercase tracking-wider transition-colors mt-4 sm:mt-0"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={patients}
        loading={loading}
        error={error}
        keyExtractor={(p) => p.id}
        emptyTitle="No matching patient records found"
        emptyDescription="Try adjusting your search or filters."
        defaultSortKey="first_name"
        pagination={{
          currentPage,
          totalPages,
          onPageChange: fetchPatients,
        }}
      />
    </div>
  );
}
