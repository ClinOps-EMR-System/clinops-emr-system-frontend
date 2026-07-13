"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../../store/RoleContext";
import { api } from "../../../../lib/api";
import PatientBanner, { Patient, Allergy } from "../../../../components/ui/PatientBanner";

interface TriageSummary {
  encounter: {
    id: number;
    chief_complaint: string | null;
    history_of_present_illness: string | null;
    allergy_confirmed_at: string | null;
  } | null;
  allergies_confirmed: boolean;
  allergies: Allergy[];
  pregnancy_status: boolean;
  current_medications: unknown[];
  vital_signs: {
    id: number;
    temperature: number | null;
    blood_pressure: string | null;
    pulse_rate: number | null;
    respiratory_rate: number | null;
    oxygen_saturation: number | null;
    weight: number | null;
    height: number | null;
    pain_score: number | null;
    ews_score: number | null;
    triage_category: number | null;
    triage_color: string | null;
    recorded_at: string;
  }[];
}

interface Diagnosis {
  id: number;
  code: string;
  description: string;
  diagnosis_type: string;
  certainty: string | null;
  diagnosed_at: string;
  patient_id: number;
}

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params.id as string;

  // States
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<TriageSummary | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vitals" | "diagnoses" | "allergies" | "consents">("vitals");

  async function fetchProfileData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch patient details
      const patientRes = await api.get(`/patients/${patientId}`, token);
      if (patientRes && patientRes.data) {
        setPatient(patientRes.data.patient);
      }

      // Fetch triage/vitals summary
      const triageRes = await api.get(`/patients/${patientId}/triage`, token);
      if (triageRes && triageRes.data) {
        setSummary(triageRes.data as TriageSummary);
      }

      // Fetch diagnoses and filter
      const diagnosesRes = await api.get("/diagnoses", token);
      if (diagnosesRes && diagnosesRes.data) {
        const filtered = (diagnosesRes.data as Diagnosis[]).filter(
          (d) => d.patient_id === parseInt(patientId)
        );
        setDiagnoses(filtered);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load patient profile data.");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (token && patientId) {
      fetchProfileData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, patientId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return (
      <div className="p-8 text-center text-sm font-mono text-gray-500 max-w-7xl mx-auto">
        Fetching patient clinical profile...
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="p-8 text-center text-sm text-red-600 font-bold max-w-7xl mx-auto">
        {error}
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 text-center text-sm text-gray-500 max-w-7xl mx-auto">
        Patient profile not found.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Top Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Patient Management</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-0.5">Clinical Profile</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/patients/register?edit=${patientId}`}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-350 rounded text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clinical-primary cursor-pointer"
          >
            Edit Profile
          </Link>
          <Link
            href={`/patients/${patientId}/triage`}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-clinical-primary cursor-pointer"
          >
            Triage Workbench
          </Link>
          <Link
            href={`/patients/${patientId}/consultation`}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-bold rounded bg-teal-600 text-white hover:bg-teal-700 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 cursor-pointer"
          >
            Consultation (SOAP)
          </Link>
          <button
            onClick={() => router.push("/patients")}
            className="px-3.5 py-2 border border-gray-300 rounded text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors"
          >
            Back to Directory
          </button>
        </div>
      </section>

      {/* Patient Banner */}
      <PatientBanner
        patient={patient}
        allergies={summary?.allergies}
        allergiesConfirmed={summary?.allergies_confirmed}
        isPregnant={summary?.pregnancy_status}
      />

      {/* Main Info Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Demographics & Registration details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Demographic & Administrative Details Card */}
          <div className="bg-white rounded border border-[#becab7]/50 p-6 space-y-5">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Administrative Log</h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">National ID</span>
                <span className="font-mono text-gray-900 font-semibold">{patient.national_id || "Not logged"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Health Passport No</span>
                <span className="font-mono text-gray-900 font-semibold">{patient.health_passport_number || "Not logged"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Contact Phone</span>
                <span className="text-gray-900 font-semibold">{patient.phone || "Not logged"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Primary Address</span>
                <span className="text-gray-900 leading-relaxed font-semibold">
                  {patient.village ? `${patient.village}, ` : ""}
                  {patient.traditional_authority ? `${patient.traditional_authority}, ` : ""}
                  {patient.district || "Not logged"}
                </span>
              </div>
            </div>
          </div>

          {/* Next of Kin / Guardian Card */}
          <div className="bg-white rounded border border-[#becab7]/50 p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Next of Kin / Guardian</h3>
            
            <div className="space-y-4 text-sm">
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Guardian Name</span>
                <span className="text-gray-900 font-semibold">{patient.guardian_name || "Not logged"}</span>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-wide">Guardian Contact</span>
                <span className="text-gray-900 font-semibold">{patient.guardian_phone || "Not logged"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic clinical tabs switcher */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded border border-[#becab7]/50 overflow-hidden shadow-sm min-h-[480px]">
            {/* Tabs Header */}
            <div className="bg-[#fcf9f8] border-b border-gray-200/50 flex">
              <button
                onClick={() => setActiveTab("vitals")}
                className={`px-5 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "vitals"
                    ? "border-clinical-primary text-clinical-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
              >
                Vitals Logs
              </button>
              <button
                onClick={() => setActiveTab("diagnoses")}
                className={`px-5 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "diagnoses"
                    ? "border-clinical-primary text-clinical-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
              >
                Diagnoses ({diagnoses.length})
              </button>
              <button
                onClick={() => setActiveTab("allergies")}
                className={`px-5 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "allergies"
                    ? "border-clinical-primary text-clinical-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
              >
                Allergies ({summary?.allergies?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("consents")}
                className={`px-5 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                  activeTab === "consents"
                    ? "border-clinical-primary text-clinical-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                }`}
              >
                Consents
              </button>
            </div>

            {/* Tab content wrapper */}
            <div className="p-6">
              {/* TAB 1: VITALS LOGS */}
              {activeTab === "vitals" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Physiological Logs History</h4>
                  </div>

                  {summary?.vital_signs && summary.vital_signs.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-150 rounded">
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-[#fcf9f8]">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Date / Time</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Temp</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">BP</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">Pulse</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">SpO2</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">NEWS2</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100 font-mono text-xs">
                          {summary.vital_signs.map((v) => {
                            const date = new Date(v.recorded_at);
                            return (
                              <tr key={v.id} className="hover:bg-gray-50/50">
                                <td className="px-4 py-3 font-sans whitespace-nowrap text-gray-600">
                                  {date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </td>
                                <td className="px-4 py-3 text-gray-900">{v.temperature ? `${v.temperature}°C` : "—"}</td>
                                <td className="px-4 py-3 text-gray-900">{v.blood_pressure || "—"}</td>
                                <td className="px-4 py-3 text-gray-900">{v.pulse_rate ? `${v.pulse_rate} bpm` : "—"}</td>
                                <td className="px-4 py-3 text-gray-900">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : "—"}</td>
                                <td className="px-4 py-3">
                                  {v.ews_score !== null ? (
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      v.triage_color === "red"
                                        ? "bg-red-100 text-red-800"
                                        : v.triage_color === "yellow"
                                          ? "bg-yellow-100 text-yellow-800"
                                          : "bg-emerald-100 text-emerald-800"
                                    }`}>
                                      {v.ews_score}
                                    </span>
                                  ) : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">No vital signs logged for this patient.</div>
                  )}
                </div>
              )}

              {/* TAB 2: DIAGNOSES */}
              {activeTab === "diagnoses" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">ICD-11 Diagnostic Records</h4>

                  {diagnoses.length > 0 ? (
                    <div className="divide-y divide-gray-150 border border-gray-150 rounded bg-white overflow-hidden">
                      {diagnoses.map((d) => (
                        <div key={d.id} className="p-4 flex items-center justify-between hover:bg-gray-50/40">
                          <div>
                            <span className="font-mono text-xs font-bold bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded border border-gray-200 mr-2.5">
                              {d.code}
                            </span>
                            <span className="font-semibold text-gray-900 text-sm">{d.description}</span>
                            <span className="ml-2 text-xs text-gray-400">({d.diagnosis_type})</span>
                          </div>
                          <span className="text-xs text-gray-500 font-mono">
                            {new Date(d.diagnosed_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">No diagnoses registered for this patient.</div>
                  )}
                </div>
              )}

              {/* TAB 3: ALLERGIES */}
              {activeTab === "allergies" && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Confirmed Sensitivities & Allergies</h4>

                  {summary?.allergies && summary.allergies.length > 0 ? (
                    <div className="divide-y divide-gray-150 border border-gray-150 rounded bg-white overflow-hidden">
                      {summary.allergies.map((a) => (
                        <div key={a.id} className="p-4 flex justify-between items-center hover:bg-gray-50/40">
                          <div>
                            <span className="font-semibold text-gray-900 text-sm">{a.allergen}</span>
                            {a.reaction && <p className="text-xs text-gray-500 mt-1">Reaction: {a.reaction}</p>}
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            a.severity === "severe"
                              ? "bg-red-100 text-red-800 border border-red-200"
                              : a.severity === "moderate"
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                : "bg-gray-100 text-gray-800 border border-gray-200"
                          }`}>
                            {a.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : summary?.allergies_confirmed ? (
                    <div className="bg-emerald-50 border border-emerald-150 rounded p-6 text-center text-sm font-bold text-emerald-800 flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      NO KNOWN ALLERGIES (NKA)
                    </div>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-150 rounded p-6 text-center text-sm font-bold text-yellow-800 flex items-center justify-center gap-2 font-mono">
                      <svg className="w-5 h-5 text-yellow-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      ALLERGIES UNCONFIRMED
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CONSENT LOGS */}
              {activeTab === "consents" && (
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Ethics & Patient Consent Preferences</h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Clinical Care Consent */}
                    <div className={`p-4 rounded border text-center flex flex-col justify-between h-36 ${
                      patient.consent_care
                        ? "bg-emerald-50 border-emerald-150 text-emerald-950"
                        : "bg-red-50 border-red-150 text-red-950"
                    }`}>
                      <span className="text-xs font-bold uppercase tracking-wider block">Clinical Care</span>
                      <span className="text-2xl font-black block tracking-tight my-2">
                        {patient.consent_care ? "GRANTED" : "DENIED"}
                      </span>
                      <span className="text-[10px] text-gray-500 leading-tight">Patient permits clinical intervention & vital recording.</span>
                    </div>

                    {/* Clinical Teaching Consent */}
                    <div className={`p-4 rounded border text-center flex flex-col justify-between h-36 ${
                      patient.consent_teaching
                        ? "bg-emerald-50 border-emerald-150 text-emerald-950"
                        : "bg-red-50 border-red-150 text-red-950"
                    }`}>
                      <span className="text-xs font-bold uppercase tracking-wider block">Clinical Teaching</span>
                      <span className="text-2xl font-black block tracking-tight my-2">
                        {patient.consent_teaching ? "GRANTED" : "DENIED"}
                      </span>
                      <span className="text-[10px] text-gray-500 leading-tight">Patient permits case presentation to medical interns.</span>
                    </div>

                    {/* Research Consent */}
                    <div className={`p-4 rounded border text-center flex flex-col justify-between h-36 ${
                      patient.consent_research
                        ? "bg-emerald-50 border-emerald-150 text-emerald-950"
                        : "bg-red-50 border-red-150 text-red-950"
                    }`}>
                      <span className="text-xs font-bold uppercase tracking-wider block">Research Use</span>
                      <span className="text-2xl font-black block tracking-tight my-2">
                        {patient.consent_research ? "GRANTED" : "DENIED"}
                      </span>
                      <span className="text-[10px] text-gray-500 leading-tight">Patient permits anonymized data aggregation for studies.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
