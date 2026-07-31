"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Activity,
  Heart,
  Thermometer,
  Wind,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Send,
  Bed,
  Building2,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export interface WardRoundEntry {
  id: number;
  admission_id: number;
  doctor_id: number;
  doctor?: {
    id: number;
    name: string;
    email: string;
    role?: string | null;
  } | null;
  soap_notes: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  vital_signs?: {
    temperature?: number | string;
    pulse?: number | string;
    blood_pressure?: string;
    respiratory_rate?: number | string;
    spo2?: number | string;
  } | null;
  is_attending_approved: boolean;
  created_at: string;
}

export interface AdmissionDetails {
  id: number;
  patient_id: number;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number?: string;
    gender?: string;
    dob?: string;
  };
  ward?: {
    id: number;
    name: string;
  };
  bed?: {
    id: number;
    bed_number: string;
  };
  admission_diagnosis?: string;
  admission_date?: string;
  status?: string;
}

const TEMPLATES = [
  {
    label: "Routine / Stable",
    badge: "Stable",
    data: {
      subjective: "Patient expresses feeling well today. Denies acute discomfort, shortness of breath, or nausea. Sleeping well.",
      objective: "Vitals stable. Alert and oriented x3. Lungs clear to auscultation bilaterally. Abdomen soft, non-tender. Surgical sites clean and dry.",
      assessment: "Patient is progressing as expected. Clinical status stable.",
      plan: "1. Continue current medication regimen.\n2. Encourage ambulation as tolerated.\n3. Monitor vital signs Q8H.",
    },
  },
  {
    label: "Post-Op Day 1",
    badge: "Post-Op",
    data: {
      subjective: "Post-Op Day 1. Patient reports mild to moderate incisional pain (4/10), controlled with oral analgesics. Nausea resolved.",
      objective: "Vitals: BP stable, afebril, SpO2 >95% on room air. Surgical dressing dry and intact. No active bleeding. Bowel sounds present.",
      assessment: "Post-operative Day 1, recovering well without early complications.",
      plan: "1. Advance diet as tolerated.\n2. Incentive spirometry Q2H while awake.\n3. Remove Foley catheter if output adequate.",
    },
  },
  {
    label: "Deteriorating / Alert",
    badge: "Acute",
    data: {
      subjective: "Patient reports sudden onset shortness of breath and mild dizziness. Increased chest tightness over past hour.",
      objective: "Febrile (38.5°C), Tachycardic (HR 115 bpm), SpO2 91% on room air. Tachypneic (RR 24/min). Mild bilateral basilar crackles.",
      assessment: "Acute clinical deterioration. Suspected hospital-acquired pneumonia or pulmonary embolism.",
      plan: "1. Place on 3L O2 via nasal cannula immediately.\n2. Stat Chest X-Ray and ABG.\n3. Consult Pulmonology / ICU team.",
    },
  },
  {
    label: "Ready for Discharge",
    badge: "Discharge",
    data: {
      subjective: "Patient feels fully recovered and ready for discharge home. Independent with daily activities.",
      objective: "Afebril x 48 hours. Vitals entirely normal. Surgical wounds healed/healed by primary intention. Lab results within normal limits.",
      assessment: "Resolved primary illness. Fit for discharge.",
      plan: "1. Prepare discharge summary and prescriptions.\n2. Patient education on oral medications.\n3. Outpatient clinic follow-up in 2 weeks.",
    },
  },
];

export default function WardRoundsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const admissionId = resolvedParams.id;
  const { token } = useAuth();

  const [admission, setAdmission] = useState<AdmissionDetails | null>(null);
  const [rounds, setRounds] = useState<WardRoundEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [soap, setSoap] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
  });

  const [vitals, setVitals] = useState({
    temperature: "",
    pulse: "",
    blood_pressure: "",
    respiratory_rate: "",
    spo2: "",
  });

  const [isAttendingApproved, setIsAttendingApproved] = useState<boolean>(true);
  const [expandedRoundId, setExpandedRoundId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!token || !admissionId) return;
    setLoading(true);
    setError(null);

    try {
      const [admissionRes, roundsRes] = await Promise.allSettled([
        api.get(`/admissions/${admissionId}`, token),
        api.get(`/v1/admissions/${admissionId}/ward-rounds`, token),
      ]);

      if (admissionRes.status === "fulfilled" && admissionRes.value) {
        setAdmission(admissionRes.value.data || admissionRes.value);
      }

      if (roundsRes.status === "fulfilled" && roundsRes.value) {
        const fetchedRounds: WardRoundEntry[] = roundsRes.value.data || [];
        setRounds(fetchedRounds);
        if (fetchedRounds.length > 0) {
          setExpandedRoundId(fetchedRounds[0].id);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load ward rounds");
    } finally {
      setLoading(false);
    }
  }, [token, admissionId]);

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchData]);

  const handleApplyTemplate = (templateData: typeof TEMPLATES[0]["data"]) => {
    setSoap({
      subjective: templateData.subjective,
      objective: templateData.objective,
      assessment: templateData.assessment,
      plan: templateData.plan,
    });
  };

  const handleSubmitRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soap.subjective && !soap.objective && !soap.assessment && !soap.plan) {
      setError("Please fill out at least one SOAP section.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        soap_notes: soap,
        vital_signs: {
          temperature: vitals.temperature ? parseFloat(vitals.temperature) : undefined,
          pulse: vitals.pulse ? parseInt(vitals.pulse) : undefined,
          blood_pressure: vitals.blood_pressure || undefined,
          respiratory_rate: vitals.respiratory_rate ? parseInt(vitals.respiratory_rate) : undefined,
          spo2: vitals.spo2 ? parseFloat(vitals.spo2) : undefined,
        },
        is_attending_approved: isAttendingApproved,
      };

      const res = await api.post(`/v1/admissions/${admissionId}/ward-rounds`, payload, token);
      if (res) {
        setSuccessMessage("Ward round progress note saved successfully!");
        setSoap({ subjective: "", objective: "", assessment: "", plan: "" });
        setVitals({ temperature: "", pulse: "", blood_pressure: "", respiratory_rate: "", spo2: "" });
        fetchData();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record ward round note.");
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = admission?.patient
    ? `${admission.patient.first_name} ${admission.patient.last_name}`
    : `Admission #${admissionId}`;

  return (
    <div className="flex flex-col gap-6 max-w-[1500px] mx-auto pb-16">
      {/* Back Navigation & Header */}
      <div className="flex flex-col gap-2">
        <Link
          href="/admissions"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="size-3.5" />
          Back to Inpatient Admissions
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted/30 p-4 rounded-xl border border-border/60">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shrink-0">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  Ward Rounds: {patientName}
                </h1>
                {admission?.status && (
                  <StatusBadge label={admission.status} variant="info" />
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                {admission?.patient?.hospital_number && (
                  <span>ID: <strong className="font-mono">{admission.patient.hospital_number}</strong></span>
                )}
                {admission?.ward && (
                  <span className="flex items-center gap-1">
                    <Building2 className="size-3" /> {admission.ward.name}
                  </span>
                )}
                {admission?.bed && (
                  <span className="flex items-center gap-1">
                    <Bed className="size-3" /> Bed {admission.bed.bed_number}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchData} className="h-9 gap-1.5 text-xs">
              <Clock className="size-3.5" /> Refresh Notes
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0" />
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: SOAP Note Builder (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="border-b bg-muted/20 py-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    Daily SOAP Progress Note Builder
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Structured clinical round documentation linked to Admission #{admissionId}
                  </CardDescription>
                </div>

                {/* Quick Auto-Template Buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mr-1">
                    Templates:
                  </span>
                  {TEMPLATES.map((tmpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl.data)}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-muted hover:bg-primary/10 hover:text-primary border transition-colors"
                      title={`Insert ${tmpl.label} template`}
                    >
                      {tmpl.badge}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleSubmitRound} className="space-y-4">
                {/* 4-Card SOAP Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Subjective */}
                  <Card className="border-sky-200 dark:border-sky-900 bg-sky-50/20 dark:bg-sky-950/10">
                    <CardHeader className="p-3 border-b border-sky-100 dark:border-sky-900/50">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1.5">
                        <span className="size-5 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-[10px]">
                          S
                        </span>
                        Subjective (Symptoms / Complaints)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <textarea
                        placeholder="Patient comments, reported pain levels, sleep quality, subjective symptoms..."
                        value={soap.subjective}
                        onChange={(e) => setSoap({ ...soap, subjective: e.target.value })}
                        rows={4}
                        className="w-full text-xs resize-none bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                      />
                    </CardContent>
                  </Card>

                  {/* Objective */}
                  <Card className="border-emerald-200 dark:border-emerald-900 bg-emerald-50/20 dark:bg-emerald-950/10">
                    <CardHeader className="p-3 border-b border-emerald-100 dark:border-emerald-900/50">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <span className="size-5 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">
                          O
                        </span>
                        Objective (Exam & Labs)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <textarea
                        placeholder="Physical examination findings, wound inspection, lab/imaging results..."
                        value={soap.objective}
                        onChange={(e) => setSoap({ ...soap, objective: e.target.value })}
                        rows={4}
                        className="w-full text-xs resize-none bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                      />
                    </CardContent>
                  </Card>

                  {/* Assessment */}
                  <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/20 dark:bg-amber-950/10">
                    <CardHeader className="p-3 border-b border-amber-100 dark:border-amber-900/50">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        <span className="size-5 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                          A
                        </span>
                        Assessment (Diagnosis / Trajectory)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <textarea
                        placeholder="Clinical judgment, diagnosis progression, stability status..."
                        value={soap.assessment}
                        onChange={(e) => setSoap({ ...soap, assessment: e.target.value })}
                        rows={4}
                        className="w-full text-xs resize-none bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                      />
                    </CardContent>
                  </Card>

                  {/* Plan */}
                  <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/20 dark:bg-purple-950/10">
                    <CardHeader className="p-3 border-b border-purple-100 dark:border-purple-900/50">
                      <CardTitle className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                        <span className="size-5 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-[10px]">
                          P
                        </span>
                        Plan (Interventions / Orders)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3">
                      <textarea
                        placeholder="Management plan, medication adjustments, consultations, discharge goals..."
                        value={soap.plan}
                        onChange={(e) => setSoap({ ...soap, plan: e.target.value })}
                        rows={4}
                        className="w-full text-xs resize-none bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Vital Signs Bar */}
                <div className="bg-muted/40 p-3.5 rounded-lg border space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Activity className="size-3.5 text-rose-500" />
                    <span>Round Vital Signs (Optional)</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium block mb-1">
                        Temp (°C)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="36.8"
                        value={vitals.temperature}
                        onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium block mb-1">
                        Pulse (bpm)
                      </label>
                      <Input
                        type="number"
                        placeholder="72"
                        value={vitals.pulse}
                        onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium block mb-1">
                        BP (mmHg)
                      </label>
                      <Input
                        placeholder="120/80"
                        value={vitals.blood_pressure}
                        onChange={(e) => setVitals({ ...vitals, blood_pressure: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium block mb-1">
                        Resp Rate (/min)
                      </label>
                      <Input
                        type="number"
                        placeholder="16"
                        value={vitals.respiratory_rate}
                        onChange={(e) => setVitals({ ...vitals, respiratory_rate: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-medium block mb-1">
                        SpO2 (%)
                      </label>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="98"
                        value={vitals.spo2}
                        onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })}
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* Attending Doctor Approval Toggle & Submit Button */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t">
                  <label className="flex items-center gap-2 cursor-pointer text-xs select-none">
                    <input
                      type="checkbox"
                      checked={isAttendingApproved}
                      onChange={(e) => setIsAttendingApproved(e.target.checked)}
                      className="size-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="font-medium text-foreground flex items-center gap-1">
                      <ShieldCheck className="size-3.5 text-emerald-600" />
                      Mark as Attending Doctor Approved
                    </span>
                  </label>

                  <Button type="submit" disabled={submitting} className="h-9 px-5 gap-2 text-xs w-full sm:w-auto">
                    <Send className="size-3.5" />
                    {submitting ? "Saving Round..." : "Record Ward Round Note"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Historical Timeline (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Card className="border-border/60 shadow-sm h-full flex flex-col">
            <CardHeader className="border-b bg-muted/20 py-3.5">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  Historical Ward Round Timeline
                </span>
                <span className="text-xs font-normal text-muted-foreground font-mono">
                  {rounds.length} entries recorded
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="p-4 flex-1 overflow-y-auto max-h-[800px]">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="size-8 rounded-full shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-20 w-full rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : rounds.length === 0 ? (
                <div className="py-12">
                  <EmptyState
                    icon={<Stethoscope className="size-8 text-muted-foreground/40" />}
                    title="No Ward Rounds Recorded"
                    description="No daily clinical progress notes have been filed for this admission yet. Use the SOAP Note Builder to record the first round."
                  />
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-primary/20 space-y-6">
                  {rounds.map((round) => {
                    const isExpanded = expandedRoundId === round.id;
                    const roundDate = round.created_at ? parseISO(round.created_at) : new Date();
                    const formattedDate = format(roundDate, "PPP 'at' p");
                    const relativeTime = formatDistanceToNow(roundDate, { addSuffix: true });

                    return (
                      <div key={round.id} className="relative">
                        {/* Timeline Node Icon */}
                        <div className="absolute -left-[31px] top-1 size-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                          <div className="size-2 rounded-full bg-primary" />
                        </div>

                        {/* Timeline Entry Card */}
                        <Card className="border-border/60 hover:border-primary/40 transition-colors shadow-xs">
                          <CardHeader className="p-3.5 pb-2 cursor-pointer" onClick={() => setExpandedRoundId(isExpanded ? null : round.id)}>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-foreground">
                                    {round.doctor ? round.doctor.name : "Attending Physician"}
                                  </span>
                                  {round.is_attending_approved && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200">
                                      <ShieldCheck className="size-3" />
                                      Approved
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-muted-foreground font-mono mt-0.5" title={formattedDate}>
                                  {relativeTime} ({format(roundDate, "MMM d, HH:mm")})
                                </p>
                              </div>

                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
                                {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                              </Button>
                            </div>

                            {/* Vitals Summary Pill Bar */}
                            {round.vital_signs && Object.keys(round.vital_signs).length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                                {round.vital_signs.temperature && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-muted">
                                    <Thermometer className="size-2.5 text-amber-500" />
                                    {round.vital_signs.temperature}°C
                                  </span>
                                )}
                                {round.vital_signs.blood_pressure && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-muted">
                                    <Activity className="size-2.5 text-rose-500" />
                                    {round.vital_signs.blood_pressure}
                                  </span>
                                )}
                                {round.vital_signs.pulse && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-muted">
                                    <Heart className="size-2.5 text-red-500" />
                                    {round.vital_signs.pulse} bpm
                                  </span>
                                )}
                                {round.vital_signs.spo2 && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-muted">
                                    <Wind className="size-2.5 text-sky-500" />
                                    {round.vital_signs.spo2}%
                                  </span>
                                )}
                              </div>
                            )}
                          </CardHeader>

                          {/* Expanded SOAP Details */}
                          {isExpanded && (
                            <CardContent className="p-3.5 pt-2 border-t space-y-3 text-xs">
                              {round.soap_notes.subjective && (
                                <div>
                                  <span className="font-bold text-sky-600 dark:text-sky-400 block text-[10px] uppercase tracking-wider">
                                    Subjective
                                  </span>
                                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                    {round.soap_notes.subjective}
                                  </p>
                                </div>
                              )}

                              {round.soap_notes.objective && (
                                <div>
                                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block text-[10px] uppercase tracking-wider">
                                    Objective
                                  </span>
                                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                    {round.soap_notes.objective}
                                  </p>
                                </div>
                              )}

                              {round.soap_notes.assessment && (
                                <div>
                                  <span className="font-bold text-amber-600 dark:text-amber-400 block text-[10px] uppercase tracking-wider">
                                    Assessment
                                  </span>
                                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                    {round.soap_notes.assessment}
                                  </p>
                                </div>
                              )}

                              {round.soap_notes.plan && (
                                <div>
                                  <span className="font-bold text-purple-600 dark:text-purple-400 block text-[10px] uppercase tracking-wider">
                                    Plan
                                  </span>
                                  <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                    {round.soap_notes.plan}
                                  </p>
                                </div>
                              )}
                            </CardContent>
                          )}
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
