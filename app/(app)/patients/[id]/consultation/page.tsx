"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import type { Patient, Allergy } from "@/types/patient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/ui/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Loader2, Check, TriangleAlert, HeartPulse, Stethoscope,
  ClipboardList, ClipboardPen, FlaskConical, Pill, LogOut, DoorOpen,
  Search, Plus, X, History, Clock, ArrowRightLeft,
} from "lucide-react";
import DispositionModal from "@/components/clinical/DispositionModal";
import HandoverModal from "@/components/clinical/HandoverModal";

interface TimelineEvent {
  timestamp: string;
  title: string;
  category: string;
  detail: string;
}

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
  timeline?: TimelineEvent[];
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

interface Order {
  id: number;
  patient_id: number;
  encounter_id: number;
  order_type: string;
  test_name: string;
  loinc_code: string | null;
  clinical_indication: string | null;
  priority: string;
  status: string;
  ordered_at: string;
}

interface Prescription {
  id: number;
  patient_id: number;
  encounter_id: number;
  drug_name: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: number;
  status: string;
  notes: string | null;
  is_controlled: boolean;
  prescribed_at: string;
}

interface Drug {
  id: number;
  name: string;
  generic_name: string | null;
  formulation: string | null;
  strength: string | null;
}

type SubTab = "subjective" | "objective" | "assessment" | "plan" | "orders" | "prescriptions" | "timeline";

const subTabs: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: "subjective", label: "Subjective (S)", icon: <ClipboardPen className="h-4 w-4" /> },
  { key: "objective", label: "Objective (O)", icon: <HeartPulse className="h-4 w-4" /> },
  { key: "assessment", label: "Assessment (A)", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "plan", label: "Plan (P)", icon: <ClipboardPen className="h-4 w-4" /> },
  { key: "orders", label: "Orders", icon: <FlaskConical className="h-4 w-4" /> },
  { key: "prescriptions", label: "Rx", icon: <Pill className="h-4 w-4" /> },
  { key: "timeline", label: "Case Timeline", icon: <History className="h-4 w-4" /> },
];

function VitalsCard({ label, value, unit }: { label: string; value: string | null | undefined; unit?: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
        <p className="text-lg font-bold font-mono text-foreground mt-0.5">
          {value || "—"}{value && unit ? <span className="text-sm font-normal text-muted-foreground ml-0.5">{unit}</span> : null}
        </p>
      </CardContent>
    </Card>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 p-4">
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Skeleton className="h-80 w-full rounded-xl lg:col-span-1" />
        <Skeleton className="h-96 w-full rounded-xl lg:col-span-3" />
      </div>
    </div>
  );
}

export default function ClinicianSOAPConsultation() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params.id as string;

  const [activeSubTab, setActiveSubTab] = useState<SubTab>("subjective");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<TriageSummary | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");
  const [planInstructions, setPlanInstructions] = useState("");
  const [physicalExam, setPhysicalExam] = useState("");

  const [icdQuery, setIcdQuery] = useState("");
  const [icdResults, setIcdResults] = useState<Icd11Result[]>([]);
  const [selectedIcd, setSelectedIcd] = useState<Icd11Result | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [diagnosisType, setDiagnosisType] = useState<"Primary" | "Differential" | "Admission" | "Discharge" | "Final">("Primary");
  const [certainty, setCertainty] = useState("confirmed");

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderForm, setOrderForm] = useState({ test_name: "", clinical_indication: "", priority: "routine" });

  const [prescriptions] = useState<Prescription[]>([]);
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [rxForm, setRxForm] = useState({ dosage: "", route: "oral", frequency: "BD", duration: "7 days", quantity: "30", notes: "", is_controlled: false });

  const [dispositionOpen, setDispositionOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"discharge" | "admit" | "refer" | "observe" | "deceased">("discharge");

  async function fetchConsultationData() {
    try {
      setLoading(true);
      setError(null);

      const [patientRes, triageRes, diagnosesRes] = await Promise.all([
        api.get(`/patients/${patientId}`, token),
        api.get(`/patients/${patientId}/triage`, token),
        api.get("/diagnoses", token),
      ]);

      if (patientRes?.data) {
        setPatient(patientRes.data.patient);
      }
      if (triageRes?.data) {
        const s = triageRes.data as TriageSummary;
        setSummary(s);
        if (s.encounter) {
          setChiefComplaint(s.encounter.chief_complaint || "");
          setHpi(s.encounter.history_of_present_illness || "");
        }
      }
      if (diagnosesRes?.data) {
        const filtered = (diagnosesRes.data as (Diagnosis & { patient_id: number })[]).filter(
          (d) => d.patient_id === parseInt(patientId)
        );
        setDiagnoses(filtered);
      }

      try {
        const ordersRes = await api.get(`/orders?patient_id=${patientId}`, token);
        if (ordersRes?.data) {
          setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.data || []);
        }
      } catch { setOrders([]); }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load consultation data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && patientId) fetchConsultationData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [token, patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (icdQuery.trim().length >= 2) {
        try {
          setSearchLoading(true);
          const response = await api.get(`/icd11/search?q=${encodeURIComponent(icdQuery)}`, token);
          setIcdResults(response ? (response as Icd11Result[]) : []);
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

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (drugQuery.trim().length >= 2) {
        try {
          const response = await api.get(`/drugs?search=${encodeURIComponent(drugQuery)}`, token);
          setDrugResults(response?.data ? (Array.isArray(response.data) ? response.data : []) : []);
        } catch { setDrugResults([]); }
      } else {
        setDrugResults([]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [drugQuery, token]);

  const handleStartEncounter = async () => {
    setSubmitLoading(true);
    setError(null);
    try {
      await api.post(`/patients/${patientId}/check-in`, { encounter_type: "triage" }, token);
      fetchConsultationData();
    } catch {
      setError("Failed to start encounter.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSaveSubjective = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary?.encounter?.id) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/patients/${patientId}/triage/presenting-complaint`, {
        chief_complaint: chiefComplaint,
        history_of_present_illness: hpi || null,
      }, token);
      setSuccessMsg("Subjective notes saved.");
      fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSaveDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIcd || !summary?.encounter?.id) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post("/diagnoses", {
        patient_id: parseInt(patientId),
        encounter_id: summary.encounter.id,
        code: selectedIcd.code,
        description: selectedIcd.title,
        diagnosis_type: diagnosisType,
        certainty: certainty,
      }, token);
      setSuccessMsg(`Diagnosis ${selectedIcd.code} logged.`);
      setSelectedIcd(null);
      setIcdQuery("");
      fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to log diagnosis.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleDeleteDiagnosis = async (id: number) => {
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.delete(`/diagnoses/${id}`, token);
      setSuccessMsg("Diagnosis removed.");
      fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary?.encounter?.id) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/encounters/${summary.encounter.id}/clinical-notes`, {
        plan: planInstructions,
        note_type: "consultation_plan",
      }, token);
      setSuccessMsg("Plan saved.");
      fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save plan.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSavePhysicalExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary?.encounter?.id || !physicalExam.trim()) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/encounters/${summary.encounter.id}/clinical-notes`, {
        physical_examination: physicalExam,
        note_type: "physical_exam",
      }, token);
      setSuccessMsg("Physical exam saved.");
      fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary?.encounter?.id) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/encounters/${summary.encounter.id}/orders`, {
        patient_id: parseInt(patientId),
        order_type: "lab",
        test_name: orderForm.test_name || null,
        clinical_indication: orderForm.clinical_indication || null,
        priority: orderForm.priority,
      }, token);
      setSuccessMsg("Order placed.");
      setOrderForm({ test_name: "", clinical_indication: "", priority: "routine" });
      fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to place order.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summary?.encounter?.id || !selectedDrug) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/encounters/${summary.encounter.id}/prescriptions`, {
        patient_id: parseInt(patientId),
        drug_name: selectedDrug.name,
        generic_name: selectedDrug.generic_name,
        dosage: rxForm.dosage,
        route: rxForm.route,
        frequency: rxForm.frequency,
        duration: rxForm.duration,
        quantity: parseInt(rxForm.quantity) || 30,
        notes: rxForm.notes || null,
        is_controlled: rxForm.is_controlled,
      }, token);
      setSuccessMsg(`Prescription for ${selectedDrug.name} created.`);
      setSelectedDrug(null);
      setDrugQuery("");
      setRxForm({ dosage: "", route: "oral", frequency: "BD", duration: "7 days", quantity: "30", notes: "", is_controlled: false });
      fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create prescription.");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) return <LoadingPlaceholder />;

  if (error && !patient) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive">
          <TriangleAlert className="h-5 w-5" />
          <span className="font-semibold">{error}</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="rounded-lg border bg-muted/30 px-6 py-10">
          <Stethoscope className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold">Patient Not Found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const activeEncounterId = summary?.encounter?.id;

  const sidebarNav = (
    <nav className="flex flex-col gap-1">
      {subTabs.map((tab) => {
        const isActive = activeSubTab === tab.key;
        const count = tab.key === "orders" ? orders.length : tab.key === "prescriptions" ? prescriptions.length : tab.key === "assessment" ? diagnoses.length : undefined;
        return (
          <button
            key={tab.key}
            onClick={() => { setActiveSubTab(tab.key); setError(null); setSuccessMsg(null); }}
            className={cn(
              "w-full flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-lg font-bold transition-all text-left",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {tab.icon}
            <span className="flex-1">{tab.label}</span>
            {count !== undefined && count > 0 && (
              <Badge variant={isActive ? "outline" : "secondary"} className={cn(
                "text-[10px] px-1.5 py-0 font-mono",
                isActive && "border-primary-foreground/30 text-primary-foreground"
              )}>
                {count}
              </Badge>
            )}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Clinical Consultation"
        description={`${patient.first_name} ${patient.last_name} · #${patient.hospital_number} · SOAP Workbench`}
        action={
          <div className="flex gap-2">
            {activeEncounterId ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setHandoverOpen(true)}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Handover
                </Button>
                <Button
                  onClick={() => setDispositionOpen(true)}
                >
                  <LogOut className="h-4 w-4" />
                  Disposition
                </Button>
              </>
            ) : null}
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge label="In Consultation" variant="purple" pulse />
            {patient.patient_category && <Badge variant="outline">{patient.patient_category}</Badge>}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {summary?.allergies_confirmed && (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <Check className="h-3.5 w-3.5" /> NKA
              </span>
            )}
            {summary?.allergies && summary.allergies.length > 0 && (
              <span className="flex items-center gap-1 text-red-600 font-semibold">
                <TriangleAlert className="h-3.5 w-3.5" /> {summary.allergies.length} Allergy
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {!activeEncounterId ? (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <Stethoscope className="h-10 w-10 text-muted-foreground mx-auto" />
            <div>
              <h3 className="text-lg font-bold">No Active Encounter</h3>
              <p className="text-sm text-muted-foreground mt-1">Start a new visit to begin consultation.</p>
            </div>
            <Button onClick={handleStartEncounter} disabled={submitLoading} size="lg">
              {submitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Start New Visit
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-3">
                {sidebarNav}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-6 space-y-6">
                {successMsg && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 font-semibold flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600" /> {successMsg}
                  </div>
                )}
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-semibold flex items-center gap-2">
                    <TriangleAlert className="h-4 w-4 text-red-600" /> {error}
                  </div>
                )}

                {activeSubTab === "subjective" && (
                  <form onSubmit={handleSaveSubjective} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Subjective Findings</h3>
                      <p className="text-sm text-muted-foreground">Record the patient&apos;s complaints and history.</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                          Chief Complaint <span className="text-destructive">*</span>
                        </label>
                        <textarea
                          rows={3}
                          required
                          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={chiefComplaint}
                          onChange={(e) => setChiefComplaint(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                          History of Present Illness
                        </label>
                        <textarea
                          rows={6}
                          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          value={hpi}
                          onChange={(e) => setHpi(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={submitLoading || !chiefComplaint.trim()}>
                        {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Subjective
                      </Button>
                    </div>
                  </form>
                )}

                {activeSubTab === "objective" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Objective Findings</h3>
                      <p className="text-sm text-muted-foreground">Physiological measurements and physical exam.</p>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Latest Vitals</h4>
                      {summary?.vital_signs && summary.vital_signs.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <VitalsCard label="Temperature" value={summary.vital_signs[0].temperature ? `${summary.vital_signs[0].temperature}` : null} unit="°C" />
                          <VitalsCard label="Blood Pressure" value={summary.vital_signs[0].blood_pressure} unit="mmHg" />
                          <VitalsCard label="Pulse" value={summary.vital_signs[0].pulse_rate ? `${summary.vital_signs[0].pulse_rate}` : null} unit="bpm" />
                          <VitalsCard label="SpO₂" value={summary.vital_signs[0].oxygen_saturation ? `${summary.vital_signs[0].oxygen_saturation}` : null} unit="%" />
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">No vitals recorded for this encounter.</div>
                      )}
                    </div>

                    <Separator />

                    <form onSubmit={handleSavePhysicalExam} className="space-y-3">
                      <label className="block text-xs font-semibold text-foreground uppercase tracking-wide">Physical Exam Findings</label>
                      <textarea
                        rows={5}
                        className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="General appearance, chest sounds, abdominal exam, etc."
                        value={physicalExam}
                        onChange={(e) => setPhysicalExam(e.target.value)}
                      />
                      <div className="flex justify-end">
                        <Button type="submit" disabled={submitLoading || !physicalExam.trim()}>
                          {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Save Physical Exam
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {activeSubTab === "assessment" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Assessment & Diagnoses</h3>
                      <p className="text-sm text-muted-foreground">ICD-11 coded diagnoses for this encounter.</p>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Logged Diagnoses</h4>
                      {diagnoses.length > 0 ? (
                        <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
                          {diagnoses.map((d) => (
                            <div key={d.id} className="px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <Badge variant="outline" className="font-mono text-xs shrink-0">{d.code}</Badge>
                                <div className="min-w-0">
                                  <span className="font-medium text-sm block truncate">{d.description}</span>
                                  <span className="text-xs text-muted-foreground">{d.diagnosis_type}{d.certainty ? ` · ${d.certainty}` : ""}</span>
                                </div>
                              </div>
                              <button onClick={() => handleDeleteDiagnosis(d.id)} className="text-xs text-destructive hover:text-destructive/80 font-bold uppercase shrink-0 ml-2">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">No diagnoses logged.</div>
                      )}
                    </div>

                    <Separator />

                    <form onSubmit={handleSaveDiagnosis} className="space-y-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Add ICD-11 Code</h4>

                      <div className="relative">
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Search Diagnosis</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <input
                            type="text"
                            className="block w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            placeholder="Search WHO ICD-11..."
                            value={icdQuery}
                            onChange={(e) => setIcdQuery(e.target.value)}
                          />
                        </div>
                        {searchLoading && (
                          <div className="absolute left-0 right-0 mt-1 p-3 bg-card border rounded-lg shadow-lg text-xs text-muted-foreground z-30">
                            Searching...
                          </div>
                        )}
                        {!searchLoading && icdResults.length > 0 && (
                          <ul className="absolute left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg max-h-60 overflow-y-auto z-30 divide-y text-sm">
                            {icdResults.map((result, idx) => (
                              <li key={idx}>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedIcd(result); setIcdResults([]); }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-muted/50 flex items-baseline justify-between transition-colors"
                                >
                                  <span className="font-medium text-foreground">{result.title}</span>
                                  <Badge variant="outline" className="font-mono text-xs ml-3 shrink-0">{result.code}</Badge>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {selectedIcd && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Selected</span>
                            <p className="text-sm font-semibold text-emerald-950 mt-0.5">
                              <Badge variant="outline" className="font-mono mr-2 bg-emerald-100 text-emerald-800 border-emerald-300">{selectedIcd.code}</Badge>
                              {selectedIcd.title}
                            </p>
                          </div>
                          <button type="button" onClick={() => setSelectedIcd(null)} className="text-xs text-muted-foreground hover:text-foreground font-bold uppercase">
                            Clear
                          </button>
                        </div>
                      )}

                      {selectedIcd && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Type</label>
                            <select
                              className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                              value={diagnosisType}
                              onChange={(e) => setDiagnosisType(e.target.value as typeof diagnosisType)}
                            >
                              <option value="Primary">Primary</option>
                              <option value="Differential">Differential</option>
                              <option value="Admission">Admission</option>
                              <option value="Discharge">Discharge</option>
                              <option value="Final">Final</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Certainty</label>
                            <select
                              className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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

                      <div className="flex justify-end">
                        <Button type="submit" disabled={submitLoading || !selectedIcd}>
                          {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Log Diagnosis
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {activeSubTab === "plan" && (
                  <form onSubmit={handleSavePlan} className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Treatment Plan</h3>
                      <p className="text-sm text-muted-foreground">Instructions for nursing, pharmacy, and next steps.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Clinician&apos;s Plan</label>
                      <textarea
                        rows={6}
                        className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Medications, referrals, follow-up, etc."
                        value={planInstructions}
                        onChange={(e) => setPlanInstructions(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={submitLoading}>
                        {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save Plan
                      </Button>
                    </div>
                  </form>
                )}

                {activeSubTab === "orders" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Lab & Imaging Orders</h3>
                      <p className="text-sm text-muted-foreground">Diagnostic test requests.</p>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Order History</h4>
                      {orders.length > 0 ? (
                        <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
                          {orders.map((order) => (
                            <div key={order.id} className="px-4 py-3 flex items-center justify-between">
                              <div className="min-w-0">
                                <span className="font-medium text-sm">{order.order_type}</span>
                                {order.clinical_indication && (
                                  <span className="ml-2 text-xs text-muted-foreground">— {order.clinical_indication}</span>
                                )}
                              </div>
                              <StatusBadge
                                label={order.status}
                                variant={order.status?.toLowerCase() === "completed" ? "success" : "warning"}
                                size="sm"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">No orders yet.</div>
                      )}
                    </div>

                    <Separator />

                    <form onSubmit={handleCreateOrder} className="space-y-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Place New Order</h4>
                      <div>
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                          Test Name <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="e.g. CBC, Basic Metabolic Panel"
                          value={orderForm.test_name}
                          onChange={(e) => setOrderForm({ ...orderForm, test_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                          Clinical Indication
                        </label>
                        <input
                          type="text"
                          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="Reason for test"
                          value={orderForm.clinical_indication}
                          onChange={(e) => setOrderForm({ ...orderForm, clinical_indication: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Priority</label>
                        <select
                          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                          value={orderForm.priority}
                          onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value })}
                        >
                          <option value="routine">Routine</option>
                          <option value="urgent">Urgent</option>
                          <option value="stat">STAT</option>
                        </select>
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={submitLoading || !orderForm.test_name.trim()}>
                          {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Place Order
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {activeSubTab === "prescriptions" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Prescriptions</h3>
                      <p className="text-sm text-muted-foreground">Medication orders for this patient.</p>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Active Prescriptions</h4>
                      {prescriptions.length > 0 ? (
                        <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
                          {prescriptions.map((rx) => (
                            <div key={rx.id} className="px-4 py-3 flex items-center justify-between">
                              <div className="min-w-0">
                                <span className="font-medium text-sm">{rx.drug_name}</span>
                                <span className="ml-2 font-mono text-xs text-muted-foreground">{rx.dosage} {rx.route} — {rx.frequency}</span>
                                {rx.is_controlled && (
                                  <Badge variant="destructive" className="ml-2 text-[10px]">Controlled</Badge>
                                )}
                              </div>
                              <StatusBadge label={rx.status} variant={rx.status?.toLowerCase() === "dispensed" ? "success" : "warning"} size="sm" />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">No active prescriptions.</div>
                      )}
                    </div>

                    <Separator />

                    <form onSubmit={handleCreatePrescription} className="space-y-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">New Prescription</h4>

                      <div className="relative">
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">
                          Drug <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          placeholder="Search drug..."
                          value={drugQuery}
                          onChange={(e) => { setDrugQuery(e.target.value); setSelectedDrug(null); }}
                        />
                        {drugResults.length > 0 && !selectedDrug && (
                          <ul className="absolute left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg max-h-48 overflow-y-auto z-30 divide-y text-sm">
                            {drugResults.map((drug) => (
                              <li key={drug.id}>
                                <button
                                  type="button"
                                  onClick={() => { setSelectedDrug(drug); setDrugQuery(drug.name); setDrugResults([]); }}
                                  className="w-full text-left px-4 py-2.5 hover:bg-muted/50 flex items-baseline justify-between transition-colors"
                                >
                                  <span className="font-medium text-foreground">{drug.name}</span>
                                  <span className="text-xs text-muted-foreground">{drug.formulation} {drug.strength}</span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {selectedDrug && (
                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Selected: </span>
                            <span className="text-sm font-semibold text-emerald-950">{selectedDrug.name}</span>
                            {selectedDrug.formulation && <span className="ml-2 text-xs text-emerald-700">{selectedDrug.formulation} {selectedDrug.strength}</span>}
                          </div>
                          <button type="button" onClick={() => { setSelectedDrug(null); setDrugQuery(""); }} className="text-xs text-muted-foreground hover:text-foreground font-bold uppercase">Clear</button>
                        </div>
                      )}

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Dosage <span className="text-destructive">*</span></label>
                          <input type="text" required className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="500mg" value={rxForm.dosage} onChange={(e) => setRxForm({ ...rxForm, dosage: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Route</label>
                          <select className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={rxForm.route} onChange={(e) => setRxForm({ ...rxForm, route: e.target.value })}>
                            <option value="oral">Oral</option>
                            <option value="iv">IV</option>
                            <option value="im">IM</option>
                            <option value="sc">SC</option>
                            <option value="topical">Topical</option>
                            <option value="inhaled">Inhaled</option>
                            <option value="rectal">Rectal</option>
                            <option value="sublingual">Sublingual</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Frequency</label>
                          <select className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={rxForm.frequency} onChange={(e) => setRxForm({ ...rxForm, frequency: e.target.value })}>
                            <option value="OD">Once daily</option>
                            <option value="BD">Twice daily</option>
                            <option value="TDS">Three times</option>
                            <option value="QDS">Four times</option>
                            <option value="PRN">As needed</option>
                            <option value="STAT">Immediately</option>
                            <option value="NOCTE">At night</option>
                            <option value="MANE">Morning</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Duration</label>
                          <input type="text" className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="7 days" value={rxForm.duration} onChange={(e) => setRxForm({ ...rxForm, duration: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Quantity</label>
                          <input type="number" min="1" className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono" value={rxForm.quantity} onChange={(e) => setRxForm({ ...rxForm, quantity: e.target.value })} />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="checkbox" checked={rxForm.is_controlled} onChange={(e) => setRxForm({ ...rxForm, is_controlled: e.target.checked })} className="rounded border-input text-destructive focus:ring-destructive" />
                            <span className="font-medium text-foreground">Controlled</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide mb-1.5">Notes</label>
                        <input type="text" className="block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" placeholder="Take after food" value={rxForm.notes} onChange={(e) => setRxForm({ ...rxForm, notes: e.target.value })} />
                      </div>
                      <div className="flex justify-end">
                        <Button type="submit" disabled={submitLoading || !selectedDrug}>
                          {submitLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Create Prescription
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {activeSubTab === "timeline" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Chronological Case Timeline</h3>
                      <p className="text-sm text-muted-foreground">Event-driven log of all clinical interactions and care decisions.</p>
                    </div>

                    {summary?.timeline && summary.timeline.length > 0 ? (
                      <div className="relative pl-6 border-l-2 border-primary/30 space-y-6">
                        {summary.timeline.map((event, idx) => {
                          const date = new Date(event.timestamp);
                          const timeStr = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                          const dateStr = date.toLocaleDateString([], { month: "short", day: "numeric" });
                          return (
                            <div key={idx} className="relative group">
                              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-primary border-4 border-background" />
                              <div className="bg-muted/30 rounded-lg p-4 border border-border/60 hover:border-primary/40 transition-colors">
                                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                                  <span className="font-bold text-sm text-foreground">{event.title}</span>
                                  <span className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {dateStr} {timeStr}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground font-mono leading-relaxed">{event.detail}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p>No timeline events recorded for this encounter yet.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {activeEncounterId && (
              <Card className="mt-6 border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Patient Case Disposition & Sign-Off
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select clinical disposition to complete consultation and transfer the case to the appropriate destination.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <Button
                      variant="default"
                      className="h-auto py-3 flex flex-col items-center justify-center gap-1.5"
                      onClick={() => { setActiveTab("discharge"); setDispositionOpen(true); }}
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-bold">Discharge Home</span>
                      <span className="text-[10px] opacity-80 font-normal">Patient sent home with instructions</span>
                    </Button>

                    <Button
                      variant="secondary"
                      className="h-auto py-3 flex flex-col items-center justify-center gap-1.5"
                      onClick={() => { setActiveTab("admit"); setDispositionOpen(true); }}
                    >
                      <DoorOpen className="h-5 w-5 text-purple-600" />
                      <span className="font-bold text-purple-950">Admit to Ward</span>
                      <span className="text-[10px] text-purple-700 font-normal">Transfer to Inpatient Ward</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center justify-center gap-1.5 border-sky-300 bg-sky-50/50 hover:bg-sky-100"
                      onClick={() => { setActiveTab("refer"); setDispositionOpen(true); }}
                    >
                      <Stethoscope className="h-5 w-5 text-sky-600" />
                      <span className="font-bold text-sky-950">Refer Patient</span>
                      <span className="text-[10px] text-sky-700 font-normal">Specialty or External Hospital</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center justify-center gap-1.5 border-amber-300 bg-amber-50/50 hover:bg-amber-100"
                      onClick={() => { setActiveTab("observe"); setDispositionOpen(true); }}
                    >
                      <HeartPulse className="h-5 w-5 text-amber-600" />
                      <span className="font-bold text-amber-950">Short-Stay Observation</span>
                      <span className="text-[10px] text-amber-700 font-normal">Retain for ED serial vitals</span>
                    </Button>

                    <Button
                      variant="outline"
                      className="h-auto py-3 flex flex-col items-center justify-center gap-1.5 border-red-300 bg-red-50/50 hover:bg-red-100"
                      onClick={() => { setActiveTab("deceased"); setDispositionOpen(true); }}
                    >
                      <span className="font-bold text-red-950">Deceased</span>
                      <span className="text-[10px] text-red-700 font-normal">Record patient death</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      <HandoverModal
        open={handoverOpen}
        onClose={() => setHandoverOpen(false)}
        patientId={parseInt(patientId)}
        encounterId={activeEncounterId!}
        patientName={patient ? `${patient.first_name} ${patient.last_name}` : ""}
      />

      <DispositionModal
        open={dispositionOpen}
        onClose={() => setDispositionOpen(false)}
        encounterId={activeEncounterId!}
        patientId={patientId}
        patientName={patient ? `${patient.first_name} ${patient.last_name}` : ""}
        onDisposed={() => { fetchConsultationData(); }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}
