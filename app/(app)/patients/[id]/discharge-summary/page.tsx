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

interface Admission {
  id: number;
  ward: { name: string; code: string };
  bed: { bed_number: string };
  admission_date: string;
  admission_diagnosis: string;
  acuity_level: string;
  status: string;
}

interface Diagnosis {
  id: number;
  diagnosis_name: string;
  icd_code?: string;
  is_primary: boolean;
}

interface VitalSign {
  recorded_at: string;
  temperature?: number;
  heart_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  spo2?: number;
  ews_score?: number;
}

interface Encounter {
  id: number;
  patient_id: number;
  status: string;
}

export default function DischargeSummaryPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [admission, setAdmission] = useState<Admission | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [latestVitals, setLatestVitals] = useState<VitalSign | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const [dischargeDiagnosis, setDischargeDiagnosis] = useState("");
  const [dischargeSummary, setDischargeSummary] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [patientRes, encounterRes, diagnosisRes, vitalsRes] = await Promise.all([
          api.get(`/patients/${patientId}`, token),
          api.get(`/patients/${patientId}/encounters?per_page=1`, token),
          api.get(`/patients/${patientId}/diagnoses`, token),
          api.get(`/patients/${patientId}/vital-signs?per_page=1`, token),
        ]);

        if (patientRes) setPatient(patientRes.data || patientRes);
        if (encounterRes?.data?.length > 0) setEncounter(encounterRes.data[0]);
        if (diagnosisRes?.data) setDiagnoses(diagnosisRes.data);
        if (vitalsRes?.data?.length > 0) setLatestVitals(vitalsRes.data[0]);

        // Try to fetch active admission
        try {
          const admRes = await api.get(`/admissions?status=Admitted&patient_id=${patientId}`, token);
          if (admRes?.data?.length > 0) {
            setAdmission(admRes.data[0]);
          }
        } catch {
          // Admissions endpoint not available yet
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load patient data");
      } finally {
        setLoading(false);
      }
    }

    if (token && patientId) fetchData();
  }, [token, patientId]);

  const handleDischarge = async () => {
    if (!admission?.id) {
      setError("No active admission found for discharge");
      return;
    }

    if (!dischargeDiagnosis.trim()) {
      setError("Discharge diagnosis is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await api.put(
        `/admissions/${admission.id}`,
        {
          status: "Discharged",
          discharge_date: new Date().toISOString(),
          discharge_diagnosis: dischargeDiagnosis,
          discharge_summary: dischargeSummary,
        },
        token
      );

      if (encounter?.id) {
        await api.post(`/encounters/${encounter.id}/transition`, { status: "discharged" }, token);
      }

      setSuccessMsg("Patient discharged successfully");
      setTimeout(() => router.push(`/patients/${patientId}`), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to discharge patient");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading discharge summary..." fullPage />;
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
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Discharge</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Discharge Summary</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Print
          </button>
          <button
            onClick={handleDischarge}
            disabled={saving}
            className="px-6 py-2 bg-clinical-primary text-white rounded font-bold text-sm hover:bg-clinical-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? "Discharging..." : "Discharge Patient"}
          </button>
        </div>
      </section>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMsg && (
        <div role="status" className="bg-emerald-50 border border-emerald-200 rounded p-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {/* Read-only Admission Info */}
      <section className="bg-gray-50 rounded border border-gray-200 p-6 space-y-4">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Admission Information</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          {admission ? (
            <>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wider">Ward</span>
                <p className="font-semibold text-gray-900 mt-0.5">{admission.ward?.name} ({admission.ward?.code})</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wider">Bed</span>
                <p className="font-semibold text-gray-900 mt-0.5">Bed #{admission.bed?.bed_number}</p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wider">Admission Date</span>
                <p className="font-semibold text-gray-900 mt-0.5 font-mono">
                  {new Date(admission.admission_date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>
              <div>
                <span className="text-gray-500 text-xs uppercase tracking-wider">Acuity Level</span>
                <p className="font-semibold text-gray-900 mt-0.5">{admission.acuity_level || "Not specified"}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-gray-500 text-xs uppercase tracking-wider">Admission Diagnosis</span>
                <p className="font-semibold text-gray-900 mt-0.5">{admission.admission_diagnosis || "Not recorded"}</p>
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 text-sm text-gray-500 italic">
              No active admission record found — discharge form below uses mock admission.
            </div>
          )}
        </div>

        {/* Diagnoses */}
        {diagnoses.length > 0 && (
          <div className="mt-4">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Diagnoses</span>
            <ul className="mt-1 space-y-1">
              {diagnoses.map((d) => (
                <li key={d.id} className="text-sm font-semibold text-gray-900">
                  {d.is_primary && <span className="text-brand-green mr-1">●</span>}
                  {d.diagnosis_name}
                  {d.icd_code && <span className="text-xs text-gray-500 ml-2 font-mono">{d.icd_code}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Latest Vitals */}
        {latestVitals && (
          <div className="mt-4">
            <span className="text-gray-500 text-xs uppercase tracking-wider">Latest Vitals</span>
            <div className="mt-1 flex flex-wrap gap-4 text-sm">
              {latestVitals.temperature != null && (
                <span className="font-mono"><strong>{latestVitals.temperature}°C</strong> <span className="text-gray-500">Temp</span></span>
              )}
              {latestVitals.heart_rate != null && (
                <span className="font-mono"><strong>{latestVitals.heart_rate}</strong> <span className="text-gray-500">HR</span></span>
              )}
              {latestVitals.systolic_bp != null && latestVitals.diastolic_bp != null && (
                <span className="font-mono"><strong>{latestVitals.systolic_bp}/{latestVitals.diastolic_bp}</strong> <span className="text-gray-500">BP</span></span>
              )}
              {latestVitals.spo2 != null && (
                <span className="font-mono"><strong>{latestVitals.spo2}%</strong> <span className="text-gray-500">SpO2</span></span>
              )}
              {latestVitals.ews_score != null && (
                <span className="font-mono"><strong>EWS {latestVitals.ews_score}</strong></span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Editable Discharge Form */}
      <section className="bg-white rounded border border-[#becab7]/50 p-6 space-y-6">
        <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Discharge Details</h2>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Discharge Diagnosis <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            placeholder="Final diagnosis at discharge..."
            value={dischargeDiagnosis}
            onChange={(e) => setDischargeDiagnosis(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Discharge Summary</label>
          <textarea
            rows={6}
            placeholder="Summary of treatment, patient response, follow-up instructions, medications at discharge..."
            value={dischargeSummary}
            onChange={(e) => setDischargeSummary(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary resize-none"
          />
        </div>
      </section>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          nav, aside, header, footer, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
