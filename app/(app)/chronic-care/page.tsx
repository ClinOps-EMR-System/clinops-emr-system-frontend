"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";
import { Activity } from "lucide-react";

interface Patient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  patient_category: string;
  village?: string;
  district?: string;
  registration_completed_at: string | null;
  diagnoses?: Array<{
    id: number;
    diagnosis_name: string;
    icd_code?: string;
    is_primary: boolean;
  }>;
  latest_vitals?: {
    ews_score?: number;
    recorded_at?: string;
  };
  last_encounter?: {
    id: number;
    encounter_date: string;
  };
}

// Chronic conditions for client-side filtering
const CHRONIC_KEYWORDS = [
  "diabetes", "hypertension", "asthma", "copd", "heart failure",
  "renal failure", "chronic kidney", "ckd", "epilepsy", "seizure",
  "sickle cell", "hiv", "aids", "tuberculosis", "tb", "malaria",
  "malnutrition", "malnourished", "anemia", "anaemia", "cancer",
  "hepatitis", "cirrhosis", "lupus", "arthritis", "rheumatoid",
  "osteoarthritis", "hypothyroid", "hyperthyroid", "cardiac",
  "atrial fibrillation", "afib", "dvt", "pulmonary embolism",
  "chronic", "recurrent", "persistent",
];

function isChronicPatient(patient: Patient): boolean {
  if (!patient.diagnoses || patient.diagnoses.length === 0) return false;
  return patient.diagnoses.some((d) => {
    const name = d.diagnosis_name?.toLowerCase() || "";
    return CHRONIC_KEYWORDS.some((kw) => name.includes(kw));
  });
}

function getEwsStyle(score?: number): string {
  if (score == null) return "bg-gray-100 text-gray-600 border-gray-200";
  if (score >= 7) return "bg-red-100 text-red-800 border-red-200";
  if (score >= 5) return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ChronicCarePage() {
  const { token } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  async function fetchPatients(page = 1) {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/patients?page=${page}&per_page=20`, token);
      if (res) {
        const allPatients = res.data || [];
        setPatients(allPatients);
        setCurrentPage(res.current_page || 1);
        setTotalPages(res.last_page || 1);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (token) fetchPatients(1);
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const chronicPatients = useMemo(() => {
    return patients.filter((p) => isChronicPatient(p));
  }, [patients]);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return chronicPatients;
    const q = searchQuery.toLowerCase();
    return chronicPatients.filter(
      (p) =>
        p.first_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q) ||
        p.hospital_number?.includes(q)
    );
  }, [chronicPatients, searchQuery]);

  const primaryDiagnosis = (p: Patient) => {
    if (!p.diagnoses || p.diagnoses.length === 0) return "—";
    const primary = p.diagnoses.find((d) => d.is_primary);
    return primary?.diagnosis_name || p.diagnoses[0]?.diagnosis_name || "—";
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Clinical</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Chronic Care Register</h1>
          <p className="text-sm text-[#5f5e5e] mt-1 font-mono">
            {loading ? "Loading..." : `${chronicPatients.length} patients with chronic conditions`}
          </p>
        </div>
      </section>

      {/* Summary Stats */}
      {!loading && (
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded border border-[#becab7]/50 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">High EWS (7+)</p>
              <p className="text-2xl font-extrabold font-mono text-[#1b1c1c]">
                {chronicPatients.filter((p) => (p.latest_vitals?.ews_score ?? 0) >= 7).length}
              </p>
            </div>
          </div>
          <div className="bg-white rounded border border-[#becab7]/50 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-amber-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Medium EWS (5-6)</p>
              <p className="text-2xl font-extrabold font-mono text-[#1b1c1c]">
                {chronicPatients.filter((p) => {
                  const ews = p.latest_vitals?.ews_score ?? 0;
                  return ews >= 5 && ews < 7;
                }).length}
              </p>
            </div>
          </div>
          <div className="bg-white rounded border border-[#becab7]/50 p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-emerald-100 flex items-center justify-center">
              <Activity className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Stable EWS (&lt;5)</p>
              <p className="text-2xl font-extrabold font-mono text-[#1b1c1c]">
                {chronicPatients.filter((p) => (p.latest_vitals?.ews_score ?? 0) < 5).length}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Search */}
      <section className="bg-white rounded border border-[#becab7]/50 p-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or hospital number..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Patient Table */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">Chronic Care Patients</h2>
        </div>

        {loading ? (
          <LoadingState message="Loading chronic care register..." />
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            icon={<Activity className="h-6 w-6 text-gray-400" />}
            title="No chronic care patients found"
            description={searchQuery ? "Try adjusting your search" : "No patients with chronic conditions in the register"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8]">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Hospital #</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Primary Diagnosis</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Last Visit</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Current EWS</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredPatients.map((patient) => {
                  const ews = patient.latest_vitals?.ews_score;
                  return (
                    <tr
                      key={patient.id}
                      className="hover:bg-[#fcf9f8]/40 hover:border-l-4 hover:border-brand-green/80 transition-all divide-x divide-gray-100"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/patients/${patient.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-clinical-primary hover:underline"
                        >
                          {patient.first_name} {patient.last_name}
                        </Link>
                        <div className="text-xs text-gray-400">{patient.gender}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                        {patient.hospital_number}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {primaryDiagnosis(patient)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-500">
                        {patient.last_encounter
                          ? formatRelativeDate(patient.last_encounter.encounter_date)
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ews != null ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-extrabold font-mono ${getEwsStyle(ews)}`}
                          >
                            {ews}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/patients/${patient.id}/consultation`}
                            className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider"
                          >
                            Consult
                          </Link>
                          <span className="text-gray-300">|</span>
                          <Link
                            href={`/patients/${patient.id}`}
                            className="text-xs font-bold text-[#5f5e5e] hover:text-gray-900 uppercase tracking-wider"
                          >
                            Profile
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

        {/* Pagination */}
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
