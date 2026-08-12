"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { AlertTriangle, Heart, Wind, Activity } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

interface Patient {
  id: number;
  hospital_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
}

interface WaitingPatient {
  patient_id: number;
  hospital_number: string;
  full_name: string;
  chief_complaint: string;
  arrived_at: string;
  wait_minutes: number;
}

export default function EmergencyTriagePage() {
  usePageTitle("Emergency Triage");
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    consciousness: "alert" as "alert" | "verbal" | "pain" | "unresponsive",
    airway_patent: true,
    breathing_adequate: true,
    circulation_stable: true,
    pulse_rate: "",
    respiratory_rate: "",
    oxygen_saturation: "",
    severity_level: "",
    chief_complaint: "",
  });

  useEffect(() => {
    if (!token || !patientId) return;

    async function loadPatient() {
      try {
        setLoading(true);
        const res = await api.get(`/patients/${patientId}`, token);
        if (res?.data) {
          setPatient(res.data.patient || res.data);
        }

        const waitingRes = await api.get("/emergency/waiting", token);
        if (waitingRes?.data) {
          const waiting = (Array.isArray(waitingRes.data) ? waitingRes.data : (waitingRes.data as { data?: WaitingPatient[] }).data ?? []) as WaitingPatient[];
          const match = waiting.find((w) => w.patient_id === parseInt(patientId));
          if (match) {
            setForm((f) => ({ ...f, chief_complaint: match.chief_complaint || "" }));
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load patient");
      } finally {
        setLoading(false);
      }
    }

    loadPatient();
  }, [token, patientId]);

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !patientId) return;

    setSubmitting(true);
    setError(null);

    try {
      const triageRes = await api.post(`/emergency/${patientId}/rapid-triage`, {
        consciousness: form.consciousness,
        airway_patent: form.airway_patent,
        breathing_adequate: form.breathing_adequate,
        circulation_stable: form.circulation_stable,
        pulse_rate: parseInt(form.pulse_rate) || 0,
        respiratory_rate: parseInt(form.respiratory_rate) || 0,
        oxygen_saturation: parseInt(form.oxygen_saturation) || 0,
        severity_level: form.severity_level ? parseInt(form.severity_level) : undefined,
        chief_complaint: form.chief_complaint || undefined,
      }, token);

      if (triageRes) {
        router.push(`/patients/${patientId}`);
      }
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string; errors?: Record<string, string[]> };
      if (apiError.errors) {
        const firstError = Object.values(apiError.errors)[0];
        setError(firstError?.[0] || "Validation failed");
      } else {
        setError(apiError.message || "Failed to complete rapid triage");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 font-sans">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 font-sans">
        <div className="bg-red-50 border border-red-200 rounded p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-red-700 font-semibold">Patient not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 font-sans">
      {/* Header */}
      <section>
        <span className="text-xs font-bold text-red-600 tracking-widest uppercase">Emergency Rapid Triage</span>
        <h1 className="text-2xl font-bold text-[#1b1c1c] mt-1">
          {patient.first_name} {patient.last_name}
        </h1>
        <p className="text-sm text-[#5f5e5e] mt-1 font-mono">{patient.hospital_number}</p>
      </section>

      {/* Warning Banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-red-800">Rapid Assessment Mode</p>
          <p className="text-xs text-red-600 mt-0.5">
            This is a streamlined triage for emergency patients. Complete full triage after stabilization.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-sm text-red-700 font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ABC Assessment */}
        <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center">
            <div className="w-1.5 h-6 bg-red-500 rounded-full mr-3"></div>
            <h2 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider">Airway, Breathing, Circulation</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex items-center gap-3 p-4 rounded border border-gray-200 hover:border-red-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.airway_patent}
                onChange={(e) => handleChange("airway_patent", e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-bold text-gray-900">Airway Patent</span>
                <p className="text-xs text-gray-500">Clear airway</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded border border-gray-200 hover:border-red-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.breathing_adequate}
                onChange={(e) => handleChange("breathing_adequate", e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-bold text-gray-900">Breathing Adequate</span>
                <p className="text-xs text-gray-500">Respiratory effort</p>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 rounded border border-gray-200 hover:border-red-300 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={form.circulation_stable}
                onChange={(e) => handleChange("circulation_stable", e.target.checked)}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <div>
                <span className="text-sm font-bold text-gray-900">Circulation Stable</span>
                <p className="text-xs text-gray-500">Perfusion status</p>
              </div>
            </label>
          </div>
        </section>

        {/* Consciousness Level */}
        <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center">
            <div className="w-1.5 h-6 bg-amber-500 rounded-full mr-3"></div>
            <h2 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider">Consciousness Level (AVPU)</h2>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: "alert", label: "Alert", color: "border-emerald-300 bg-emerald-50" },
              { value: "verbal", label: "Verbal", color: "border-amber-300 bg-amber-50" },
              { value: "pain", label: "Pain", color: "border-orange-300 bg-orange-50" },
              { value: "unresponsive", label: "Unresponsive", color: "border-red-300 bg-red-50" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleChange("consciousness", opt.value)}
                className={`p-3 rounded border-2 text-sm font-bold transition-all ${
                  form.consciousness === opt.value
                    ? opt.color
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Vital Signs */}
        <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center">
            <div className="w-1.5 h-6 bg-sky-500 rounded-full mr-3"></div>
            <h2 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider">Vital Signs</h2>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">
                <Heart className="h-3 w-3 text-red-500" /> Pulse Rate (bpm) *
              </label>
              <input
                type="number"
                min="0"
                max="300"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={form.pulse_rate}
                onChange={(e) => handleChange("pulse_rate", e.target.value)}
                placeholder="e.g., 80"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">
                <Wind className="h-3 w-3 text-sky-500" /> Respiratory Rate *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={form.respiratory_rate}
                onChange={(e) => handleChange("respiratory_rate", e.target.value)}
                placeholder="e.g., 16"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">
                <Activity className="h-3 w-3 text-emerald-500" /> SpO2 (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={form.oxygen_saturation}
                onChange={(e) => handleChange("oxygen_saturation", e.target.value)}
                placeholder="e.g., 98"
              />
            </div>
          </div>
        </section>

        {/* Severity & Complaint */}
        <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center">
            <div className="w-1.5 h-6 bg-purple-500 rounded-full mr-3"></div>
            <h2 className="text-sm font-bold text-[#5f5e5e] uppercase tracking-wider">Assessment</h2>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Severity Level (1-5)</label>
              <p className="text-xs text-gray-500 mb-1">Leave blank to auto-calculate from EWS score</p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: "1", label: "L1", desc: "Red (Immediate)", color: "border-red-600 bg-red-600 text-white font-bold" },
                  { value: "2", label: "L2", desc: "Orange (Very Urgent)", color: "border-orange-500 bg-orange-500 text-white font-bold" },
                  { value: "3", label: "L3", desc: "Yellow (Urgent)", color: "border-amber-400 bg-amber-400 text-amber-950 font-bold" },
                  { value: "4", label: "L4", desc: "Green (Standard)", color: "border-emerald-500 bg-emerald-500 text-white font-bold" },
                  { value: "5", label: "L5", desc: "Blue (Non-Urgent)", color: "border-blue-500 bg-blue-500 text-white font-bold" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleChange("severity_level", opt.value)}
                    className={`p-2.5 rounded-lg border-2 text-center transition-all ${
                      form.severity_level === opt.value
                        ? opt.color
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span className="text-lg font-extrabold font-mono block">{opt.label}</span>
                    <span className="text-[10px] font-bold uppercase block leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Chief Complaint</label>
              <textarea
                rows={2}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={form.chief_complaint}
                onChange={(e) => handleChange("chief_complaint", e.target.value)}
                placeholder="Primary reason for emergency visit"
              />
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !form.pulse_rate || !form.respiratory_rate || !form.oxygen_saturation}
            className="px-6 py-2.5 text-sm font-bold text-white bg-red-600 rounded hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {submitting ? "Processing..." : "Complete Rapid Triage"}
          </button>
        </div>
      </form>
    </div>
  );
}
