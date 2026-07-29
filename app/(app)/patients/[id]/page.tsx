"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Edit, Stethoscope, MessageSquare, ArrowLeft, Check, TriangleAlert,
  Phone, Shield, Users, HeartPulse, CalendarClock, ClipboardList,
  FileText, Plus, Loader2,
} from "lucide-react";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import type { Patient, Allergy, Encounter } from "@/types/patient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/ui/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { SectionHeader } from "@/components/ui/PageLayout";
import Tabs, { TabPanel } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

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
    id: number;
    temperature: number | null;
    blood_pressure: string | null;
    pulse_rate: number | null;
    respiratory_rate: number | null;
    oxygen_saturation: number | null;
    weight: number | null;
    height: number | null;
    pain_score: number | null;
    ews_score: number | null;
    triage_category: number | null;
    triage_color: string | null;
    recorded_at: string;
  }[];
}

interface Diagnosis {
  id: number;
  code: string;
  description: string;
  diagnosis_type: string;
  certainty: string | null;
  diagnosed_at: string;
  patient_id: number;
}

const statusLabelMap: Record<string, { label: string; variant: "success" | "warning" | "error" | "info" | "neutral" | "purple" }> = {
  "Checked-in": { label: "In Triage", variant: "warning" },
  "In Triage": { label: "In Triage", variant: "warning" },
  Emergency: { label: "Emergency", variant: "error" },
  "Triage Complete": { label: "Triaged", variant: "info" },
  "In Consultation": { label: "In Consult", variant: "purple" },
  Completed: { label: "Completed", variant: "success" },
  Discharged: { label: "Discharged", variant: "success" },
};

function InfoRow({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide shrink-0">{label}</span>
      <span className={cn("text-sm text-right", mono && "font-mono font-medium")}>{value ?? "—"}</span>
    </div>
  );
}

export default function PatientProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<TriageSummary | null>(null);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("vitals");
  const [checkingIn, setCheckingIn] = useState(false);

  async function fetchProfileData() {
    try {
      setLoading(true);
      setError(null);

      const patientRes = await api.get(`/patients/${patientId}`, token);
      if (patientRes?.data) {
        setPatient(patientRes.data.patient);
      }

      const triageRes = await api.get(`/patients/${patientId}/triage`, token);
      if (triageRes?.data) {
        setSummary(triageRes.data as TriageSummary);
      }

      const diagnosesRes = await api.get("/diagnoses", token);
      if (diagnosesRes?.data) {
        const filtered = (diagnosesRes.data as Diagnosis[]).filter(
          (d) => d.patient_id === parseInt(patientId)
        );
        setDiagnoses(filtered);
      }

      const encounterRes = await api.get(`/patients/${patientId}/encounters`, token);
      if (encounterRes?.data) {
        const list = Array.isArray(encounterRes.data) ? encounterRes.data : encounterRes.data.data ?? [];
        setEncounters(list);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load patient profile data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && patientId) fetchProfileData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [token, patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStartNewVisit() {
    if (!token || checkingIn) return;
    setCheckingIn(true);
    try {
      await api.post(`/patients/${patientId}/check-in`, {}, token);
      router.push(`/patients/${patientId}/triage`);
    } catch {
      setError("Failed to start a new visit. Please try again.");
      setCheckingIn(false);
    }
  }

  const activeEncounter = encounters.find((e) =>
    !["Completed", "Discharged"].includes(e.status)
  );
  const encounterStatus = activeEncounter?.status ?? null;
  const statusInfo = encounterStatus ? statusLabelMap[encounterStatus] : null;
  const latestTriageCategory = summary?.vital_signs?.[0]?.triage_category ?? null;
  const previousVisits = encounters.filter((e) =>
    ["Completed", "Discharged"].includes(e.status)
  ).length;

  const birthDate = patient ? new Date(patient.date_of_birth) : null;
  const age = birthDate ? new Date().getFullYear() - birthDate.getFullYear() : null;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !patient) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-destructive">
          <TriangleAlert className="h-5 w-5" />
          <span className="font-semibold">{error}</span>
        </div>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/patients")}>
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Button>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-10">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold text-foreground">Patient Not Found</p>
          <p className="text-sm text-muted-foreground mt-1">No patient record matches this ID.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/patients")}>
            <ArrowLeft className="h-4 w-4" />
            Back to Patients
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SectionHeader
        title={`${patient.first_name} ${patient.last_name}`}
        description={`Hospital #${patient.hospital_number} · ${patient.patient_category ?? "No category"} · ${encounters.length} visit${encounters.length !== 1 ? "s" : ""} on record`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" nativeButton={false} render={<Link href={`/patients/register?edit=${patientId}`} />}>
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
            {encounterStatus === "Checked-in" || encounterStatus === "In Triage" ? (
              <Button nativeButton={false} render={<Link href={`/patients/${patientId}/triage`} />}>
                <Stethoscope className="h-4 w-4" />
                Continue Triage
              </Button>
            ) : encounterStatus === "Triage Complete" || encounterStatus === "In Consultation" ? (
              <Button nativeButton={false} render={<Link href={`/patients/${patientId}/consultation`} />}>
                <MessageSquare className="h-4 w-4" />
                {encounterStatus === "In Consultation" ? "Continue Consult" : "Consult"}
              </Button>
            ) : encounterStatus === "Emergency" ? (
              <Button nativeButton={false} render={<Link href={`/patients/${patientId}/emergency-triage`} />}>
                <TriangleAlert className="h-4 w-4" />
                Emergency Triage
              </Button>
            ) : (
              <Button onClick={handleStartNewVisit} disabled={checkingIn}>
                {checkingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Start New Visit
              </Button>
            )}
            <Button variant="ghost" onClick={() => router.push("/patients")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      <Card className={cn("border-l-4", statusInfo ? "border-l-primary" : "border-l-muted")}>
        <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4 flex-wrap">
            {statusInfo ? (
              <StatusBadge label={statusInfo.label} variant={statusInfo.variant} pulse />
            ) : (
              <StatusBadge label="No Active Visit" variant="neutral" />
            )}
            {latestTriageCategory && (
              <Badge variant={latestTriageCategory >= 3 ? "destructive" : "secondary"}>
                Triage Category {latestTriageCategory}
              </Badge>
            )}
            {patient.patient_category && (
              <Badge variant="outline">{patient.patient_category}</Badge>
            )}
            {summary?.pregnancy_status && patient.gender === "Female" && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100">
                Active Pregnancy
              </Badge>
            )}
            {previousVisits > 0 && (
              <span className="text-xs text-muted-foreground">
                {previousVisits} previous visit{previousVisits !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {summary?.encounter?.chief_complaint && (
            <div className="text-sm text-muted-foreground max-w-md text-right">
              <span className="font-semibold text-foreground">Chief Complaint:</span>{" "}
              {summary.encounter.chief_complaint}
            </div>
          )}
          {!statusInfo && !summary?.encounter?.chief_complaint && (
            <div className="text-sm text-muted-foreground">
              No active visit. Click <span className="font-semibold">Start New Visit</span> to begin a new encounter.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Demographics
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shrink-0",
                  patient.gender === "Male" ? "bg-sky-600" : patient.gender === "Female" ? "bg-rose-500" : "bg-gray-500"
                )}>
                  {patient.gender === "Male" ? "M" : patient.gender === "Female" ? "F" : "—"}
                </div>
                <div>
                  <span className="block font-semibold text-foreground">
                    {patient.gender}
                    {age !== null && <span className="font-normal text-muted-foreground ml-1">· {age} yrs</span>}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {birthDate?.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <InfoRow label="National ID" value={patient.national_id} mono />
                <InfoRow label="Passport No" value={patient.health_passport_number} mono />
                <Separator className="my-1" />
                <InfoRow label="Occupation" value={patient.occupation} />
                <InfoRow label="Marital Status" value={patient.marital_status} />
                <InfoRow label="Language" value={patient.preferred_language} />
                <Separator className="my-1" />
                <InfoRow label="Referral Source" value={patient.referral_source} />
                <InfoRow label="Registered By" value={patient.creator?.name} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact & Address
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Phone" value={patient.phone} mono />
              <InfoRow label="Address" value={patient.address} />
              <Separator className="my-1" />
              <InfoRow label="Village" value={patient.village} />
              <InfoRow label="TA" value={patient.traditional_authority} />
              <InfoRow label="District" value={patient.district} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Insurance
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Provider" value={patient.insurance_provider} />
              <InfoRow label="Policy No" value={patient.insurance_policy_number} mono />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Next of Kin
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoRow label="Name" value={patient.guardian_name} />
              <InfoRow label="Relationship" value={patient.next_of_kin_relationship} />
              <InfoRow label="Contact" value={patient.guardian_phone} mono />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <Tabs
              tabs={[
                { key: "vitals", label: "Vitals", icon: <HeartPulse className="h-3.5 w-3.5" />, count: summary?.vital_signs?.length },
                { key: "diagnoses", label: "Diagnoses", icon: <ClipboardList className="h-3.5 w-3.5" />, count: diagnoses.length },
                { key: "allergies", label: "Allergies", icon: <TriangleAlert className="h-3.5 w-3.5" />, count: summary?.allergies?.length },
                { key: "encounters", label: "Visits", icon: <CalendarClock className="h-3.5 w-3.5" />, count: encounters.length },
                { key: "consents", label: "Consents", icon: <FileText className="h-3.5 w-3.5" /> },
              ]}
              activeKey={activeTab}
              onChange={setActiveTab}
              size="sm"
            />

            <CardContent className="pt-6">
              <TabPanel tabKey="vitals" activeKey={activeTab} tablistId="profile-tabs">
                {summary?.vital_signs && summary.vital_signs.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date / Time</TableHead>
                          <TableHead>Temp</TableHead>
                          <TableHead>BP</TableHead>
                          <TableHead>Pulse</TableHead>
                          <TableHead>RR</TableHead>
                          <TableHead>SpO₂</TableHead>
                          <TableHead>Pain</TableHead>
                          <TableHead>NEWS2</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.vital_signs.map((v) => {
                          const date = new Date(v.recorded_at);
                          return (
                            <TableRow key={v.id}>
                              <TableCell className="text-muted-foreground whitespace-nowrap">
                                {date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </TableCell>
                              <TableCell className="font-mono">{v.temperature ? `${v.temperature}°C` : "—"}</TableCell>
                              <TableCell className="font-mono">{v.blood_pressure || "—"}</TableCell>
                              <TableCell className="font-mono">{v.pulse_rate ? `${v.pulse_rate}` : "—"}</TableCell>
                              <TableCell className="font-mono">{v.respiratory_rate ?? "—"}</TableCell>
                              <TableCell className="font-mono">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : "—"}</TableCell>
                              <TableCell className="font-mono">{v.pain_score ?? "—"}</TableCell>
                              <TableCell>
                                {v.ews_score !== null ? (
                                  <Badge variant={
                                    v.triage_color === "red" ? "destructive" :
                                    v.triage_color === "yellow" ? "secondary" : "outline"
                                  }>
                                    {v.ews_score}
                                  </Badge>
                                ) : "—"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <HeartPulse className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No vital signs logged for this patient.</p>
                  </div>
                )}
              </TabPanel>

              <TabPanel tabKey="diagnoses" activeKey={activeTab} tablistId="profile-tabs">
                {diagnoses.length > 0 ? (
                  <div className="divide-y divide-border rounded border border-border overflow-hidden">
                    {diagnoses.map((d) => (
                      <div key={d.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">{d.code}</Badge>
                          <div className="min-w-0">
                            <span className="font-medium text-sm text-foreground block truncate">{d.description}</span>
                            <span className="text-xs text-muted-foreground">
                              {d.diagnosis_type}{d.certainty ? ` · ${d.certainty}` : ""}
                            </span>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
                          {new Date(d.diagnosed_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No diagnoses registered for this patient.</p>
                  </div>
                )}
              </TabPanel>

              <TabPanel tabKey="allergies" activeKey={activeTab} tablistId="profile-tabs">
                {summary?.allergies && summary.allergies.length > 0 ? (
                  <div className="divide-y divide-border rounded border border-border overflow-hidden">
                    {summary.allergies.map((a) => (
                      <div key={a.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                        <div className="min-w-0">
                          <span className="font-medium text-foreground text-sm">{a.allergen}</span>
                          {a.reaction && <p className="text-xs text-muted-foreground mt-0.5">Reaction: {a.reaction}</p>}
                        </div>
                        <Badge variant={
                          a.severity === "severe" ? "destructive" :
                          a.severity === "moderate" ? "secondary" : "outline"
                        }>
                          {a.severity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : summary?.allergies_confirmed ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center text-sm font-semibold text-emerald-800 flex items-center justify-center gap-2">
                    <Check className="h-5 w-5 text-emerald-600" />
                    NO KNOWN ALLERGIES (NKA)
                  </div>
                ) : (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-sm font-semibold text-amber-800 flex items-center justify-center gap-2">
                    <TriangleAlert className="h-5 w-5 text-amber-600 animate-pulse" />
                    ALLERGIES UNCONFIRMED
                  </div>
                )}
              </TabPanel>

              <TabPanel tabKey="encounters" activeKey={activeTab} tablistId="profile-tabs">
                {encounters.length > 0 ? (
                  <div className="divide-y divide-border rounded border border-border overflow-hidden">
                    {encounters.map((enc) => {
                      const encStatus = statusLabelMap[enc.status];
                      return (
                        <div key={enc.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="shrink-0">
                              <CalendarClock className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-sm text-foreground block">
                                {enc.encounter_type}
                              </span>
                              {enc.chief_complaint && (
                                <span className="text-xs text-muted-foreground truncate block">{enc.chief_complaint}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            {encStatus && (
                              <StatusBadge label={encStatus.label} variant={encStatus.variant} size="sm" />
                            )}
                            <span className="text-xs text-muted-foreground font-mono">
                              {enc.visit_date ? new Date(enc.visit_date).toLocaleDateString() : ""}
                              {enc.created_at && !enc.visit_date ? new Date(enc.created_at).toLocaleDateString() : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CalendarClock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No encounters recorded for this patient.</p>
                  </div>
                )}
              </TabPanel>

              <TabPanel tabKey="consents" activeKey={activeTab} tablistId="profile-tabs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {([
                    { key: "care", label: "Clinical Care", value: patient.consent_care, desc: "Patient permits clinical intervention & vital recording." },
                    { key: "teaching", label: "Clinical Teaching", value: patient.consent_teaching, desc: "Patient permits case presentation to medical interns." },
                    { key: "research", label: "Research Use", value: patient.consent_research, desc: "Patient permits anonymized data aggregation for studies." },
                  ] as const).map((c) => (
                    <div key={c.key} className={cn(
                      "p-4 rounded-lg border text-center flex flex-col justify-between min-h-[9rem]",
                      c.value
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-red-50 border-red-200 text-red-900"
                    )}>
                      <span className="text-xs font-bold uppercase tracking-wider block">{c.label}</span>
                      <span className={cn(
                        "text-2xl font-black block tracking-tight my-2",
                        c.value ? "text-emerald-700" : "text-red-700"
                      )}>
                        {c.value ? "GRANTED" : "DENIED"}
                      </span>
                      <span className="text-[10px] text-muted-foreground leading-tight">{c.desc}</span>
                    </div>
                  ))}
                </div>
              </TabPanel>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
