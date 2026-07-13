"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../../store/RoleContext";
import { api } from "../../../../../lib/api";
import PatientBanner, { Patient, Allergy } from "../../../../../components/ui/PatientBanner";

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
    temperature: number | null;
    blood_pressure: string | null;
    pulse_rate: number | null;
    oxygen_saturation: number | null;
  }[];
}

interface Icd11Result {
  code: string;
  title: string;
  chapter: string;
  source: string;
}

interface Diagnosis {
  id: number;
  code: string;
  description: string;
  diagnosis_type: string;
  certainty: string | null;
  diagnosed_at: string;
}

export default function ClinicianSOAPConsultation() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params.id as string;

  // SOAP Tabs
  const [activeSubTab, setActiveSubTab] = useState<"subjective" | "objective" | "assessment" | "plan">("subjective");

  // Core Data
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<TriageSummary | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // SOAP States
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [planInstructions, setPlanInstructions] = useState("");

  // ICD-11 Autocomplete States
  const [icdQuery, setIcdQuery] = useState("");
  const [icdResults, setIcdResults] = useState<Icd11Result[]>([]);
  const [selectedIcd, setSelectedIcd] = useState<Icd11Result | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [diagnosisType, setDiagnosisType] = useState<"Primary" | "Differential" | "Admission" | "Discharge" | "Final">("Primary");
  const [certainty, setCertainty] = useState("confirmed");

  // Load Patient and Diagnoses logs
  async function fetchConsultationData() {
    try {
      setLoading(true);
      setError(null);

      const patientRes = await api.get(`/patients/${patientId}`, token);
      const triageRes = await api.get(`/patients/${patientId}/triage`, token);

      if (patientRes && patientRes.data) {
        setPatient(patientRes.data.patient);
      }
      if (triageRes && triageRes.data) {
        const s = triageRes.data as TriageSummary;
        setSummary(s);
        if (s.encounter) {
          setChiefComplaint(s.encounter.chief_complaint || "");
          setHpi(s.encounter.history_of_present_illness || "");
        }
      }

      // Fetch patient diagnoses logs
      const diagnosesRes = await api.get("/diagnoses", token);
      if (diagnosesRes && diagnosesRes.data) {
        // Filter diagnoses for this patient locally
        const filtered = (diagnosesRes.data as (Diagnosis & { patient_id: number })[]).filter(
          (d) => d.patient_id === parseInt(patientId)
        );
        setDiagnoses(filtered);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load consultation logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && patientId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchConsultationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, patientId]);

  // Handle ICD-11 search autocomplete
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (icdQuery.trim().length >= 2) {
        try {
          setSearchLoading(true);
          const response = await api.get(`/icd11/search?q=${encodeURIComponent(icdQuery)}`, token);
          if (response) {
            setIcdResults(response as Icd11Result[]);
          }
        } catch {
          setIcdResults([]);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setIcdResults([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [icdQuery, token]);

  // Initialize consultation encounter if none exists
  const handleStartEncounter = async () => {
    setSubmitLoading(true);
    setError(null);
    try {
      await api.post(
        `/patients/${patientId}/triage/presenting-complaint`,
        { chief_complaint: "Initial Clinical Assessment" },
        token
      );
      setSuccessMsg("Consultation encounter initialized successfully.");
      fetchConsultationData();
    } catch {
      setError("Failed to initialize active encounter.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Save Subjective SOAP component
  const handleSaveSubjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary?.encounter?.id) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      chief_complaint: chiefComplaint,
      history_of_present_illness: hpi || null,
    };

    try {
      await api.post(`/patients/${patientId}/triage/presenting-complaint`, payload, token);
      setSuccessMsg("Subjective (CC & HPI) updated successfully.");
      fetchConsultationData();
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError(apiError.message || "Failed to save Subjective notes.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Save Diagnosis (Assessment)
  const handleSaveDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIcd || !summary?.encounter?.id) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      patient_id: parseInt(patientId),
      encounter_id: summary.encounter.id,
      code: selectedIcd.code,
      diagnosis_type: diagnosisType,
      certainty: certainty,
    };

    try {
      await api.post("/diagnoses", payload, token);
      setSuccessMsg(`Diagnosis ${selectedIcd.code} (${selectedIcd.title}) logged successfully.`);
      setSelectedIcd(null);
      setIcdQuery("");
      fetchConsultationData();
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError(apiError.message || "Failed to log diagnosis.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Delete Diagnosis
  const handleDeleteDiagnosis = async (id: number) => {
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.delete(`/diagnoses/${id}`, token);
      setSuccessMsg("Diagnosis entry removed successfully.");
      fetchConsultationData();
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError(apiError.message || "Failed to remove diagnosis.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Save Plan
  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("Clinical plan saved to draft summary.");
  };

  if (loading) {
    return <div className="p-8 text-center text-sm font-mono text-gray-500">Loading consultation record...</div>;
  }

  if (error && !patient) {
    return <div className="p-8 text-center text-sm text-red-600 font-bold">{error}</div>;
  }

  if (!patient) {
    return <div className="p-8 text-center text-sm text-gray-500">Patient profile not found.</div>;
  }

  const activeEncounterId = summary?.encounter?.id;

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <section className="flex items-center gap-4 justify-between">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Clinician Desk</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-0.5">Clinical Consultation (SOAP)</h1>
        </div>
        <button
          onClick={() => router.push("/patients")}
          className="px-3.5 py-1.5 border border-gray-300 rounded text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors"
        >
          Back to Directory
        </button>
      </section>

      {/* Patient demographics header */}
      <PatientBanner
        patient={patient}
        allergies={summary?.allergies}
        allergiesConfirmed={summary?.allergies_confirmed}
        isPregnant={summary?.pregnancy_status}
      />

      {!activeEncounterId ? (
        /* Self-healing encounter initializer */
        <div className="bg-yellow-50 border border-yellow-200 rounded p-6 text-center space-y-4">
          <h3 className="text-lg font-bold text-yellow-900">No Active Triage Encounter</h3>
          <p className="text-sm text-yellow-800 max-w-lg mx-auto">
            A check-in encounter is required to log clinical notes and diagnostics. You can initialize one directly.
          </p>
          <button
            onClick={handleStartEncounter}
            disabled={submitLoading}
            className="px-6 py-2.5 bg-clinical-primary hover:bg-clinical-primary-hover text-white font-bold text-sm rounded shadow transition-all cursor-pointer"
          >
            {submitLoading ? "Starting Encounter..." : "Start Consultation Encounter"}
          </button>
        </div>
      ) : (
        /* Main SOAP Console Layout */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Hand Tab Navigation */}
          <div className="lg:col-span-1 flex flex-col gap-1 bg-white rounded border border-[#becab7]/50 p-3 h-fit">
            <button
              onClick={() => { setActiveSubTab("subjective"); setError(null); setSuccessMsg(null); }}
              className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
                activeSubTab === "subjective"
                  ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Subjective (S)
            </button>
            <button
              onClick={() => { setActiveSubTab("objective"); setError(null); setSuccessMsg(null); }}
              className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
                activeSubTab === "objective"
                  ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Objective (O)
            </button>
            <button
              onClick={() => { setActiveSubTab("assessment"); setError(null); setSuccessMsg(null); }}
              className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
                activeSubTab === "assessment"
                  ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Assessment & ICD-11 (A)
            </button>
            <button
              onClick={() => { setActiveSubTab("plan"); setError(null); setSuccessMsg(null); }}
              className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
                activeSubTab === "plan"
                  ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Plan (P)
            </button>
          </div>

          {/* Right Hand Form Console */}
          <div className="lg:col-span-3 bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between min-h-[500px]">
            <div>
              {/* Feedback messages */}
              {successMsg && (
                <div className="mb-6 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 font-semibold">
                  {successMsg}
                </div>
              )}
              {error && (
                <div className="mb-6 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-semibold">
                  {error}
                </div>
              )}

              {/* SOAP S: SUBJECTIVE */}
              {activeSubTab === "subjective" && (
                <form onSubmit={handleSaveSubjective} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Subjective Findings</h3>
                    <p className="text-xs text-[#5f5e5e] mt-0.5">Record complaints and histories shared directly by the patient.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Chief Complaint (CC)</label>
                      <textarea
                        rows={3}
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                        value={chiefComplaint}
                        onChange={(e) => setChiefComplaint(e.target.value)}
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">History of Present Illness (HPI)</label>
                      <textarea
                        rows={6}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                        value={hpi}
                        onChange={(e) => setHpi(e.target.value)}
                      ></textarea>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={submitLoading || !chiefComplaint.trim()}
                      className="px-6 py-2 bg-[#00a651] hover:bg-[#048f47] text-white font-bold text-sm rounded shadow-sm transition-all focus:outline-none cursor-pointer"
                    >
                      {submitLoading ? "Saving..." : "Save Subjective Notes"}
                    </button>
                  </div>
                </form>
              )}

              {/* SOAP O: OBJECTIVE */}
              {activeSubTab === "objective" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Objective Measurements & Observations</h3>
                    <p className="text-xs text-[#5f5e5e] mt-0.5">Displays physiological results recorded during triage.</p>
                  </div>

                  {/* Summary of recent vitals */}
                  <div className="bg-[#fcf9f8] p-4 rounded border border-gray-200/50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Latest Vitals Measurements</h4>
                    {summary?.vital_signs && summary.vital_signs.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Temp */}
                        <div className="bg-white p-3 rounded border border-gray-100 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Temperature</span>
                          <span className="text-lg font-bold font-mono text-gray-900 mt-1">
                            {summary.vital_signs[0].temperature ? `${summary.vital_signs[0].temperature}°C` : "N/A"}
                          </span>
                        </div>
                        {/* BP */}
                        <div className="bg-white p-3 rounded border border-gray-100 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Blood Pressure</span>
                          <span className="text-lg font-bold font-mono text-gray-900 mt-1">
                            {summary.vital_signs[0].blood_pressure || "N/A"}
                          </span>
                        </div>
                        {/* Pulse */}
                        <div className="bg-white p-3 rounded border border-gray-100 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pulse Rate</span>
                          <span className="text-lg font-bold font-mono text-gray-900 mt-1">
                            {summary.vital_signs[0].pulse_rate ? `${summary.vital_signs[0].pulse_rate} bpm` : "N/A"}
                          </span>
                        </div>
                        {/* SpO2 */}
                        <div className="bg-white p-3 rounded border border-gray-100 flex flex-col justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">SpO2</span>
                          <span className="text-lg font-bold font-mono text-gray-900 mt-1">
                            {summary.vital_signs[0].oxygen_saturation ? `${summary.vital_signs[0].oxygen_saturation}%` : "N/A"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-gray-400 font-mono">No vitals currently logged for this encounter.</div>
                    )}
                  </div>

                  {/* Physical Exam Box */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Physician Objective Findings / Physical Exam</label>
                    <textarea
                      rows={5}
                      className="block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                      placeholder="Note physical exam observations, general appearance, chest sounds, abdominal rigidity, etc."
                    ></textarea>
                  </div>
                </div>
              )}

              {/* SOAP A: ASSESSMENT & ICD-11 SEARCH */}
              {activeSubTab === "assessment" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Assessment & Diagnoses (ICD-11)</h3>
                    <p className="text-xs text-[#5f5e5e] mt-0.5">Search and log diagnostic codes matching clinical assessment.</p>
                  </div>

                  {/* Active Diagnoses List */}
                  <div className="bg-[#fcf9f8] p-4 rounded border border-gray-200/50">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Logged Diagnoses</h4>
                    {diagnoses.length > 0 ? (
                      <div className="divide-y divide-gray-200 bg-white rounded border border-gray-100 overflow-hidden">
                        {diagnoses.map((d) => (
                          <div key={d.id} className="px-4 py-3 flex justify-between items-center">
                            <div>
                              <span className="font-mono font-bold text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200 mr-2.5">
                                {d.code}
                              </span>
                              <span className="font-semibold text-gray-900 text-sm">{d.description}</span>
                              <span className="ml-2 text-xs text-gray-400">({d.diagnosis_type})</span>
                            </div>
                            <button
                              onClick={() => handleDeleteDiagnosis(d.id)}
                              className="text-xs text-red-600 hover:text-red-800 uppercase font-bold cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-gray-400">No diagnoses logged. Use search panel below to add.</div>
                    )}
                  </div>

                  {/* ICD-11 Autocomplete Search Panel */}
                  <form onSubmit={handleSaveDiagnosis} className="space-y-4 pt-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Search & Add ICD-11 Code</h4>
                    
                    <div className="relative">
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Search Term (e.g. malaria, diabetes)</label>
                      <input
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                        placeholder="Search WHO ICD-11 registries..."
                        value={icdQuery}
                        onChange={(e) => setIcdQuery(e.target.value)}
                      />

                      {/* Autocomplete dropdown overlay */}
                      {searchLoading && (
                        <div className="absolute left-0 right-0 mt-1 p-3 bg-white border border-gray-200 rounded shadow-md text-xs text-gray-500 z-30 font-mono">
                          Searching WHO server...
                        </div>
                      )}
                      {!searchLoading && icdResults.length > 0 && (
                        <ul className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-60 overflow-y-auto z-30 divide-y divide-gray-100 text-sm">
                          {icdResults.map((result, idx) => (
                            <li key={idx}>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedIcd(result);
                                  setIcdResults([]);
                                }}
                                className="w-full text-left px-4 py-2 hover:bg-[#fcf9f8] flex items-baseline justify-between transition-colors"
                              >
                                <div>
                                  <span className="font-semibold text-gray-900">{result.title}</span>
                                  <span className="ml-2 text-xs text-gray-400 uppercase font-mono">({result.chapter})</span>
                                </div>
                                <span className="font-mono text-xs font-bold text-clinical-primary ml-4">{result.code}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {selectedIcd && (
                      <div className="bg-emerald-50 border border-emerald-100 rounded p-4 flex justify-between items-center">
                        <div>
                          <p className="text-xs text-emerald-800 uppercase font-bold tracking-wider">Selected Diagnostic Code</p>
                          <p className="text-sm font-semibold text-emerald-950 mt-1">
                            <span className="font-mono font-bold mr-2 bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300">
                              {selectedIcd.code}
                            </span>
                            {selectedIcd.title}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedIcd(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 font-bold uppercase cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    {selectedIcd && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Diagnosis Class</label>
                          <select
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm"
                            value={diagnosisType}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDiagnosisType(e.target.value as typeof diagnosisType)}
                          >
                            <option value="Primary">Primary</option>
                            <option value="Differential">Differential</option>
                            <option value="Admission">Admission</option>
                            <option value="Discharge">Discharge</option>
                            <option value="Final">Final</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Certainty</label>
                          <select
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm"
                            value={certainty}
                            onChange={(e) => setCertainty(e.target.value)}
                          >
                            <option value="confirmed">Confirmed</option>
                            <option value="provisional">Provisional / Suspected</option>
                            <option value="ruled_out">Ruled Out</option>
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        type="submit"
                        disabled={submitLoading || !selectedIcd}
                        className="px-6 py-2 bg-[#00a651] hover:bg-[#048f47] text-white font-bold text-sm rounded shadow-sm transition-all focus:outline-none cursor-pointer disabled:opacity-50"
                      >
                        {submitLoading ? "Logging..." : "Log ICD-11 Diagnosis"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SOAP P: PLAN */}
              {activeSubTab === "plan" && (
                <form onSubmit={handleSavePlan} className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Treatment Plan</h3>
                    <p className="text-xs text-[#5f5e5e] mt-0.5">Write instructions for nursing staff, pharmacies, or laboratories.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Clinician Instructions & Care Plan</label>
                      <textarea
                        rows={6}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                        placeholder="Detail prescriptions, lab orders (LOINC), ward admission plans, referral details, or return outpatient instruction guidelines."
                        value={planInstructions}
                        onChange={(e) => setPlanInstructions(e.target.value)}
                      ></textarea>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="px-6 py-2 bg-[#00a651] hover:bg-[#048f47] text-white font-bold text-sm rounded shadow-sm transition-all focus:outline-none cursor-pointer"
                    >
                      Save Care Plan
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
