"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../../store/RoleContext";
import { api } from "../../../../../lib/api";
import PatientBanner from "../../../../../components/ui/PatientBanner";
import LoadingState from "../../../../../components/ui/LoadingState";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

interface Patient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  patient_category: string;
  village?: string;
  district?: string;
}

interface Encounter {
  id: number;
  patient_id: number;
  status: string;
}

interface Admission {
  id: number;
  ward_id: number | null;
  ward?: { name: string };
  bed_id: number | null;
  status: string;
  admission_date: string;
  discharge_date: string | null;
  discharge_diagnosis: string | null;
  discharge_summary: string | null;
}

export default function WardRoundPage() {
  usePageTitle("Ward Round");
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [dischargeMode, setDischargeMode] = useState(false);
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState("");
  const [dischargeSummary, setDischargeSummary] = useState("");
  const [discharging, setDischarging] = useState(false);

  const [reviewOfSystems, setReviewOfSystems] = useState("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  const [nursingNotes, setNursingNotes] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [patientRes, encounterRes] = await Promise.all([
          api.get(`/patients/${patientId}`, token),
          api.get(`/patients/${patientId}/encounters?per_page=1`, token),
        ]);

        if (patientRes) setPatient(patientRes.data || patientRes);
        if (encounterRes?.data?.length > 0) {
          setEncounter(encounterRes.data[0]);
          // Fetch admission for this encounter
          try {
            const admissionRes = await api.get(`/encounters/${encounterRes.data[0].id}/admission`, token);
            if (admissionRes?.data) {
              setAdmission(admissionRes.data);
            }
          } catch {
            // No admission found — patient is outpatient
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load patient data");
      } finally {
        setLoading(false);
      }
    }

    if (token && patientId) fetchData();
  }, [token, patientId]);

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().slice(0, 5);

  const handleSave = async () => {
    if (!encounter?.id) {
      setError("No active encounter found for this patient");
      return;
    }

    const hasContent = reviewOfSystems || subjective || objective || assessment || plan || currentMedications || nursingNotes;
    if (!hasContent) {
      setError("Please enter at least one field before saving");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const noteContent = [objective, assessment, plan].filter(Boolean).join("\n\n");
      await api.post(
        `/encounters/${encounter.id}/clinical-notes`,
        {
          note_type: "ward_round",
          content: noteContent || undefined,
          review_of_systems: reviewOfSystems || undefined,
          subjective: subjective || undefined,
          physical_examination: objective || undefined,
          assessment: assessment || undefined,
          plan: plan || undefined,
          current_medications: currentMedications || undefined,
          nursing_notes: nursingNotes || undefined,
        },
        token
      );
      setSuccessMsg("Ward round note saved");
      setTimeout(() => setSuccessMsg(""), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save ward round note");
    } finally {
      setSaving(false);
    }
  };

  const handleDischarge = async () => {
    if (!admission?.id) return;
    setDischarging(true);
    setError(null);
    try {
      await api.put(`/admissions/${admission.id}`, {
        status: "Discharged",
        discharge_diagnosis: dischargeDiagnosis || undefined,
        discharge_summary: dischargeSummary || undefined,
      }, token);
      setSuccessMsg("Patient discharged. Discharge summary saved.");
      setTimeout(() => router.push(`/patients/${patientId}`), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to discharge patient.");
      setDischarging(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading patient data..." fullPage />;
  }

  if (!patient) {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center text-sm text-red-600">
        Patient not found
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 font-sans">
      {/* Patient Banner */}
      <PatientBanner patient={patient} />

      {/* Page Header */}
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Clinical Notes</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Ward Round</h1>
          <p className="text-sm text-[#5f5e5e] mt-1 font-mono">
            {encounter ? `Encounter #${encounter.id} · ${encounter.status}` : "No active encounter"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {successMsg && (
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">{successMsg}</span>
          )}
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Back
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-clinical-primary text-white rounded font-bold text-sm hover:bg-clinical-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Note"}
          </button>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Ward Round Form */}
      <section className="bg-white rounded border border-[#becab7]/50 p-6 space-y-6">
        {/* Auto-filled date/time */}
        <div className="flex gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
            <input
              type="date"
              value={dateStr}
              readOnly
              className="border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 font-mono text-gray-500 w-40"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Time</label>
            <input
              type="time"
              value={timeStr}
              readOnly
              className="border border-gray-200 rounded px-3 py-2 text-sm bg-gray-50 font-mono text-gray-500 w-32"
            />
          </div>
        </div>

        {/* Review of Systems */}
        <div className="flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Review of Systems</label>
          <textarea
            rows={4}
            placeholder="Systematic review of symptoms..."
            value={reviewOfSystems}
            onChange={(e) => setReviewOfSystems(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
          />
        </div>

        {/* Subjective */}
        <div className="flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Subjective</label>
          <textarea
            rows={4}
            placeholder="Patient's own words, symptoms, concerns..."
            value={subjective}
            onChange={(e) => setSubjective(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
          />
        </div>

        {/* Objective */}
        <div className="flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Objective</label>
          <textarea
            rows={4}
            placeholder="Physical examination findings, vital signs, observations..."
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
          />
        </div>

        {/* Assessment */}
        <div className="flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Assessment</label>
          <textarea
            rows={4}
            placeholder="Clinical impression, differential diagnoses..."
            value={assessment}
            onChange={(e) => setAssessment(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
          />
        </div>

        {/* Plan */}
        <div className="flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Plan</label>
          <textarea
            rows={4}
            placeholder="Treatment plan, investigations, follow-up..."
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
          />
        </div>

        {/* Current Medications */}
        <div className="flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Current Medications</label>
          <textarea
            rows={2}
            placeholder="Current medications and dosages..."
            value={currentMedications}
            onChange={(e) => setCurrentMedications(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
          />
        </div>

        {/* Nursing Notes */}
        <div className="flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nursing Notes</label>
          <textarea
            rows={4}
            placeholder="Nursing observations, patient care notes..."
            value={nursingNotes}
            onChange={(e) => setNursingNotes(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
          />
        </div>
      </section>

      {/* Discharge Decision — only for admitted patients */}
      {admission && admission.status === "Admitted" && (
        <section className="bg-white rounded border border-[#becab7]/50 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500"></span>
            <h3 className="text-lg font-bold text-gray-900">Inpatient Decision</h3>
          </div>
          <p className="text-sm text-[#5f5e5e]">
            Based on today&apos;s ward round assessment, decide the next step for this patient.
          </p>

          {!dischargeMode ? (
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                disabled
                className="px-5 py-2.5 bg-gray-100 text-gray-500 text-sm font-bold rounded cursor-not-allowed"
              >
                Continue Inpatient Care
              </button>
              <button
                onClick={() => setDischargeMode(true)}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded shadow-sm transition-all cursor-pointer"
              >
                Ready for Discharge
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t border-gray-200">
              <h4 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Discharge Summary</h4>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Discharge Diagnosis</label>
                <textarea
                  rows={2}
                  placeholder="Final diagnosis at discharge..."
                  value={dischargeDiagnosis}
                  onChange={(e) => setDischargeDiagnosis(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Discharge Summary</label>
                <textarea
                  rows={4}
                  placeholder="Summary of hospital course, treatment given, and follow-up plan..."
                  value={dischargeSummary}
                  onChange={(e) => setDischargeSummary(e.target.value)}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  onClick={() => setDischargeMode(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-bold rounded hover:bg-gray-50 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDischarge}
                  disabled={discharging}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {discharging ? "Discharging..." : "Confirm Discharge"}
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
