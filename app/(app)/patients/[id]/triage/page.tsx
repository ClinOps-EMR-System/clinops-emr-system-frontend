"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../../store/RoleContext";
import { api } from "../../../../../lib/api";
import PatientBanner, { Patient, Allergy } from "../../../../../components/ui/PatientBanner";
import { calculateNEWS2, AVPU, SpO2Scale, NEWS2Result } from "../../../../../lib/ews";

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
}

interface TrendPoint {
  recorded_at: string;
  value: number;
}

interface VitalsTrends {
  temperature?: TrendPoint[];
  pulse_rate?: TrendPoint[];
  respiratory_rate?: TrendPoint[];
  oxygen_saturation?: TrendPoint[];
  ews_score?: TrendPoint[];
}

export default function NurseTriageWorkbench() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params.id as string;

  // Active Tab
  const [activeTab, setActiveTab] = useState<"vitals" | "allergies" | "complaint" | "pregnancy" | "infection" | "trends">("vitals");

  // Core Data
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<TriageSummary | null>(null);
  const [trends, setTrends] = useState<VitalsTrends>({});
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

  // 1. Vitals Form States
  const [temperature, setTemperature] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [pulseRate, setPulseRate] = useState("");
  const [respiratoryRate, setRespiratoryRate] = useState("");
  const [oxygenSaturation, setOxygenSaturation] = useState("");
  const [spo2Scale, setSpo2Scale] = useState<SpO2Scale>(1);
  const [supplementalOxygen, setSupplementalOxygen] = useState(false);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [painScore, setPainScore] = useState("");
  const [gcsEye, setGcsEye] = useState("");
  const [gcsVerbal, setGcsVerbal] = useState("");
  const [gcsMotor, setGcsMotor] = useState("");
  const [bloodGlucose, setBloodGlucose] = useState("");
  const [consciousness, setConsciousness] = useState<AVPU>("A");
  const [triageCategory, setTriageCategory] = useState("3");

  // 2. Allergy Form States
  const [allergen, setAllergen] = useState("");
  const [allergyType, setAllergyType] = useState("Drug");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("mild");

  // 3. Presenting Complaint Form States
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");

  // 4. Pregnancy Form States
  const [isPregnant, setIsPregnant] = useState(false);
  const [lmp, setLmp] = useState("");
  const [gestationalWeeks, setGestationalWeeks] = useState("");

  // 5. Infection Screening States
  const [hasFever, setHasFever] = useState(false);
  const [hasCough, setHasCough] = useState(false);
  const [hasContactHistory, setHasContactHistory] = useState(false);
  const [hasTravelHistory, setHasTravelHistory] = useState(false);
  const [suspectedInfectionType, setSuspectedInfectionType] = useState("");

  // Fetch core patient data
  async function fetchSummaryData() {
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
        
        // Prefill complaints if already recorded
        if (s.encounter) {
          setChiefComplaint(s.encounter.chief_complaint || "");
          setHpi(s.encounter.history_of_present_illness || "");
        }
      }

      // Fetch trends data
      const trendsRes = await api.get(`/patients/${patientId}/vital-signs/trends?days=30`, token);
      if (trendsRes && trendsRes.data) {
        setTrends(trendsRes.data);
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load patient records.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && patientId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSummaryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, patientId]);

  // Compute NEWS2 Score dynamically as nurse updates inputs
  const currentVitalsPayload = {
    respirationRate: respiratoryRate ? parseInt(respiratoryRate) : undefined,
    spo2: oxygenSaturation ? parseInt(oxygenSaturation) : undefined,
    spo2Scale: spo2Scale,
    supplementalOxygen: supplementalOxygen,
    systolicBp: bloodPressure ? parseInt(bloodPressure.split("/")[0]) : undefined,
    pulseRate: pulseRate ? parseInt(pulseRate) : undefined,
    temperature: temperature ? parseFloat(temperature) : undefined,
    consciousness: consciousness,
  };
  const news2: NEWS2Result = calculateNEWS2(currentVitalsPayload);

  // Compute BMI dynamically
  const parsedWeight = parseFloat(weight);
  const parsedHeight = parseFloat(height);
  const bmi = parsedWeight && parsedHeight ? (parsedWeight / Math.pow(parsedHeight / 100, 2)).toFixed(1) : null;

  // Handle Vital Signs submission
  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    setFormErrors({});

    // Map consciousness input to database enum
    let dbConsciousness = "alert";
    if (consciousness === "C") dbConsciousness = "new_confusion";
    else if (consciousness !== "A") dbConsciousness = "unconscious";

    // Map color
    let dbColor = "green";
    if (news2.score >= 7) dbColor = "red";
    else if (news2.score >= 5 || news2.riskLevel === "Medium") dbColor = "yellow";

    const payload = {
      temperature: temperature ? parseFloat(temperature) : null,
      blood_pressure: bloodPressure || null,
      pulse_rate: pulseRate ? parseInt(pulseRate) : null,
      respiratory_rate: respiratoryRate ? parseInt(respiratoryRate) : null,
      oxygen_saturation: oxygenSaturation ? parseInt(oxygenSaturation) : null,
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      pain_score: painScore ? parseInt(painScore) : null,
      gcs_eye: gcsEye ? parseInt(gcsEye) : null,
      gcs_verbal: gcsVerbal ? parseInt(gcsVerbal) : null,
      gcs_motor: gcsMotor ? parseInt(gcsMotor) : null,
      blood_glucose: bloodGlucose ? parseFloat(bloodGlucose) : null,
      consciousness: dbConsciousness,
      triage_category: parseInt(triageCategory),
      triage_color: dbColor,
    };

    try {
      await api.post(`/patients/${patientId}/triage/vital-signs`, payload, token);
      setSuccessMsg("Vital signs and clinical NEWS2 score logged successfully.");
      
      // Reset forms and reload
      setTemperature("");
      setBloodPressure("");
      setPulseRate("");
      setRespiratoryRate("");
      setOxygenSaturation("");
      setSupplementalOxygen(false);
      setWeight("");
      setHeight("");
      setPainScore("");
      setGcsEye("");
      setGcsVerbal("");
      setGcsMotor("");
      setBloodGlucose("");
      setConsciousness("A");
      
      fetchSummaryData();
    } catch (err: unknown) {
      const apiError = err as { message?: string; errors?: Record<string, string[]> };
      setFormErrors(apiError.errors || {});
      setError(apiError.message || "Failed to record vital signs.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Handle Allergy submission
  const handleSaveAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allergen.trim()) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      allergen,
      allergy_type: allergyType,
      reaction: reaction || null,
      severity,
    };

    try {
      await api.post(`/patients/${patientId}/triage/allergies`, payload, token);
      setSuccessMsg("Allergy noted successfully.");
      setAllergen("");
      setReaction("");
      fetchSummaryData();
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError(apiError.message || "Failed to record allergy.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Confirm NKA
  const handleConfirmNKA = async () => {
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await api.post(`/patients/${patientId}/triage/confirm-allergies`, {}, token);
      setSuccessMsg("No Known Allergies (NKA) status confirmed.");
      fetchSummaryData();
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError(apiError.message || "Failed to confirm allergies.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Save Presenting Complaint
  const handleSaveComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) {
      setError("Chief Complaint is mandatory.");
      return;
    }
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      chief_complaint: chiefComplaint,
      history_of_present_illness: hpi || null,
    };

    try {
      await api.post(`/patients/${patientId}/triage/presenting-complaint`, payload, token);
      setSuccessMsg("Presenting complaints recorded successfully.");
      fetchSummaryData();
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError(apiError.message || "Failed to save complaints.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Save Pregnancy Status
  const handleSavePregnancy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      is_pregnant: isPregnant,
      last_menstrual_period: lmp || null,
      gestational_age_weeks: gestationalWeeks ? parseInt(gestationalWeeks) : null,
    };

    try {
      await api.post(`/patients/${patientId}/triage/pregnancy-status`, payload, token);
      setSuccessMsg("Pregnancy status successfully updated.");
      fetchSummaryData();
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError(apiError.message || "Failed to update pregnancy status.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Save Infection Screening
  const handleSaveInfection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);

    const payload = {
      has_fever: hasFever,
      has_cough: hasCough,
      has_contact_history: hasContactHistory,
      has_travel_history: hasTravelHistory,
      suspected_infection_type: suspectedInfectionType || null,
    };

    try {
      await api.post(`/patients/${patientId}/triage/infection-screening`, payload, token);
      setSuccessMsg("Infectious screening log saved. Precautions updated.");
      fetchSummaryData();
    } catch (err: unknown) {
      const apiError = err as { message?: string };
      setError(apiError.message || "Failed to save screening.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-sm font-mono text-gray-500">Loading patient triage file...</div>;
  }

  if (error && !patient) {
    return <div className="p-8 text-center text-sm text-red-600 font-bold">{error}</div>;
  }

  if (!patient) {
    return <div className="p-8 text-center text-sm text-gray-500">Patient profile not found.</div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      {/* Detail Header */}
      <section className="flex items-center gap-4 justify-between">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Nurse Desk</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-0.5">Triage Clinical Workbench</h1>
        </div>
        <button
          onClick={() => router.push("/patients")}
          className="px-3.5 py-1.5 border border-gray-300 rounded text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 transition-colors"
        >
          Back to Directory
        </button>
      </section>

      {/* Patient demographics clinical header */}
      <PatientBanner
        patient={patient}
        allergies={summary?.allergies}
        allergiesConfirmed={summary?.allergies_confirmed}
        isPregnant={summary?.pregnancy_status}
      />

      {/* Triage Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Hand Tab Navigation */}
        <div className="lg:col-span-1 flex flex-col gap-1 bg-white rounded border border-[#becab7]/50 p-3 h-fit">
          <button
            onClick={() => { setActiveTab("vitals"); setError(null); setSuccessMsg(null); }}
            className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
              activeTab === "vitals"
                ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Record Vitals & NEWS2
          </button>
          <button
            onClick={() => { setActiveTab("allergies"); setError(null); setSuccessMsg(null); }}
            className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
              activeTab === "allergies"
                ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Allergy Check
          </button>
          <button
            onClick={() => { setActiveTab("complaint"); setError(null); setSuccessMsg(null); }}
            className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
              activeTab === "complaint"
                ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Chief Complaint
          </button>
          {patient.gender === "Female" && (
            <button
              onClick={() => { setActiveTab("pregnancy"); setError(null); setSuccessMsg(null); }}
              className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
                activeTab === "pregnancy"
                  ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Pregnancy Assessment
            </button>
          )}
          <button
            onClick={() => { setActiveTab("infection"); setError(null); setSuccessMsg(null); }}
            className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
              activeTab === "infection"
                ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Infection Screening
          </button>
          <button
            onClick={() => { setActiveTab("trends"); setError(null); setSuccessMsg(null); }}
            className={`w-full text-left px-4 py-2.5 text-sm rounded font-bold transition-all relative ${
              activeTab === "trends"
                ? "bg-clinical-primary text-white border-l-4 border-brand-green"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Physiological Trends
          </button>
        </div>

        {/* Right Hand Active Tab Form Content */}
        <div className="lg:col-span-3 bg-white rounded border border-[#becab7]/50 p-6 flex flex-col justify-between min-h-[500px]">
          <div>
            {/* Global feedback message box */}
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

            {/* TAB 1: VITALS & EWS */}
            {activeTab === "vitals" && (
              <form onSubmit={handleSaveVitals} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Patient Physiological Measurements</h3>
                  <p className="text-xs text-[#5f5e5e] mt-0.5">Capture real-time clinical parameters to calculate automated NEWS2 risk alerts.</p>
                </div>

                {/* Real-time EWS Score Panel */}
                <div className={`p-4 rounded border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${
                  news2.score >= 7
                    ? "bg-red-50 border-red-200 text-red-900"
                    : news2.score >= 5 || news2.riskLevel === "Medium"
                      ? "bg-yellow-50 border-yellow-200 text-yellow-900"
                      : news2.score >= 1
                        ? "bg-emerald-50 border-emerald-100 text-emerald-950"
                        : "bg-gray-50 border-gray-200 text-gray-900"
                }`}>
                  <div>
                    <h4 className="text-sm font-bold uppercase tracking-wider">Automated NEWS2 Score</h4>
                    <p className="text-xs mt-1 text-gray-600 leading-normal">{news2.frequencyText}</p>
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-sm font-semibold uppercase tracking-widest">{news2.riskLevel} RISK</span>
                    <span className="text-5xl font-black font-mono tracking-tighter">{news2.score}</span>
                  </div>
                </div>

                {/* Form Fields Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Temp */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Temperature (°C)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                      placeholder="e.g. 36.5"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                    {formErrors.temperature && <p className="text-xs text-red-600 mt-1">{formErrors.temperature.join(" ")}</p>}
                  </div>

                  {/* BP */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Blood Pressure (Systolic/Diastolic)</label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                      placeholder="e.g. 120/80"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                    />
                    {formErrors.blood_pressure && <p className="text-xs text-red-600 mt-1">{formErrors.blood_pressure.join(" ")}</p>}
                  </div>

                  {/* Pulse */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Pulse Rate (bpm)</label>
                    <input
                      type="number"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                      placeholder="e.g. 72"
                      value={pulseRate}
                      onChange={(e) => setPulseRate(e.target.value)}
                    />
                    {formErrors.pulse_rate && <p className="text-xs text-red-600 mt-1">{formErrors.pulse_rate.join(" ")}</p>}
                  </div>

                  {/* RR */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Respiratory Rate (breaths/min)</label>
                    <input
                      type="number"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                      placeholder="e.g. 16"
                      value={respiratoryRate}
                      onChange={(e) => setRespiratoryRate(e.target.value)}
                    />
                    {formErrors.respiratory_rate && <p className="text-xs text-red-600 mt-1">{formErrors.respiratory_rate.join(" ")}</p>}
                  </div>

                  {/* SpO2 */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Oxygen Saturation (SpO2 %)</label>
                    <input
                      type="number"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                      placeholder="e.g. 98"
                      value={oxygenSaturation}
                      onChange={(e) => setOxygenSaturation(e.target.value)}
                    />
                    {formErrors.oxygen_saturation && <p className="text-xs text-red-600 mt-1">{formErrors.oxygen_saturation.join(" ")}</p>}
                  </div>

                  {/* SpO2 Scale */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Oxygen Scale (NEWS2)</label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm"
                      value={spo2Scale}
                      onChange={(e) => setSpo2Scale(parseInt(e.target.value) as SpO2Scale)}
                    >
                      <option value="1">Scale 1 (Normal Target ≥ 96%)</option>
                      <option value="2">Scale 2 (COPD Target 88-92%)</option>
                    </select>
                  </div>

                  {/* Supplemental Oxygen Toggle */}
                  <div className="flex items-center gap-2 self-end h-10">
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        className="h-4.5 w-4.5 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                        checked={supplementalOxygen}
                        onChange={(e) => setSupplementalOxygen(e.target.checked)}
                      />
                      On Supplemental Oxygen
                    </label>
                  </div>

                  {/* Consciousness AVPU */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Consciousness (AVPU)</label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm"
                      value={consciousness}
                      onChange={(e) => setConsciousness(e.target.value as AVPU)}
                    >
                      <option value="A">Alert (A)</option>
                      <option value="C">New Confusion (C)</option>
                      <option value="V">Voice response (V)</option>
                      <option value="P">Pain response (P)</option>
                      <option value="U">Unresponsive (U)</option>
                    </select>
                  </div>

                  {/* Triage Level (ESI) */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Triage Priority Category</label>
                    <select
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm"
                      value={triageCategory}
                      onChange={(e) => setTriageCategory(e.target.value)}
                    >
                      <option value="1">Level 1 - Resuscitation (Red)</option>
                      <option value="2">Level 2 - Emergent (Orange)</option>
                      <option value="3">Level 3 - Urgent (Yellow)</option>
                      <option value="4">Level 4 - Less Urgent (Green)</option>
                      <option value="5">Level 5 - Non-Urgent (Blue)</option>
                    </select>
                  </div>

                  {/* Weight */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                      placeholder="e.g. 70.0"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </div>

                  {/* Height */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Height (cm)</label>
                    <input
                      type="number"
                      step="0.5"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                      placeholder="e.g. 175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                    />
                  </div>

                  {/* BMI display */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Calculated BMI</label>
                    <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm font-mono text-gray-900 h-9.5 flex items-center">
                      {bmi ? `${bmi} kg/m²` : "Enter Wt & Ht to calculate"}
                    </div>
                  </div>

                  {/* Pain Score */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Pain Score (0 - 10)</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                      placeholder="0 = No Pain, 10 = Severe"
                      value={painScore}
                      onChange={(e) => setPainScore(e.target.value)}
                    />
                  </div>

                  {/* Blood Glucose */}
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Blood Glucose (mmol/L)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                      placeholder="e.g. 5.5"
                      value={bloodGlucose}
                      onChange={(e) => setBloodGlucose(e.target.value)}
                    />
                  </div>
                </div>

                {/* GCS Glasgow Coma Scale */}
                <div className="border-t border-gray-100 pt-6">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Glasgow Coma Scale (GCS)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">GCS Eye Response (1-4)</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                        placeholder="1 (None) to 4 (Spontaneous)"
                        value={gcsEye}
                        onChange={(e) => setGcsEye(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">GCS Verbal Response (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                        placeholder="1 (None) to 5 (Oriented)"
                        value={gcsVerbal}
                        onChange={(e) => setGcsVerbal(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">GCS Motor Response (1-6)</label>
                      <input
                        type="number"
                        min="1"
                        max="6"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                        placeholder="1 (None) to 6 (Obeys commands)"
                        value={gcsMotor}
                        onChange={(e) => setGcsMotor(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-6 py-2 bg-[#00a651] hover:bg-[#048f47] text-white font-bold text-sm rounded shadow-sm transition-all focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    {submitLoading ? "Saving Log..." : "Log Vital Signs"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: ALLERGIES CHECK */}
            {activeTab === "allergies" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Allergies & Reactions</h3>
                  <p className="text-xs text-[#5f5e5e] mt-0.5">Note adverse sensitivity reports or confirm NKA (No Known Allergies) for the clinical record.</p>
                </div>

                {/* List of current allergies */}
                <div className="bg-[#fcf9f8] p-4 rounded border border-gray-200/50">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Noted Allergies</h4>
                  {summary?.allergies && summary.allergies.length > 0 ? (
                    <div className="divide-y divide-gray-200 bg-white rounded border border-gray-100 overflow-hidden">
                      {summary.allergies.map((a) => (
                        <div key={a.id} className="px-4 py-3 flex justify-between items-center">
                          <div>
                            <span className="font-semibold text-gray-900 text-sm">{a.allergen}</span>
                            <span className="ml-2 text-xs text-gray-500">({a.severity} severity)</span>
                            {a.reaction && <p className="text-xs text-gray-600 mt-1">Reaction: {a.reaction}</p>}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                            a.severity === "severe"
                              ? "bg-red-100 text-red-800 border-red-200"
                              : a.severity === "moderate"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : "bg-gray-100 text-gray-800 border-gray-200"
                          }`}>
                            {a.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-sm text-gray-400">No allergies currently logged in profile.</div>
                  )}

                  {/* NKA confirmation button */}
                  {!summary?.allergies_confirmed && (!summary?.allergies || summary.allergies.length === 0) && (
                    <button
                      onClick={handleConfirmNKA}
                      disabled={submitLoading}
                      className="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-xs font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all focus:outline-none cursor-pointer"
                    >
                      Confirm No Known Allergies (NKA)
                    </button>
                  )}
                </div>

                {/* Add new allergy form */}
                <form onSubmit={handleSaveAllergy} className="space-y-6 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Add New Patient Allergy</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Allergen (e.g. Penicillin, Peanuts)</label>
                      <input
                        type="text"
                        required
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                        placeholder="Enter allergen name"
                        value={allergen}
                        onChange={(e) => setAllergen(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Allergen Type</label>
                      <select
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm"
                        value={allergyType}
                        onChange={(e) => setAllergyType(e.target.value)}
                      >
                        <option value="Drug">Drug</option>
                        <option value="Food">Food</option>
                        <option value="Environmental">Environmental</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Adverse Reaction Details (Optional)</label>
                      <input
                        type="text"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                        placeholder="e.g. Skin rashes, hives, swelling, anaphylaxis"
                        value={reaction}
                        onChange={(e) => setReaction(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Severity Level</label>
                      <select
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm"
                        value={severity}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeverity(e.target.value as typeof severity)}
                      >
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submitLoading || !allergen.trim()}
                      className="px-6 py-2 bg-[#00a651] hover:bg-[#048f47] text-white font-bold text-sm rounded shadow-sm transition-all focus:outline-none cursor-pointer disabled:opacity-50"
                    >
                      {submitLoading ? "Adding..." : "Log Allergy"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 3: CHIEF COMPLAINT */}
            {activeTab === "complaint" && (
              <form onSubmit={handleSaveComplaint} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Presenting Complaint</h3>
                  <p className="text-xs text-[#5f5e5e] mt-0.5">Record primary medical reasons and history of illness driving active clinical consultation.</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Chief Complaint (CC)</label>
                    <textarea
                      rows={3}
                      required
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                      placeholder="e.g. High fever for 3 days, dry cough, and sudden loss of appetite."
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">History of Present Illness (HPI)</label>
                    <textarea
                      rows={6}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                      placeholder="Record detailed onset, severity, location, timing, aggravating factors, and therapies attempted."
                      value={hpi}
                      onChange={(e) => setHpi(e.target.value)}
                    ></textarea>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={submitLoading || !chiefComplaint.trim()}
                    className="px-6 py-2 bg-[#00a651] hover:bg-[#048f47] text-white font-bold text-sm rounded shadow-sm transition-all focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    {submitLoading ? "Saving..." : "Log Complaints"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: PREGNANCY STATUS */}
            {activeTab === "pregnancy" && (
              <form onSubmit={handleSavePregnancy} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Pregnancy Status</h3>
                  <p className="text-xs text-[#5f5e5e] mt-0.5">Determine maternal gestational age and tracking parameters.</p>
                </div>

                <div className="space-y-6 bg-gray-50 p-4 rounded border border-gray-200/50">
                  <div className="flex items-center gap-2 h-10">
                    <label className="flex items-center gap-3 text-sm text-gray-800 cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        className="h-5 w-5 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                        checked={isPregnant}
                        onChange={(e) => setIsPregnant(e.target.checked)}
                      />
                      Is Patient Currently Pregnant?
                    </label>
                  </div>

                  {isPregnant && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                      <div>
                        <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Last Menstrual Period (LMP)</label>
                        <input
                          type="date"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900 font-mono"
                          value={lmp}
                          onChange={(e) => setLmp(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Gestational Age (weeks)</label>
                        <input
                          type="number"
                          min="0"
                          max="45"
                          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm font-mono text-gray-900"
                          placeholder="e.g. 24"
                          value={gestationalWeeks}
                          onChange={(e) => setGestationalWeeks(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-6 py-2 bg-[#00a651] hover:bg-[#048f47] text-white font-bold text-sm rounded shadow-sm transition-all focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    {submitLoading ? "Updating..." : "Update Pregnancy Record"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 5: INFECTION SCREENING */}
            {activeTab === "infection" && (
              <form onSubmit={handleSaveInfection} className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Infection screening</h3>
                  <p className="text-xs text-[#5f5e5e] mt-0.5">Flag potential infectious risk factors. Active flags alert and prompt isolation procedures.</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-[#fcf9f8] p-4 rounded border border-gray-200/50 space-y-3.5">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Infectious Risk Checklist</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4.5 w-4.5 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                          checked={hasFever}
                          onChange={(e) => setHasFever(e.target.checked)}
                        />
                        Presence of Active Fever
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4.5 w-4.5 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                          checked={hasCough}
                          onChange={(e) => setHasCough(e.target.checked)}
                        />
                        Presence of Productive Cough
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4.5 w-4.5 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                          checked={hasContactHistory}
                          onChange={(e) => setHasContactHistory(e.target.checked)}
                        />
                        Infectious Disease Contact History
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="checkbox"
                          className="h-4.5 w-4.5 text-clinical-primary rounded border-gray-300 focus:ring-clinical-primary"
                          checked={hasTravelHistory}
                          onChange={(e) => setHasTravelHistory(e.target.checked)}
                        />
                        Recent Travel History to Endemic Zones
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Suspected Infection / Remarks (Optional)</label>
                    <input
                      type="text"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary text-sm text-gray-900"
                      placeholder="e.g. Tuberculosis, Cholera, COVID-19"
                      value={suspectedInfectionType}
                      onChange={(e) => setSuspectedInfectionType(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="px-6 py-2 bg-[#00a651] hover:bg-[#048f47] text-white font-bold text-sm rounded shadow-sm transition-all focus:outline-none cursor-pointer disabled:opacity-50"
                  >
                    {submitLoading ? "Saving Log..." : "Log Screening"}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 6: PHYSIOLOGICAL TRENDS */}
            {activeTab === "trends" && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Physiological Trends</h3>
                  <p className="text-xs text-[#5f5e5e] mt-0.5">Trace vital parameters over the last 30 days. Allows evaluation of treatment responses.</p>
                </div>

                {Object.keys(trends).length === 0 ? (
                  <div className="text-center py-12 text-sm text-gray-400">No trend points logged for this patient profile yet.</div>
                ) : (
                  <div className="space-y-8">
                    {/* Temperature Trend */}
                    {trends.temperature && trends.temperature.length > 0 && (
                      <div className="bg-white p-4 rounded border border-[#becab7]/30">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Temperature Graph (°C)</h4>
                        <div className="h-40 flex items-end gap-1.5 pt-6 border-b border-l border-gray-200 px-3 relative">
                          {trends.temperature.map((point, index) => {
                            // Compute relative height
                            const val = point.value;
                            const minVal = 35;
                            const maxVal = 42;
                            const pct = Math.max(10, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));

                            return (
                              <div
                                key={index}
                                className="flex-1 bg-clinical-primary/70 hover:bg-clinical-primary transition-colors group relative rounded-t"
                                style={{ height: `${pct}%` }}
                              >
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-brand-dark text-white text-[10px] font-mono rounded shadow">
                                  {val}°C
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-400">
                          <span>Earliest</span>
                          <span>Latest Logs</span>
                        </div>
                      </div>
                    )}

                    {/* Pulse Trend */}
                    {trends.pulse_rate && trends.pulse_rate.length > 0 && (
                      <div className="bg-white p-4 rounded border border-[#becab7]/30">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Heart Pulse Trend (bpm)</h4>
                        <div className="h-40 flex items-end gap-1.5 pt-6 border-b border-l border-gray-200 px-3 relative">
                          {trends.pulse_rate.map((point, index) => {
                            const val = point.value;
                            const minVal = 40;
                            const maxVal = 160;
                            const pct = Math.max(10, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));

                            return (
                              <div
                                key={index}
                                className="flex-1 bg-sky-600/70 hover:bg-sky-600 transition-colors group relative rounded-t"
                                style={{ height: `${pct}%` }}
                              >
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-brand-dark text-white text-[10px] font-mono rounded shadow">
                                  {val}bpm
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-400">
                          <span>Earliest</span>
                          <span>Latest Logs</span>
                        </div>
                      </div>
                    )}

                    {/* SpO2 Trend */}
                    {trends.oxygen_saturation && trends.oxygen_saturation.length > 0 && (
                      <div className="bg-white p-4 rounded border border-[#becab7]/30">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Oxygen Saturation (%)</h4>
                        <div className="h-40 flex items-end gap-1.5 pt-6 border-b border-l border-gray-200 px-3 relative">
                          {trends.oxygen_saturation.map((point, index) => {
                            const val = point.value;
                            const minVal = 70;
                            const maxVal = 100;
                            const pct = Math.max(10, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));

                            return (
                              <div
                                key={index}
                                className="flex-1 bg-teal-600/70 hover:bg-teal-600 transition-colors group relative rounded-t"
                                style={{ height: `${pct}%` }}
                              >
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-brand-dark text-white text-[10px] font-mono rounded shadow">
                                  {val}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-400">
                          <span>Earliest</span>
                          <span>Latest Logs</span>
                        </div>
                      </div>
                    )}

                    {/* NEWS2 Score Trend */}
                    {trends.ews_score && trends.ews_score.length > 0 && (
                      <div className="bg-white p-4 rounded border border-[#becab7]/30">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Early Warning Score (NEWS2)</h4>
                        <div className="h-40 flex items-end gap-1.5 pt-6 border-b border-l border-gray-200 px-3 relative">
                          {trends.ews_score.map((point, index) => {
                            const val = point.value;
                            const minVal = 0;
                            const maxVal = 15;
                            const pct = Math.max(5, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));

                            return (
                              <div
                                key={index}
                                className={`flex-1 transition-colors group relative rounded-t ${
                                  val >= 7
                                    ? "bg-red-600/70 hover:bg-red-600"
                                    : val >= 5
                                      ? "bg-yellow-600/70 hover:bg-yellow-600"
                                      : "bg-emerald-600/70 hover:bg-emerald-600"
                                }`}
                                style={{ height: `${pct}%` }}
                              >
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-brand-dark text-white text-[10px] font-mono rounded shadow">
                                  Score: {val}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-gray-400">
                          <span>Earliest</span>
                          <span>Latest Logs</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
