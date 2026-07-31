"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { calculateNEWS2, type AVPU, type SpO2Scale, type NEWS2Result } from "@/lib/ews";
import { friendlyError } from "@/lib/errors";
import PatientBanner from "@/components/ui/PatientBanner";
import type { Patient, Allergy } from "@/types/patient";
import StatusBadge from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { SectionHeader } from "@/components/ui/PageLayout";
import TriageSidebar from "@/components/triage/TriageSidebar";
import TriageProgressCard from "@/components/triage/TriageProgressCard";
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Loader2, Check, TriangleAlert, Stethoscope,
  HeartPulse, Syringe, Baby, AlertTriangle, Activity, Undo2,
  ChevronRight, ChevronDown,
} from "lucide-react";

const digitsOnly = (v: string) => v.replace(/\D/g, "");
const decimalOnly = (v: string) => {
  const cleaned = v.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  return parts.length > 2 ? `${parts[0]}.${parts.slice(1).join("")}` : cleaned;
};
const bpOnly = (v: string) => {
  const cleaned = v.replace(/[^0-9/]/g, "");
  const parts = cleaned.split("/");
  return parts.length > 2 ? `${parts[0]}/${parts.slice(1).join("")}` : cleaned;
};

function vitalBorderClass(value: string | undefined, type: "temp" | "bp_sys" | "pulse" | "rr" | "spo2"): string {
  if (!value || value === "") return "";
  const num = parseFloat(value);
  if (isNaN(num)) return "";
  const isRed = (t: string) => t === "temp" ? (num < 35 || num > 39) : t === "bp_sys" ? (num < 90 || num > 180) : t === "pulse" ? (num < 50 || num > 120) : t === "rr" ? (num < 8 || num > 30) : (num < 92);
  const isAmber = (t: string) => t === "temp" ? (num < 36.5 || num > 38) : t === "bp_sys" ? (num < 100 || num > 160) : t === "pulse" ? (num < 60 || num > 100) : t === "rr" ? (num < 12 || num > 20) : (num < 95);
  if (isRed(type)) return "border-red-400 bg-red-50/30";
  if (isAmber(type)) return "border-amber-400 bg-amber-50/30";
  return "border-emerald-400 bg-emerald-50/30";
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
  vital_signs?: {
    id: number;
    temperature: number | null;
    blood_pressure: string | null;
    pulse_rate: number | null;
    respiratory_rate: number | null;
    oxygen_saturation: number | null;
    ews_score: number | null;
    recorded_at: string;
  }[];
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

function LoadingPlaceholder() {
  return (
    <div className="max-w-7xl mx-auto p-8 space-y-6">
      <div className="flex items-center gap-4 justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-4 gap-6">
        <Skeleton className="h-80 col-span-1 rounded-xl" />
        <div className="col-span-3 space-y-4">
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export default function NurseTriageWorkbench() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params.id as string;

  const [activeTab, setActiveTab] = useState<"complaint" | "vitals" | "allergies" | "pregnancy" | "infection" | "trends">("complaint");

  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<TriageSummary | null>(null);
  const [trends, setTrends] = useState<VitalsTrends>({});
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string[]>>({});

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

  const [allergen, setAllergen] = useState("");
  const [allergyType, setAllergyType] = useState("Drug");
  const [reaction, setReaction] = useState("");
  const [severity, setSeverity] = useState<"mild" | "moderate" | "severe">("mild");

  const [chiefComplaint, setChiefComplaint] = useState("");
  const [hpi, setHpi] = useState("");

  const [isPregnant, setIsPregnant] = useState(false);
  const [lmp, setLmp] = useState("");
  const [gestationalWeeks, setGestationalWeeks] = useState("");

  const [hasFever, setHasFever] = useState(false);
  const [hasCough, setHasCough] = useState(false);
  const [hasContactHistory, setHasContactHistory] = useState(false);
  const [hasTravelHistory, setHasTravelHistory] = useState(false);
  const [suspectedInfectionType, setSuspectedInfectionType] = useState("");

  const [showAdditionalVitals, setShowAdditionalVitals] = useState(false);
  const [undoingVitals, setUndoingVitals] = useState(false);

  const DRAFT_KEY = `clinops_triage_draft_${patientId}`;
  useEffect(() => {
    const interval = setInterval(() => {
      try {
        const draft = {
          temperature, bloodPressure, pulseRate, respiratoryRate, oxygenSaturation,
          spo2Scale, supplementalOxygen, weight, height, painScore,
          gcsEye, gcsVerbal, gcsMotor, bloodGlucose, consciousness, triageCategory,
          allergen, allergyType, reaction, severity,
          chiefComplaint, hpi,
          isPregnant, lmp, gestationalWeeks,
          hasFever, hasCough, hasContactHistory, hasTravelHistory, suspectedInfectionType,
          showAdditionalVitals, activeTab,
          savedAt: Date.now(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      } catch { /* quota exceeded */ }
    }, 30000);

    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.savedAt && Date.now() - d.savedAt < 2 * 60 * 60 * 1000) {
          /* eslint-disable react-hooks/set-state-in-effect */
          setTemperature(d.temperature || "");
          setBloodPressure(d.bloodPressure || "");
          setPulseRate(d.pulseRate || "");
          setRespiratoryRate(d.respiratoryRate || "");
          setOxygenSaturation(d.oxygenSaturation || "");
          if (d.spo2Scale) setSpo2Scale(d.spo2Scale);
          setSupplementalOxygen(d.supplementalOxygen || false);
          setWeight(d.weight || "");
          setHeight(d.height || "");
          setPainScore(d.painScore || "");
          setGcsEye(d.gcsEye || "");
          setGcsVerbal(d.gcsVerbal || "");
          setGcsMotor(d.gcsMotor || "");
          setBloodGlucose(d.bloodGlucose || "");
          if (d.consciousness) setConsciousness(d.consciousness);
          if (d.triageCategory) setTriageCategory(d.triageCategory);
          setAllergen(d.allergen || "");
          if (d.allergyType) setAllergyType(d.allergyType);
          setReaction(d.reaction || "");
          if (d.severity) setSeverity(d.severity);
          setChiefComplaint(d.chiefComplaint || "");
          setHpi(d.hpi || "");
          setIsPregnant(d.isPregnant || false);
          setLmp(d.lmp || "");
          setGestationalWeeks(d.gestationalWeeks || "");
          setHasFever(d.hasFever || false);
          setHasCough(d.hasCough || false);
          setHasContactHistory(d.hasContactHistory || false);
          setHasTravelHistory(d.hasTravelHistory || false);
          setSuspectedInfectionType(d.suspectedInfectionType || "");
          setShowAdditionalVitals(d.showAdditionalVitals || false);
          if (d.activeTab) setActiveTab(d.activeTab);
        }
      }
    } catch { /* ignore */ }

    return () => {
      clearInterval(interval);
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, DRAFT_KEY]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tabMap: Record<string, "complaint" | "vitals" | "allergies" | "pregnancy" | "infection" | "trends"> = {
        "1": "complaint", "2": "vitals", "3": "allergies",
        "4": "pregnancy", "5": "infection", "6": "trends",
      };
      const tab = tabMap[e.key];
      if (tab) {
        e.preventDefault();
        setActiveTab(tab);
        setError(null);
        setSuccessMsg(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
        if (s.encounter) {
          if ((s.encounter as unknown as { status?: string }).status === "Emergency") {
            router.replace(`/patients/${patientId}/emergency-triage`);
            return;
          }
          setChiefComplaint(s.encounter.chief_complaint || "");
          setHpi(s.encounter.history_of_present_illness || "");
        }
      }
      const trendsRes = await api.get(`/patients/${patientId}/vital-signs/trends?days=30`, token);
      if (trendsRes && trendsRes.data) {
        setTrends(trendsRes.data);
      }
    } catch (err: unknown) {
      setError(friendlyError(err, "load patient records"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && patientId) {
      fetchSummaryData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, patientId]);

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

  const parsedWeight = parseFloat(weight);
  const parsedHeight = parseFloat(height);
  const bmi = parsedWeight && parsedHeight ? (parsedWeight / Math.pow(parsedHeight / 100, 2)).toFixed(1) : null;

  const handleSaveVitals = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    setFormErrors({});
    let dbConsciousness = "alert";
    if (consciousness === "C") dbConsciousness = "new_confusion";
    else if (consciousness !== "A") dbConsciousness = "unconscious";
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
      setError(friendlyError(err, "record vital signs"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSaveAllergy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allergen.trim()) return;
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/patients/${patientId}/triage/allergies`, { allergen, allergy_type: allergyType, reaction: reaction || null, severity }, token);
      setSuccessMsg("Allergy noted successfully.");
      setAllergen("");
      setReaction("");
      fetchSummaryData();
    } catch (err: unknown) {
      setError(friendlyError(err, "record allergy"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleConfirmNKA = async () => {
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/patients/${patientId}/triage/confirm-allergies`, {}, token);
      setSuccessMsg("No Known Allergies (NKA) status confirmed.");
      fetchSummaryData();
    } catch (err: unknown) {
      setError(friendlyError(err, "confirm allergies"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSaveComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) { setError("Chief Complaint is mandatory."); return; }
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/patients/${patientId}/triage/presenting-complaint`, { chief_complaint: chiefComplaint, history_of_present_illness: hpi || null }, token);
      setSuccessMsg("Presenting complaints recorded successfully.");
      fetchSummaryData();
    } catch (err: unknown) {
      setError(friendlyError(err, "save complaints"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSavePregnancy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/patients/${patientId}/triage/pregnancy-status`, {
        is_pregnant: isPregnant, last_menstrual_period: lmp || null, gestational_age_weeks: gestationalWeeks ? parseInt(gestationalWeeks) : null,
      }, token);
      setSuccessMsg("Pregnancy status successfully updated.");
      fetchSummaryData();
    } catch (err: unknown) {
      setError(friendlyError(err, "update pregnancy status"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSaveInfection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/patients/${patientId}/triage/infection-screening`, {
        has_fever: hasFever, has_cough: hasCough, has_contact_history: hasContactHistory,
        has_travel_history: hasTravelHistory, suspected_infection_type: suspectedInfectionType || null,
      }, token);
      setSuccessMsg("Infectious screening log saved. Precautions updated.");
      fetchSummaryData();
    } catch (err: unknown) {
      setError(friendlyError(err, "save screening"));
    } finally {
      setSubmitLoading(false);
    }
  };

  const [completing, setCompleting] = useState(false);
  const [showCompletionSummary, setShowCompletionSummary] = useState(false);

  const handleCompleteTriage = async () => {
    if (!token || completing) return;
    setCompleting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.post(`/patients/${patientId}/triage/complete`, {}, token);
      setShowCompletionSummary(true);
    } catch (err: unknown) {
      setError(friendlyError(err, "complete triage"));
      setCompleting(false);
    }
  };

  const handleUndoLastVitals = async () => {
    if (!token || undoingVitals) return;
    setUndoingVitals(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.delete(`/patients/${patientId}/triage/vital-signs/last`, token);
      setSuccessMsg("Last vital signs entry removed. You can re-enter them.");
      fetchSummaryData();
    } catch (err: unknown) {
      setError(friendlyError(err, "undo vitals"));
    } finally {
      setUndoingVitals(false);
    }
  };

  const hasVitals = !!summary?.vital_signs && summary.vital_signs.length > 0;
  const hasComplaint = !!summary?.encounter?.chief_complaint;
  const hasAllergies = (summary?.allergies && summary.allergies.length > 0) || summary?.allergies_confirmed === true;

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
        <div className="rounded-xl border bg-muted/30 px-6 py-10">
          <Stethoscope className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold">Patient Not Found</p>
          <Button variant="outline" className="mt-4" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    );
  }

  const handleTabChange = (key: string) => {
    setActiveTab(key as typeof activeTab);
    setError(null);
    setSuccessMsg(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title="Triage Clinical Workbench"
        description="Nurse Desk — capture real-time clinical parameters and complete triage assessment."
        action={
          <Button variant="outline" onClick={() => router.push("/patients")}>
            <ArrowLeft className="h-4 w-4" /> Back to Directory
          </Button>
        }
      />

      <PatientBanner
        patient={patient}
        allergies={summary?.allergies}
        allergiesConfirmed={summary?.allergies_confirmed}
        isPregnant={summary?.pregnancy_status}
      />

      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge label="In Triage" variant="purple" pulse />
            {hasComplaint && <Badge variant="outline">Chief Complaint Recorded</Badge>}
            {hasVitals && <Badge variant="outline">Vitals Logged</Badge>}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {hasAllergies && (
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <Check className="h-3.5 w-3.5" /> Allergies Cleared
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <TriageSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hasComplaint={hasComplaint}
          hasVitals={hasVitals}
          hasAllergies={hasAllergies}
          showPregnancy={patient.gender === "Female"}
        />

        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6 space-y-6">
          {successMsg && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 font-semibold flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-600 shrink-0" /> {successMsg}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 font-semibold flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-red-600 shrink-0" /> {error}
            </div>
          )}

          {/* ── Vitals Tab ── */}
          {activeTab === "vitals" && (
            <form onSubmit={handleSaveVitals}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="h-5 w-5" /> Patient Physiological Measurements
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Capture real-time clinical parameters to calculate automated NEWS2 risk alerts.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* NEWS2 Score Panel */}
                  <div className={cn(
                    "p-4 rounded-lg border flex flex-col sm:flex-row items-center justify-between gap-4 transition-all",
                    news2.score >= 7
                      ? "bg-red-50 border-red-200"
                      : news2.score >= 5 || news2.riskLevel === "Medium"
                        ? "bg-yellow-50 border-yellow-200"
                        : news2.score >= 1
                          ? "bg-emerald-50 border-emerald-100"
                          : "bg-muted border-border"
                  )}>
                    <div>
                      <h4 className="text-sm font-bold uppercase tracking-wider">Automated NEWS2 Score</h4>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{news2.frequencyText}</p>
                    </div>
                    <div className="flex items-baseline gap-2.5">
                      <span className="text-sm font-semibold uppercase tracking-widest">{news2.riskLevel} RISK</span>
                      <span className={cn(
                        "text-5xl font-black font-mono tracking-tighter",
                        news2.score >= 7 ? "text-red-600" : news2.score >= 5 ? "text-amber-600" : "text-emerald-600"
                      )}>{news2.score}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Temperature (°C)</label>
                      <Input
                        type="text" inputMode="decimal" maxLength={5}
                        placeholder="e.g. 36.5"
                        value={temperature}
                        onChange={(e) => setTemperature(decimalOnly(e.target.value))}
                        className={cn("font-mono", vitalBorderClass(temperature, "temp"))}
                      />
                      {formErrors.temperature && <p className="text-xs text-destructive">{formErrors.temperature.join(" ")}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Blood Pressure</label>
                      <Input
                        type="text" inputMode="numeric" maxLength={7}
                        placeholder="e.g. 120/80"
                        value={bloodPressure}
                        onChange={(e) => setBloodPressure(bpOnly(e.target.value))}
                        className={cn("font-mono", vitalBorderClass(bloodPressure?.split("/")[0], "bp_sys"))}
                      />
                      {formErrors.blood_pressure && <p className="text-xs text-destructive">{formErrors.blood_pressure.join(" ")}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Pulse Rate (bpm)</label>
                      <Input
                        type="text" inputMode="numeric" maxLength={3}
                        placeholder="e.g. 72"
                        value={pulseRate}
                        onChange={(e) => setPulseRate(digitsOnly(e.target.value))}
                        className={cn("font-mono", vitalBorderClass(pulseRate, "pulse"))}
                      />
                      {formErrors.pulse_rate && <p className="text-xs text-destructive">{formErrors.pulse_rate.join(" ")}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Respiratory Rate (breaths/min)</label>
                      <Input
                        type="text" inputMode="numeric" maxLength={2}
                        placeholder="e.g. 16"
                        value={respiratoryRate}
                        onChange={(e) => setRespiratoryRate(digitsOnly(e.target.value))}
                        className={cn("font-mono", vitalBorderClass(respiratoryRate, "rr"))}
                      />
                      {formErrors.respiratory_rate && <p className="text-xs text-destructive">{formErrors.respiratory_rate.join(" ")}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Oxygen Saturation (SpO2 %)</label>
                      <Input
                        type="text" inputMode="numeric" maxLength={3}
                        placeholder="e.g. 98"
                        value={oxygenSaturation}
                        onChange={(e) => setOxygenSaturation(digitsOnly(e.target.value))}
                        className={cn("font-mono", vitalBorderClass(oxygenSaturation, "spo2"))}
                      />
                      {formErrors.oxygen_saturation && <p className="text-xs text-destructive">{formErrors.oxygen_saturation.join(" ")}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Oxygen Scale (NEWS2)</label>
                      <select
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus-visible:ring-ring text-sm"
                        value={spo2Scale}
                        onChange={(e) => setSpo2Scale(parseInt(e.target.value) as SpO2Scale)}
                      >
                        <option value="1">Scale 1 (Normal Target ≥ 96%)</option>
                        <option value="2">Scale 2 (COPD Target 88-92%)</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 self-end pb-1">
                      <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer font-bold">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary rounded border-border focus-visible:ring-ring"
                          checked={supplementalOxygen}
                          onChange={(e) => setSupplementalOxygen(e.target.checked)}
                        />
                        On Supplemental Oxygen
                      </label>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Consciousness (AVPU)</label>
                      <select
                        className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus-visible:ring-ring text-sm"
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
                  </div>

                  <Separator />

                  <button
                    type="button"
                    onClick={() => setShowAdditionalVitals(!showAdditionalVitals)}
                    className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {showAdditionalVitals ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {showAdditionalVitals ? "Hide" : "Show"} Additional Measurements
                    <span className="text-[10px] font-mono text-muted-foreground font-normal normal-case">(Weight, BMI, GCS, Pain, Glucose, Triage Level)</span>
                  </button>

                  {showAdditionalVitals && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Triage Priority Category</label>
                        <select
                          className="mt-1 block w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus-visible:ring-ring text-sm"
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
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Weight (kg)</label>
                        <Input
                          type="text" inputMode="decimal" maxLength={5} placeholder="e.g. 70.0"
                          value={weight} onChange={(e) => setWeight(decimalOnly(e.target.value))}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Height (cm)</label>
                        <Input
                          type="text" inputMode="decimal" maxLength={5} placeholder="e.g. 175"
                          value={height} onChange={(e) => setHeight(decimalOnly(e.target.value))}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Calculated BMI</label>
                        <div className="h-10 px-3 bg-muted border border-border rounded-lg text-sm font-mono text-foreground flex items-center">
                          {bmi ? `${bmi} kg/m²` : "Enter Wt & Ht to calculate"}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Pain Score (0-10)</label>
                        <Input
                          type="text" inputMode="numeric" maxLength={2}
                          placeholder="0 = No Pain, 10 = Severe"
                          value={painScore}
                          onChange={(e) => {
                            const v = digitsOnly(e.target.value);
                            if (v === "" || (parseInt(v) >= 0 && parseInt(v) <= 10)) setPainScore(v);
                          }}
                          className="font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Blood Glucose (mmol/L)</label>
                        <Input
                          type="text" inputMode="decimal" maxLength={5} placeholder="e.g. 5.5"
                          value={bloodGlucose} onChange={(e) => setBloodGlucose(decimalOnly(e.target.value))}
                          className="font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {showAdditionalVitals && (
                    <div className="space-y-4 pt-2">
                      <Separator />
                      <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest">Glasgow Coma Scale (GCS)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">GCS Eye (1-4)</label>
                          <Input
                            type="text" inputMode="numeric" maxLength={1}
                            placeholder="1 (None) to 4 (Spontaneous)"
                            value={gcsEye}
                            onChange={(e) => {
                              const v = digitsOnly(e.target.value);
                              if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 4)) setGcsEye(v);
                            }}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">GCS Verbal (1-5)</label>
                          <Input
                            type="text" inputMode="numeric" maxLength={1}
                            placeholder="1 (None) to 5 (Oriented)"
                            value={gcsVerbal}
                            onChange={(e) => {
                              const v = digitsOnly(e.target.value);
                              if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 5)) setGcsVerbal(v);
                            }}
                            className="font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">GCS Motor (1-6)</label>
                          <Input
                            type="text" inputMode="numeric" maxLength={1}
                            placeholder="1 (None) to 6 (Obeys commands)"
                            value={gcsMotor}
                            onChange={(e) => {
                              const v = digitsOnly(e.target.value);
                              if (v === "" || (parseInt(v) >= 1 && parseInt(v) <= 6)) setGcsMotor(v);
                            }}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    {hasVitals && (
                      <Button type="button" variant="ghost" size="sm" onClick={handleUndoLastVitals} disabled={undoingVitals}>
                        <Undo2 className="h-4 w-4" />
                        {undoingVitals ? "Removing..." : "Undo Last Vitals Entry"}
                      </Button>
                    )}
                    <Button type="submit" disabled={submitLoading} className="ml-auto">
                      {submitLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Log Vital Signs"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}

          {/* ── Allergies Tab ── */}
          {activeTab === "allergies" && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Syringe className="h-5 w-5" /> Allergies & Reactions
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Note adverse sensitivity reports or confirm NKA (No Known Allergies) for the clinical record.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/30 p-4 rounded-lg border">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Noted Allergies</h4>
                    {summary?.allergies && summary.allergies.length > 0 ? (
                      <div className="divide-y divide-border bg-card rounded-lg border overflow-hidden">
                        {summary.allergies.map((a) => (
                          <div key={a.id} className="px-4 py-3 flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-foreground text-sm">{a.allergen}</span>
                              {a.reaction && <p className="text-xs text-muted-foreground mt-0.5">Reaction: {a.reaction}</p>}
                            </div>
                            <Badge variant={a.severity === "severe" ? "destructive" : "secondary"}>
                              {a.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-sm text-muted-foreground">No allergies currently logged in profile.</div>
                    )}

                    {!summary?.allergies_confirmed && (!summary?.allergies || summary.allergies.length === 0) && (
                      <Button onClick={handleConfirmNKA} disabled={submitLoading} variant="outline" className="mt-4">
                        Confirm No Known Allergies (NKA)
                      </Button>
                    )}
                  </div>

                  <Separator />

                  <form onSubmit={handleSaveAllergy} className="space-y-6">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest">Add New Patient Allergy</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Allergen</label>
                        <Input
                          required placeholder="e.g. Penicillin, Peanuts"
                          value={allergen} onChange={(e) => setAllergen(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Allergen Type</label>
                        <select
                          className="block w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus-visible:ring-ring text-sm"
                          value={allergyType} onChange={(e) => setAllergyType(e.target.value)}
                        >
                          <option value="Drug">Drug</option>
                          <option value="Food">Food</option>
                          <option value="Environmental">Environmental</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Reaction Details (Optional)</label>
                        <Input
                          placeholder="e.g. Skin rashes, hives, swelling, anaphylaxis"
                          value={reaction} onChange={(e) => setReaction(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Severity Level</label>
                        <select
                          className="block w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus-visible:ring-ring text-sm"
                          value={severity} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSeverity(e.target.value as typeof severity)}
                        >
                          <option value="mild">Mild</option>
                          <option value="moderate">Moderate</option>
                          <option value="severe">Severe</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={submitLoading || !allergen.trim()}>
                        {submitLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : "Log Allergy"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Complaint Tab ── */}
          {activeTab === "complaint" && (
            <form onSubmit={handleSaveComplaint}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" /> Presenting Complaint
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Record primary medical reasons and history of illness driving active clinical consultation.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Chief Complaint (CC) <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      rows={3} required
                      className="block w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus-visible:ring-ring text-sm text-foreground font-mono"
                      placeholder="e.g. High fever for 3 days, dry cough, and sudden loss of appetite."
                      value={chiefComplaint}
                      onChange={(e) => setChiefComplaint(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">History of Present Illness (HPI)</label>
                    <textarea
                      rows={6}
                      className="block w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus-visible:ring-ring text-sm text-foreground font-mono"
                      placeholder="Record detailed onset, severity, location, timing, aggravating factors, and therapies attempted."
                      value={hpi}
                      onChange={(e) => setHpi(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitLoading || !chiefComplaint.trim()}>
                      {submitLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Log Complaints"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}

          {/* ── Pregnancy Tab ── */}
          {activeTab === "pregnancy" && (
            <form onSubmit={handleSavePregnancy}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Baby className="h-5 w-5" /> Pregnancy Status
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Determine maternal gestational age and tracking parameters.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/30 p-4 rounded-lg border space-y-6">
                    <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer font-bold">
                      <input
                        type="checkbox"
                        className="h-5 w-5 text-primary rounded border-border focus-visible:ring-ring"
                        checked={isPregnant}
                        onChange={(e) => setIsPregnant(e.target.checked)}
                      />
                      Is Patient Currently Pregnant?
                    </label>

                    {isPregnant && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Last Menstrual Period (LMP)</label>
                          <Input type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} className="font-mono" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Gestational Age (weeks)</label>
                          <Input
                            type="text" inputMode="numeric" maxLength={2} placeholder="e.g. 24"
                            value={gestationalWeeks}
                            onChange={(e) => {
                              const v = digitsOnly(e.target.value);
                              if (v === "" || (parseInt(v) >= 0 && parseInt(v) <= 45)) setGestationalWeeks(v);
                            }}
                            className="font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitLoading}>
                      {submitLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Updating...</> : "Update Pregnancy Record"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}

          {/* ── Infection Tab ── */}
          {activeTab === "infection" && (
            <form onSubmit={handleSaveInfection}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Infection Screening
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Flag potential infectious risk factors. Active flags alert and prompt isolation procedures.
                  </p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-muted/30 p-4 rounded-lg border space-y-4">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest">Infectious Risk Checklist</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { label: "Presence of Active Fever", checked: hasFever, set: setHasFever },
                        { label: "Presence of Productive Cough", checked: hasCough, set: setHasCough },
                        { label: "Infectious Disease Contact History", checked: hasContactHistory, set: setHasContactHistory },
                        { label: "Recent Travel History to Endemic Zones", checked: hasTravelHistory, set: setHasTravelHistory },
                      ].map((item) => (
                        <label key={item.label} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-primary rounded border-border focus-visible:ring-ring"
                            checked={item.checked}
                            onChange={(e) => item.set(e.target.checked)}
                          />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Suspected Infection / Remarks (Optional)</label>
                    <Input
                      placeholder="e.g. Tuberculosis, Cholera, COVID-19"
                      value={suspectedInfectionType} onChange={(e) => setSuspectedInfectionType(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={submitLoading}>
                      {submitLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Log Screening"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          )}

          {/* ── Trends Tab ── */}
          {activeTab === "trends" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" /> Physiological Trends
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Trace vital parameters over the last 30 days. Allows evaluation of treatment responses.
                </p>
              </CardHeader>
              <CardContent>
                {Object.keys(trends).length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">No trend points logged for this patient profile yet.</div>
                ) : (
                  <div className="space-y-8">
                    {trends.temperature && trends.temperature.length > 0 && (
                      <div className="bg-card p-4 rounded-lg border">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Temperature Graph (°C)</h4>
                        <div className="h-40 flex items-end gap-1.5 pt-6 border-b border-l border-border px-3 relative">
                          {trends.temperature.map((point, index) => {
                            const val = point.value;
                            const minVal = 35; const maxVal = 42;
                            const pct = Math.max(10, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
                            return (
                              <div key={index} className="flex-1 bg-primary/70 hover:bg-primary transition-colors group relative rounded-t"
                                style={{ height: `${pct}%` }}>
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-foreground text-background text-[10px] font-mono rounded shadow">
                                  {val}°C
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
                          <span>Earliest</span><span>Latest Logs</span>
                        </div>
                      </div>
                    )}
                    {trends.pulse_rate && trends.pulse_rate.length > 0 && (
                      <div className="bg-card p-4 rounded-lg border">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Heart Pulse Trend (bpm)</h4>
                        <div className="h-40 flex items-end gap-1.5 pt-6 border-b border-l border-border px-3 relative">
                          {trends.pulse_rate.map((point, index) => {
                            const val = point.value; const minVal = 40; const maxVal = 160;
                            const pct = Math.max(10, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
                            return (
                              <div key={index} className="flex-1 bg-sky-600/70 hover:bg-sky-600 transition-colors group relative rounded-t"
                                style={{ height: `${pct}%` }}>
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-foreground text-background text-[10px] font-mono rounded shadow">{val}bpm</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
                          <span>Earliest</span><span>Latest Logs</span>
                        </div>
                      </div>
                    )}
                    {trends.oxygen_saturation && trends.oxygen_saturation.length > 0 && (
                      <div className="bg-card p-4 rounded-lg border">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Oxygen Saturation (%)</h4>
                        <div className="h-40 flex items-end gap-1.5 pt-6 border-b border-l border-border px-3 relative">
                          {trends.oxygen_saturation.map((point, index) => {
                            const val = point.value; const minVal = 70; const maxVal = 100;
                            const pct = Math.max(10, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
                            return (
                              <div key={index} className="flex-1 bg-teal-600/70 hover:bg-teal-600 transition-colors group relative rounded-t"
                                style={{ height: `${pct}%` }}>
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-foreground text-background text-[10px] font-mono rounded shadow">{val}%</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
                          <span>Earliest</span><span>Latest Logs</span>
                        </div>
                      </div>
                    )}
                    {trends.ews_score && trends.ews_score.length > 0 && (
                      <div className="bg-card p-4 rounded-lg border">
                        <h4 className="text-xs font-semibold text-foreground uppercase tracking-widest mb-3">Early Warning Score (NEWS2)</h4>
                        <div className="h-40 flex items-end gap-1.5 pt-6 border-b border-l border-border px-3 relative">
                          {trends.ews_score.map((point, index) => {
                            const val = point.value; const minVal = 0; const maxVal = 15;
                            const pct = Math.max(5, Math.min(100, ((val - minVal) / (maxVal - minVal)) * 100));
                            return (
                              <div key={index} className={cn("flex-1 transition-colors group relative rounded-t",
                                val >= 7 ? "bg-red-600/70 hover:bg-red-600" : val >= 5 ? "bg-yellow-600/70 hover:bg-yellow-600" : "bg-emerald-600/70 hover:bg-emerald-600")}
                                style={{ height: `${pct}%` }}>
                                <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block px-1.5 py-0.5 bg-foreground text-background text-[10px] font-mono rounded shadow">Score: {val}</span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] font-mono text-muted-foreground">
                          <span>Earliest</span><span>Latest Logs</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
            </CardContent>
          </Card>
        </div>
      </div>

      <TriageProgressCard
        hasComplaint={hasComplaint}
        hasVitals={hasVitals}
        hasAllergies={hasAllergies}
        completing={completing}
        onComplete={handleCompleteTriage}
      />

      {/* Completion Modal */}
      {showCompletionSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <Card className="max-w-md w-full mx-4 shadow-xl">
            <CardContent className="text-center space-y-4 pt-6">
              <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <Check className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold">Triage Complete</h2>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><span className="font-semibold text-foreground">{patient?.first_name} {patient?.last_name}</span> has been sent to the consultation queue.</p>
                {news2.score > 0 && (
                  <p className="font-mono text-xs">
                    NEWS2 Score: <span className={cn("font-bold",
                      news2.score >= 7 ? "text-red-600" : news2.score >= 5 ? "text-amber-600" : "text-emerald-600"
                    )}>{news2.score}</span> · {news2.riskLevel} Risk
                  </p>
                )}
              </div>
              <Button onClick={() => { router.push("/nurse-station"); }}>
                <ArrowLeft className="h-4 w-4" /> Back to Nurse Station
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
