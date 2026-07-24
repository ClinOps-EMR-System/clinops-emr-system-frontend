"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../../store/RoleContext";
import { api } from "../../../../../lib/api";
import PatientBanner from "../../../../../components/ui/PatientBanner";
import LoadingState from "../../../../../components/ui/LoadingState";

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

export default function WardRoundPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

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
    </div>
  );
}
