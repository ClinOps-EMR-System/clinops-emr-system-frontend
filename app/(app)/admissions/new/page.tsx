"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { SectionHeader } from "@/components/ui/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Building2 } from "lucide-react";
import type { WardSummary, BedSummary } from "@/types/admission";

export default function NewAdmissionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const patientIdFromUrl = searchParams.get("patient_id");
  const encounterIdFromUrl = searchParams.get("encounter_id");

  const [patientId, setPatientId] = useState(patientIdFromUrl || "");
  const [encounterId, setEncounterId] = useState(encounterIdFromUrl || "");
  const [patientName, setPatientName] = useState("");
  const [hospitalNumber, setHospitalNumber] = useState("");
  const [wards, setWards] = useState<WardSummary[]>([]);
  const [beds, setBeds] = useState<BedSummary[]>([]);
  const [loading, setLoading] = useState(!!patientIdFromUrl);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [wardId, setWardId] = useState("");
  const [bedId, setBedId] = useState("");
  const [admissionType, setAdmissionType] = useState<"Emergency" | "Elective">("Emergency");
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState("");
  const [acuityLevel, setAcuityLevel] = useState<"Critical" | "High" | "Medium" | "Low">("Medium");
  const [isolationRequired, setIsolationRequired] = useState(false);

  const fetchWards = useCallback(async () => {
    try {
      const res = await api.get("/wards", token);
      if (res?.data) {
        setWards(Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      /* ignore */
    }
  }, [token]);

  useEffect(() => {
    if (!patientIdFromUrl) {
      setLoading(false);
      return;
    }
    async function init() {
      setLoading(true);
      try {
        const [patientRes] = await Promise.all([
          api.get(`/patients/${patientIdFromUrl}`, token),
          fetchWards(),
        ]);
        if (patientRes?.data?.patient) {
          setPatientName(
            `${patientRes.data.patient.first_name} ${patientRes.data.patient.last_name}`
          );
          setHospitalNumber(patientRes.data.patient.hospital_number);
        }
      } catch {
        setError("Failed to load patient data.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [patientIdFromUrl, token, fetchWards]);

  useEffect(() => {
    if (!wardId) {
      setBeds([]);
      setBedId("");
      return;
    }
    async function fetchBeds() {
      try {
        const res = await api.get(`/beds?ward_id=${wardId}&available=true`, token);
        if (res?.data) {
          const bedList = Array.isArray(res.data.beds)
            ? res.data.beds
            : Array.isArray(res.data.data)
              ? res.data.data
              : Array.isArray(res.data)
                ? res.data
                : [];
          setBeds(bedList);
        }
        setBedId("");
      } catch {
        setBeds([]);
      }
    }
    fetchBeds();
  }, [wardId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = patientId.trim();
    const encId = encounterId.trim();
    if (!pid) {
      setError("Patient ID is required.");
      return;
    }
    if (!encId) {
      setError("Encounter ID is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(
        "/admissions",
        {
          patient_id: parseInt(pid),
          encounter_id: parseInt(encId),
          ward_id: parseInt(wardId),
          bed_id: parseInt(bedId),
          admission_type: admissionType,
          admission_diagnosis: admissionDiagnosis || null,
          acuity_level: acuityLevel,
          isolation_required: isolationRequired,
        },
        token
      );
      if (encounterIdFromUrl) {
        await api.post(`/encounters/${encId}/complete`, {}, token);
      }
      setSuccessMsg("Patient admitted successfully.");
      setTimeout(() => router.push("/admissions"), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to admit patient.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-64 bg-muted rounded" />
          <div className="h-96 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <SectionHeader
        title="Admit Patient"
        description={patientName ? `${patientName} (${hospitalNumber})` : "Register a new inpatient admission"}
        action={
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Admission Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded bg-green-50 text-green-700 text-sm border border-green-200 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {successMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                  Patient <span className="text-red-500">*</span>
                </label>
                {patientIdFromUrl ? (
                  <div className="px-3 py-2 border border-border rounded bg-muted/30 text-sm text-foreground">
                    {patientName || `Patient #${patientIdFromUrl}`}
                  </div>
                ) : (
                  <input
                    type="number"
                    required
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    placeholder="Enter patient ID"
                    className="mt-1 block w-full px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                  Encounter ID <span className="text-red-500">*</span>
                </label>
                {encounterIdFromUrl ? (
                  <div className="px-3 py-2 border border-border rounded bg-muted/30 text-sm text-foreground font-mono">
                    {encounterIdFromUrl}
                  </div>
                ) : (
                  <input
                    type="number"
                    required
                    value={encounterId}
                    onChange={(e) => setEncounterId(e.target.value)}
                    placeholder="Enter encounter ID"
                    className="mt-1 block w-full px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                  Ward <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={wardId}
                  onChange={(e) => setWardId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select ward</option>
                  {wards.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                  Bed <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={bedId}
                  onChange={(e) => setBedId(e.target.value)}
                  disabled={!wardId}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">
                    {wardId ? beds.length === 0 ? "No available beds" : "Select bed" : "Select ward first"}
                  </option>
                  {beds.map((b) => (
                    <option key={b.id} value={b.id}>
                      Bed {b.bed_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Admission Type</label>
                <select
                  value={admissionType}
                  onChange={(e) => setAdmissionType(e.target.value as "Emergency" | "Elective")}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Emergency">Emergency</option>
                  <option value="Elective">Elective</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Acuity Level</label>
                <select
                  value={acuityLevel}
                  onChange={(e) => setAcuityLevel(e.target.value as "Critical" | "High" | "Medium" | "Low")}
                  className="mt-1 block w-full px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Admission Diagnosis</label>
              <textarea
                rows={3}
                value={admissionDiagnosis}
                onChange={(e) => setAdmissionDiagnosis(e.target.value)}
                placeholder="Enter admission diagnosis..."
                className="mt-1 block w-full px-3 py-2 border border-border rounded bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isolation"
                checked={isolationRequired}
                onChange={(e) => setIsolationRequired(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="isolation" className="text-sm font-semibold text-foreground">
                Isolation Required
              </label>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Admitting...
                  </>
                ) : (
                  "Admit Patient"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
