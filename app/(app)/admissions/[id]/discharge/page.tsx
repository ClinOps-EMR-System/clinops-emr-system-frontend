"use client";

import React, { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import BillingConfirmation from "@/components/billing/BillingConfirmation";
import { parseBilling, type BillingSummary } from "@/types/billing";
import type { DischargeMedication } from "@/types/admission";
import {
  AlertCircle,
  ArrowLeft,
  Bed,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileText,
  Pill,
  Plus,
  Printer,
  Receipt,
  Send,
  ShieldCheck,
  Stethoscope,
  Trash2,
} from "lucide-react";
import { format, parseISO } from "date-fns";

export interface DischargeAdmission {
  id: number;
  patient_id: number;
  encounter_id: number | null;
  admission_date?: string;
  admission_diagnosis?: string | null;
  status?: string;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    hospital_number?: string;
  };
  ward?: { id: number; name: string };
  bed?: { id: number; bed_number: string };
}

export interface DischargePrescription {
  id: number;
  dosage?: string | null;
  route?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  drug?: { id: number; name: string } | null;
}

interface ChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

const MED_FIELDS: { key: keyof DischargeMedication; label: string }[] = [
  { key: "name", label: "Medication" },
  { key: "dosage", label: "Dosage" },
  { key: "route", label: "Route" },
  { key: "frequency", label: "Frequency" },
  { key: "duration", label: "Duration" },
  { key: "instructions", label: "Instructions" },
];

const DOC_TABLE_HEADERS = ["Medication", "Dosage", "Route", "Frequency", "Duration", "Instructions"];

const INITIAL_CHECKLIST: ChecklistItem[] = [
  { key: "criteria", label: "Discharge criteria met", checked: false },
  { key: "meds", label: "Medications reconciled", checked: false },
  { key: "follow_up", label: "Follow-up appointment scheduled", checked: false },
  { key: "family", label: "Family / caregiver notified", checked: false },
  { key: "records", label: "Records and notes finalized", checked: false },
];

export default function DischargePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const admissionId = resolvedParams.id;
  const { token, user } = useAuth();

  const [admission, setAdmission] = useState<DischargeAdmission | null>(null);
  const [prescriptions, setPrescriptions] = useState<DischargePrescription[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(INITIAL_CHECKLIST);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);

  const [dischargeDate, setDischargeDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [diagnosis, setDiagnosis] = useState<string>("");
  const [summaryText, setSummaryText] = useState<string>("");
  const [followUp, setFollowUp] = useState<string>("");
  const [medications, setMedications] = useState<DischargeMedication[]>([]);

  // Bill guard: track whether the patient has any outstanding (unpaid) bills
  const [billBlocked, setBillBlocked] = useState<boolean>(false);
  const [billBlockedNumber, setBillBlockedNumber] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token || !admissionId) return;
    setLoading(true);
    setError(null);

    try {
      const admissionRes = await api.get(`/admissions/${admissionId}`, token);
      const fetchedAdmission: DischargeAdmission = admissionRes?.data ?? admissionRes;
      setAdmission(fetchedAdmission);

      if (fetchedAdmission?.encounter_id) {
        const prescriptionsRes = await api.get(`/prescriptions?encounter_id=${fetchedAdmission.encounter_id}`, token);
        const payload = prescriptionsRes?.data ?? prescriptionsRes;
        setPrescriptions(payload?.data ?? payload ?? []);
      }

      // Check whether the patient has any outstanding bills that block discharge
      if (fetchedAdmission?.patient_id) {
        try {
          const billsRes = await api.get(`/bills?patient_id=${fetchedAdmission.patient_id}`, token);
          const billsList: Array<{ payment_status: string; bill_number?: string }> =
            (billsRes?.data as Array<{ payment_status: string; bill_number?: string }>) ??
            (billsRes as Array<{ payment_status: string; bill_number?: string }>) ??
            [];
          const BLOCKED_STATUSES = ["unpaid", "partially_paid", "partially_waived"];
          const unpaidBill = billsList.find((b) =>
            BLOCKED_STATUSES.includes((b.payment_status ?? "").toLowerCase().replace(" ", "_"))
          );
          if (unpaidBill) {
            setBillBlocked(true);
            setBillBlockedNumber(unpaidBill.bill_number ?? null);
          } else {
            setBillBlocked(false);
            setBillBlockedNumber(null);
          }
        } catch {
          // If billing check fails, don't block — let the backend enforce it
          setBillBlocked(false);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admission details");
    } finally {
      setLoading(false);
    }
  }, [token, admissionId]);

  useEffect(() => {
    fetchData(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchData]);

  const prefilledMeds = useRef(false);

  useEffect(() => {
    if (prescriptions.length > 0 && medications.length === 0 && !prefilledMeds.current) {
      prefilledMeds.current = true;
      const prefilled: DischargeMedication[] = prescriptions.map((p) => ({
        name: p.drug?.name ?? "",
        dosage: p.dosage ?? "",
        route: p.route ?? "",
        frequency: p.frequency ?? "",
        duration: p.duration ?? "",
        instructions: p.instructions ?? "",
      }));
      setMedications(prefilled);
    }
  }, [prescriptions, medications.length]);

  const allChecked = checklist.every((item) => item.checked);
  const checkedCount = checklist.filter((item) => item.checked).length;

  const toggleChecklist = (key: string) => {
    setChecklist((prev) => prev.map((item) => (item.key === key ? { ...item, checked: !item.checked } : item)));
  };

  const updateMedication = (index: number, field: keyof DischargeMedication, value: string) => {
    setMedications((prev) => prev.map((med, i) => (i === index ? { ...med, [field]: value } : med)));
  };

  const addMedication = () => {
    setMedications((prev) => [...prev, { name: "", dosage: "" }]);
  };

  const removeMedication = (index: number) => {
    setMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (billBlocked) {
      setError("Cannot discharge: this patient has an outstanding bill that must be settled first.");
      return;
    }
    if (!summaryText.trim()) {
      setError("A discharge summary is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.post(
        `/admissions/${admissionId}/discharge`,
        {
          discharge_date: dischargeDate,
          discharge_diagnosis: diagnosis || null,
          summary_text: summaryText,
          medications_on_discharge: medications.filter((m) => m.name && m.dosage),
          follow_up_instructions: followUp || null,
        },
        token
      );
      const billing = parseBilling(res);
      if (billing) {
        setBillingSummary(billing);
        return;
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to discharge patient");
    } finally {
      setSubmitting(false);
    }
  };

  const patientName = admission?.patient
    ? `${admission.patient.first_name} ${admission.patient.last_name}`
    : `Admission #${admissionId}`;
  const hospitalNumber = admission?.patient?.hospital_number ?? "";
  const admissionDate = admission?.admission_date ? format(parseISO(admission.admission_date), "PPP") : "—";
  const dischargeDateFormatted = dischargeDate ? format(new Date(`${dischargeDate}T00:00:00`), "PPP") : "—";
  const signatureDate = format(new Date(), "PPP");
  const displayMeds = medications.filter((m) => m.name || m.dosage);
  const docColumnClass = success ? "lg:col-span-12 print:col-span-12" : "lg:col-span-5 print:col-span-12";

  return (
    <div className="flex flex-col gap-6 max-w-[1500px] mx-auto pb-16">
      <div className="flex flex-col gap-2 print:hidden">
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
              <FileText className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-foreground">
                  Discharge Summary: {patientName}
                </h1>
                {admission?.status && (
                  <StatusBadge label={admission.status} variant="info" />
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5 flex-wrap">
                {hospitalNumber && (
                  <span>ID: <strong className="font-mono">{hospitalNumber}</strong></span>
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
                {admission?.admission_date && (
                  <span className="flex items-center gap-1">
                    <CalendarDays className="size-3" /> Admitted {admissionDate}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={fetchData} className="h-9 gap-1.5 text-xs">
              <Clock className="size-3.5" /> Refresh
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm flex items-center gap-2 print:hidden">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center gap-2 print:hidden">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>
            Patient discharged successfully. The discharge summary has been saved.{" "}
            <Link href="/admissions" className="font-semibold underline underline-offset-2 hover:text-emerald-600">
              Back to Admissions
            </Link>
          </span>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <Skeleton className="h-8 w-52" />
            <Skeleton className="h-36 w-full rounded-lg" />
            <Skeleton className="h-40 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="h-[520px] w-full rounded-lg" />
          </div>
        </div>
      ) : !admission ? (
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-4">
            <EmptyState
              icon={<AlertCircle className="size-8 text-muted-foreground/40" />}
              title="Unable to Load Admission"
              description="The admission record could not be loaded. Please try again."
              action={
                <Button size="sm" variant="outline" onClick={fetchData} className="h-8 text-xs">
                  <Clock className="size-3.5" /> Retry
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {!success && (
            <Card className="border-border/60 shadow-sm print:hidden">
              <CardHeader className="border-b bg-muted/20 py-3.5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="size-4 text-primary" />
                  Discharge Readiness Checklist
                </CardTitle>
                <CardDescription className="text-xs">
                  Confirm the following before preparing the discharge summary. The form unlocks once all items are checked.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                {checklist.map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => toggleChecklist(item.key)}
                      className="size-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className={`text-sm ${item.checked ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {item.label}
                    </span>
                  </label>
                ))}
                <div className="flex items-center justify-between pt-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <ShieldCheck className={`size-3.5 ${allChecked ? "text-emerald-600" : "text-muted-foreground/40"}`} />
                    {allChecked
                      ? "All items confirmed — the discharge form is unlocked."
                      : `${checkedCount} of ${checklist.length} items confirmed`}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bill guard banner — shown prominently above the form */}
          {billBlocked && !success && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-300 text-red-800 px-5 py-4 rounded-xl shadow-sm print:hidden">
              <Receipt className="size-5 shrink-0 mt-0.5 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">
                  Discharge blocked — outstanding bill
                  {billBlockedNumber ? (
                    <span className="font-mono ml-1">({billBlockedNumber})</span>
                  ) : null}
                </p>
                <p className="text-xs mt-0.5 text-red-700">
                  This patient has an unpaid or partially-paid bill. The bill must be settled before discharge can be completed.{" "}
                  <a
                    href="/billing"
                    className="underline underline-offset-2 font-semibold hover:text-red-900"
                  >
                    Go to Billing
                  </a>
                </p>
              </div>
            </div>
          )}

          {allChecked && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {!success && (
                <div className="lg:col-span-7 flex flex-col gap-6 print:hidden">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="border-b bg-muted/20 py-3.5">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <CalendarDays className="size-4 text-primary" />
                          Discharge Details
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Date of discharge and final diagnosis at the time of discharge.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] text-muted-foreground font-medium block mb-1">
                              Discharge Date
                            </label>
                            <Input
                              type="date"
                              value={dischargeDate}
                              onChange={(e) => setDischargeDate(e.target.value)}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground font-medium block mb-1">
                              Discharge Diagnosis
                            </label>
                            <Input
                              value={diagnosis}
                              onChange={(e) => setDiagnosis(e.target.value)}
                              placeholder="Primary diagnosis at discharge"
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="border-b bg-muted/20 py-3.5">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <FileText className="size-4 text-primary" />
                          Discharge Summary
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Summary of the hospital course, treatment provided, and clinical status at discharge. Required.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <textarea
                          required
                          rows={6}
                          value={summaryText}
                          onChange={(e) => setSummaryText(e.target.value)}
                          placeholder="Summarize the admission course, treatment provided, and condition at discharge..."
                          className="w-full text-xs resize-none bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="border-b bg-muted/20 py-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                              <Pill className="size-4 text-primary" />
                              Medications on Discharge
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {prescriptions.length > 0
                                ? "Pre-filled from the encounter's prescriptions. Edit, add, or remove rows as needed."
                                : "No prescriptions found for this encounter — add medications manually if required."}
                            </CardDescription>
                          </div>
                          <Button type="button" size="sm" variant="outline" onClick={addMedication} className="h-8 gap-1.5 text-xs">
                            <Plus className="size-3.5" /> Add Medication
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        {medications.length === 0 ? (
                          <div className="py-8">
                            <EmptyState
                              icon={<Pill className="size-8 text-muted-foreground/40" />}
                              title="No Medications Added"
                              description="Add discharge medications using the button above."
                            />
                          </div>
                        ) : (
                          medications.map((med, index) => (
                            <div key={index} className="bg-muted/40 rounded-lg border border-border/60 p-3">
                              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
                                {MED_FIELDS.map((f) => (
                                  <div key={f.key}>
                                    <label className="text-[10px] text-muted-foreground font-medium block mb-1">
                                      {f.label}
                                    </label>
                                    <Input
                                      value={med[f.key] ?? ""}
                                      onChange={(e) => updateMedication(index, f.key, e.target.value)}
                                      placeholder={f.label}
                                      className="h-8 text-xs bg-background"
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeMedication(index)}
                                  className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="size-3.5" /> Remove
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                      <CardHeader className="border-b bg-muted/20 py-3.5">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <Stethoscope className="size-4 text-primary" />
                          Follow-up Instructions
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Appointments, warning signs, and post-discharge care instructions for the patient.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-4">
                        <textarea
                          rows={3}
                          value={followUp}
                          onChange={(e) => setFollowUp(e.target.value)}
                          placeholder="e.g. Outpatient review in 2 weeks at the Medical Outpatient Clinic. Return immediately for fever, worsening dyspnea, or wound bleeding..."
                          className="w-full text-xs resize-none bg-background border border-input rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                        />
                      </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <ShieldCheck className="size-3.5 text-emerald-600" />
                            Submitting will discharge the patient and free the bed for cleaning.
                          </p>
                          {billBlocked && (
                            <p className="text-xs text-red-600 flex items-center gap-1.5 font-medium">
                              <Receipt className="size-3.5" />
                              Settle the outstanding bill before discharging.
                            </p>
                          )}
                          <Button type="submit" disabled={submitting || billBlocked} className="h-9 px-5 gap-2 text-xs w-full sm:w-auto">
                            <Send className="size-3.5" />
                            {submitting ? "Dispatching..." : "Complete Discharge"}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </form>
                </div>
              )}

              <div className={docColumnClass}>
                <Card className="border-border/60 shadow-sm print:shadow-none print:rounded-none print:ring-0 print:bg-white">
                  <CardHeader className="border-b bg-muted/20 py-3.5 print:hidden">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Printer className="size-4 text-primary" />
                        Printable Document Preview
                      </CardTitle>
                      <Button size="sm" variant="outline" onClick={() => window.print()} className="h-8 gap-1.5 text-xs print:hidden">
                        <Printer className="size-3.5" /> Print
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 print:p-0">
                    <div className="bg-white text-slate-900 border border-slate-300 rounded-lg p-6 shadow-sm print:shadow-none print:rounded-none print:border-0 print:p-0">
                      <div className="border-b-2 border-slate-900 pb-3 mb-4 text-center">
                        <h2 className="text-base font-bold uppercase tracking-wide">
                          ClinOps EMR — Discharge Summary
                        </h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">Patient Discharge Record</p>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs mb-4">
                        <div>
                          <span className="font-bold">Patient:</span> {patientName}
                        </div>
                        <div>
                          <span className="font-bold">Hosp. No.:</span>{" "}
                          <span className="font-mono">{hospitalNumber || "—"}</span>
                        </div>
                        <div>
                          <span className="font-bold">Admitted:</span> {admissionDate}
                        </div>
                        <div>
                          <span className="font-bold">Discharge Date:</span> {dischargeDateFormatted}
                        </div>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-1.5">
                          Discharge Diagnosis
                        </h3>
                        <p className="text-xs whitespace-pre-line leading-relaxed">{diagnosis || "—"}</p>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-1.5">
                          Summary of Hospital Course
                        </h3>
                        <p className="text-xs whitespace-pre-line leading-relaxed">{summaryText || "—"}</p>
                      </div>

                      <div className="mb-4">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-1.5">
                          Medications on Discharge
                        </h3>
                        {displayMeds.length === 0 ? (
                          <p className="text-xs text-slate-500 italic">None recorded.</p>
                        ) : (
                          <table className="w-full text-[11px] border-collapse">
                            <thead>
                              <tr>
                                {DOC_TABLE_HEADERS.map((h) => (
                                  <th key={h} scope="col" className="text-left font-bold border border-slate-300 px-1.5 py-1">
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {displayMeds.map((m, i) => (
                                <tr key={i}>
                                  <td className="border border-slate-300 px-1.5 py-1">{m.name}</td>
                                  <td className="border border-slate-300 px-1.5 py-1">{m.dosage}</td>
                                  <td className="border border-slate-300 px-1.5 py-1">{m.route ?? ""}</td>
                                  <td className="border border-slate-300 px-1.5 py-1">{m.frequency ?? ""}</td>
                                  <td className="border border-slate-300 px-1.5 py-1">{m.duration ?? ""}</td>
                                  <td className="border border-slate-300 px-1.5 py-1">{m.instructions ?? ""}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>

                      <div className="mb-6">
                        <h3 className="text-[11px] font-bold uppercase tracking-wider border-b border-slate-300 pb-1 mb-1.5">
                          Follow-up Instructions
                        </h3>
                        <p className="text-xs whitespace-pre-line leading-relaxed">{followUp || "—"}</p>
                      </div>

                      <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-xs">
                        <span>
                          Discharged by: <strong>{user?.name ?? "Clinician"}</strong>
                        </span>
                        <span>{signatureDate}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {billingSummary && (
        <BillingConfirmation
          billing={billingSummary}
          onDone={() => {
            setBillingSummary(null);
            setSuccess(true);
          }}
        />
      )}
    </div>
  );
}
