"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { useRealtime } from "@/store/RealtimeContext";
import { useLabResultBus } from "@/store/LabResultBus";
import { usePermissions } from "@/lib/hooks/usePermissions";
import { api } from "@/lib/api";
import type { Patient, Allergy } from "@/types/patient";
import type { LabResult } from "@/types/lab";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/ui/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionHeader } from "@/components/ui/PageLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import BillingConfirmation from "@/components/billing/BillingConfirmation";
import LabResultsPanel from "@/components/consultation/LabResultsPanel";
import type { BillingSummary } from "@/types/billing";
import { cn } from "@/lib/utils";
import { getTemplatesByCategory } from "@/lib/clinical-templates";
import {
  ArrowLeft, Loader2, Check, TriangleAlert, HeartPulse, Stethoscope,
  ClipboardList, ClipboardPen, FlaskConical, Pill, LogOut, DoorOpen,
  Search, Plus, X, History, Clock, ArrowRightLeft, Receipt,
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
    status: string;
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

interface LabRequest {
  id: number;
  test_name: string;
  loinc_code: string | null;
  status: string;
  specimen_collected_at: string | null;
  is_critical: boolean;
  results?: LabResult[];
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
  lab_requests?: LabRequest[];
}

interface Prescription {
  id: number;
  patient_id: number;
  encounter_id: number;
  drug_id: number;
  drug?: { id: number; name: string; strength: string | null; formulation: string | null; current_stock: number | null };
  dosage: string;
  route: string;
  frequency: string;
  duration: string | null;
  quantity: number | null;
  status: string;
  instructions: string | null;
  is_controlled: boolean;
  allergy_check: boolean;
  interaction_check: boolean;
  allergy_override_reason: string | null;
  allergy_override_by: number | null;
  allergy_override_at: string | null;
  created_at: string;
}

interface Drug {
  id: number;
  name: string;
  generic_name: string | null;
  formulation: string | null;
  strength: string | null;
  current_stock: number | null;
  reorder_level: number | null;
  atc_code: string | null;
}

interface BillingServiceItem {
  id: number;
  name: string;
  category: string | null;
  unit_price: number;
}

interface BillLine {
  id: number;
  item_name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

type SubTab = "subjective" | "objective" | "assessment" | "plan" | "orders" | "results" | "prescriptions" | "timeline" | "billing";

const subTabs: { key: SubTab; label: string; icon: React.ReactNode }[] = [
  { key: "subjective", label: "Subjective (S)", icon: <ClipboardPen className="h-4 w-4" /> },
  { key: "objective", label: "Objective (O)", icon: <HeartPulse className="h-4 w-4" /> },
  { key: "assessment", label: "Assessment (A)", icon: <ClipboardList className="h-4 w-4" /> },
  { key: "plan", label: "Plan (P)", icon: <ClipboardPen className="h-4 w-4" /> },
  { key: "orders", label: "Orders", icon: <FlaskConical className="h-4 w-4" /> },
  { key: "results", label: "Results", icon: <FlaskConical className="h-4 w-4" /> },
  { key: "prescriptions", label: "Rx", icon: <Pill className="h-4 w-4" /> },
  { key: "timeline", label: "Case Timeline", icon: <History className="h-4 w-4" /> },
  { key: "billing", label: "Billing", icon: <Receipt className="h-4 w-4" /> },
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

function Sparkline({ data, color = "bg-primary", height = 32 }: { data: { value: number }[]; color?: string; height?: number }) {
  if (data.length === 0) return null;
  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (
    <div className="flex items-end gap-px" style={{ height }}>
      {values.map((v, i) => {
        const pct = ((v - min) / range) * 100;
        return (
          <div
            key={i}
            className={`flex-1 rounded-t-sm ${color} opacity-70 hover:opacity-100 transition-opacity`}
            style={{ height: `${Math.max(4, pct)}%` }}
            title={`${v}`}
          />
        );
      })}
    </div>
  );
}

export default function ClinicianSOAPConsultation() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const { subscribe } = useRealtime();
  const { openResult } = useLabResultBus();
  const { can } = usePermissions();
  const isStudent = (user?.roles ?? []).some((r) => String(r).toLowerCase() === "medical student");
  const patientId = params.id as string;

  const [activeSubTab, setActiveSubTab] = useState<SubTab>("subjective");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [summary, setSummary] = useState<TriageSummary | null>(null);
  const [verification, setVerification] = useState<{ id: number; status: string; comments: string | null; submitted_at: string } | null>(null);
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
  const [resultsRefreshKey, setResultsRefreshKey] = useState(0);
  const [orderForm, setOrderForm] = useState({ test_name: "", clinical_indication: "", priority: "routine" });

  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<Drug[]>([]);
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [rxForm, setRxForm] = useState({ dosage: "", route: "oral", frequency: "BD", duration: "7 days", quantity: "30", notes: "", is_controlled: false });
  const [allergyWarnings, setAllergyWarnings] = useState<{
    allergen: string;
    severity: string;
    reaction: string | null;
    matched_term?: string | null;
    matched_class?: string | null;
    match_type?: "name" | "class";
  }[]>([]);
  const [overrideReason, setOverrideReason] = useState("");

  type TrendPoint = { recorded_at: string; value: number };
  const [vitalTrends, setVitalTrends] = useState<Record<string, TrendPoint[]>>({});

  interface CriticalAlert {
    id: number;
    alert_type: string;
    severity: string;
    message: string;
    created_at: string;
    patient?: { hospital_number: string; first_name: string; last_name: string };
  }
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalAlert[]>([]);

  const [dispositionOpen, setDispositionOpen] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [pendingNav, setPendingNav] = useState<string | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"discharge" | "admit" | "refer" | "observe" | "deceased">("discharge");

  const [bill, setBill] = useState<{ id: number; items: BillLine[]; total_amount: number; payment_status: string } | null>(null);
  const [billLoading, setBillLoading] = useState(false);
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceResults, setServiceResults] = useState<BillingServiceItem[]>([]);
  const [allServices, setAllServices] = useState<BillingServiceItem[]>([]);
  const [serviceCategory, setServiceCategory] = useState<string>("all");
  const [addingBillItem, setAddingBillItem] = useState(false);

  const SERVICE_CATEGORIES: Array<[string, string]> = [
    ["all", "All"],
    ["Consultation", "Consultation"],
    ["Lab", "Lab"],
    ["Pharmacy", "Pharmacy"],
    ["Misc", "Misc"],
  ];

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

      const encounterId = triageRes?.data?.encounter?.id;

      if (encounterId) {
        const [ordersRes, prescriptionsRes, consultationRes, alertsRes] = await Promise.all([
          api.get(`/orders?patient_id=${patientId}&encounter_id=${encounterId}`, token).catch(() => null),
          api.get(`/prescriptions?encounter_id=${encounterId}`, token).catch(() => null),
          api.get(`/encounters/${encounterId}/consultation`, token).catch(() => null),
          api.get(`/alerts?encounter_id=${encounterId}`, token).catch(() => null),
        ]);

        if (ordersRes?.data) {
          setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.data || []);
        }
        if (prescriptionsRes?.data) {
          setPrescriptions(Array.isArray(prescriptionsRes.data) ? prescriptionsRes.data : prescriptionsRes.data.data || []);
        }
        if (consultationRes?.data) {
          setVerification(consultationRes.data.verification ?? null);
          const note = consultationRes.data.clinical_note;
          if (note) {
            if (note.physical_examination) setPhysicalExam(note.physical_examination);
            else if (note.content && note.note_type === "physical_exam") setPhysicalExam(note.content);
            if (note.plan) setPlanInstructions(note.plan);
            else if (note.content && note.note_type === "consultation_plan") setPlanInstructions(note.content);
            if (note.history_of_present_illness && !hpi) setHpi(note.history_of_present_illness);
          }
        }
        if (alertsRes?.data) {
          setCriticalAlerts(Array.isArray(alertsRes.data) ? alertsRes.data : []);
        }
      } else {
        try {
          const ordersRes = await api.get(`/orders?patient_id=${patientId}`, token);
          if (ordersRes?.data) {
            setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.data || []);
          }
        } catch { setOrders([]); }

        try {
          const rxRes = await api.get(`/prescriptions?patient_id=${patientId}`, token);
          if (rxRes?.data) {
            setPrescriptions(Array.isArray(rxRes.data) ? rxRes.data : rxRes.data.data || []);
          }
        } catch { setPrescriptions([]); }
      }
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
    if (!token) return;
    const off = subscribe("clinops_lab_results", (raw: unknown) => {
      const ev = raw as { encounter_id?: number; patient_id?: number; lab_result_id?: number };
      if (typeof ev?.lab_result_id !== "number") return;
      if (ev.encounter_id !== undefined && ev.encounter_id !== summary?.encounter?.id) return;
      if (ev.encounter_id === undefined && ev.patient_id !== undefined && ev.patient_id !== Number(patientId)) return;
      setResultsRefreshKey((k) => k + 1);
      void fetchConsultationData();
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe, token, summary?.encounter?.id]);

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

  useEffect(() => {
    if (!selectedDrug || !token || !patientId) return;
    let cancelled = false;
    api.get(`/patients/${patientId}/allergy-check?drug_id=${selectedDrug.id}`, token)
      .then((res) => {
        if (!cancelled) {
          setAllergyWarnings(res?.data?.has_match ? res.data.matches : []);
        }
      })
      .catch(() => { if (!cancelled) setAllergyWarnings([]); });
    return () => { cancelled = true; };
  }, [selectedDrug, token, patientId]);

  useEffect(() => {
    if (activeSubTab === "billing" && token && summary?.encounter?.id) {
      void loadBill();
      void loadAllServices();
    }
    if (activeSubTab === "objective" && token && patientId) {
      api.get(`/patients/${patientId}/vital-signs/trends?days=7`, token)
        .then((res) => { if (res?.data) setVitalTrends(res.data); })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSubTab, token, summary?.encounter?.id]);

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
        drug_id: selectedDrug.id,
        drug_name: selectedDrug.name,
        generic_name: selectedDrug.generic_name,
        dosage: rxForm.dosage,
        route: rxForm.route,
        frequency: rxForm.frequency,
        duration: rxForm.duration || null,
        quantity: parseInt(rxForm.quantity) || 30,
        notes: rxForm.notes || null,
        allergy_override_reason: allergyWarnings.length > 0 ? overrideReason.trim() || null : null,
        is_controlled: rxForm.is_controlled,
      }, token);
      setSuccessMsg(`Prescription for ${selectedDrug.name} created.`);
      setSelectedDrug(null);
      setDrugQuery("");
      setAllergyWarnings([]);
      setOverrideReason("");
      setRxForm({ dosage: "", route: "oral", frequency: "BD", duration: "7 days", quantity: "30", notes: "", is_controlled: false });
      fetchConsultationData();
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      setError(
        status === 422
          ? "This medication matches a recorded allergy. Provide an override reason to prescribe it anyway."
          : err instanceof Error
            ? err.message
            : "Failed to create prescription.",
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  async function loadBill() {
    const encounterId = summary?.encounter?.id;
    if (!token || !encounterId) return;
    setBillLoading(true);
    try {
      const res = await api.get(`/encounters/${encounterId}/bill`, token);
      setBill(res?.data ?? null);
    } catch {
      setBill(null);
    } finally {
      setBillLoading(false);
    }
  }

  async function searchServices(query: string) {
    setServiceQuery(query);
    if (query.length < 2) {
      setServiceResults([]);
      return;
    }
    const categoryParam = serviceCategory !== "all" ? `&category=${encodeURIComponent(serviceCategory)}` : "";
    try {
      const res = await api.get(`/services?search=${encodeURIComponent(query)}${categoryParam}`, token);
      setServiceResults(res?.data ?? []);
    } catch {
      setServiceResults([]);
    }
  }

  async function loadAllServices() {
    if (allServices.length > 0) return;
    try {
      const res = await api.get("/services", token);
      const data = res?.data ?? [];
      const services = Array.isArray(data) ? data : data.data || [];
      setAllServices(services);
    } catch {
      setAllServices([]);
    }
  }

  function getFilteredServices(): BillingServiceItem[] {
    let services = allServices;
    if (serviceCategory !== "all") {
      services = services.filter((s) => s.category === serviceCategory);
    }
    if (serviceQuery.length >= 2) {
      services = services.filter(
        (s) =>
          s.name?.toLowerCase().includes(serviceQuery.toLowerCase()) ||
          s.category?.toLowerCase().includes(serviceQuery.toLowerCase())
      );
    }
    return services;
  }

  async function addServiceToBill(service: BillingServiceItem) {
    if (!bill || !token) return;
    setAddingBillItem(true);
    try {
      await api.post(`/bills/${bill.id}/items`, {
        item_name: service.name,
        service_id: service.id,
        quantity: 1,
        unit_price: Number(service.unit_price) || 0,
        source_type: "manual",
        source_id: service.id,
      }, token);
      await loadBill();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add service to bill");
    } finally {
      setAddingBillItem(false);
    }
  }

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
  const encounterStatus = summary?.encounter?.status ?? "unknown";

  const statusLabel: Record<string, string> = {
    in_consultation: "In Consultation",
    orders_pending: "Orders Pending",
    awaiting_results: "Awaiting Results",
    results_review: "Results to Review",
    pending_review: "Pending Review",
    observation: "Observation",
    admitted: "Admitted",
    referred: "Referred",
    discharged: "Discharged",
    deceased: "Deceased",
  };

  const statusVariant: Record<string, "success" | "warning" | "error" | "info" | "neutral" | "purple"> = {
    in_consultation: "purple",
    orders_pending: "warning",
    awaiting_results: "warning",
    results_review: "info",
    pending_review: "warning",
    observation: "neutral",
    admitted: "info",
    referred: "info",
    discharged: "success",
    deceased: "error",
  };

  const transitionTargets: Record<string, { target: string; label: string }[]> = {
    in_consultation: [
      { target: "orders_pending", label: "Send to Lab" },
      { target: "awaiting_results", label: "Await Results" },
    ],
    orders_pending: [
      { target: "awaiting_results", label: "Await Results" },
    ],
    awaiting_results: [
      { target: "results_review", label: "Results Ready" },
    ],
    results_review: [
      { target: "in_consultation", label: "Continue Consultation" },
    ],
  };

  async function handleTransition(targetStatus: string) {
    if (!activeEncounterId) return;
    setSubmitLoading(true);
    setError(null);
    try {
      await api.post(`/encounters/${activeEncounterId}/transition`, { status: targetStatus }, token);
      setSuccessMsg(`Status changed to ${statusLabel[targetStatus] ?? targetStatus}`);
      fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleSignOff() {
    if (!activeEncounterId) return;
    setSubmitLoading(true);
    setError(null);
    try {
      await api.post(`/encounters/${activeEncounterId}/sign-off`, {}, token);
      setSuccessMsg("Clinical notes signed off successfully.");
      fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign off.");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleSubmitReview() {
    if (!activeEncounterId) return;
    setSubmitLoading(true);
    setError(null);
    try {
      await api.post(`/encounters/${activeEncounterId}/submit-review`, {}, token);
      setSuccessMsg("Consultation submitted for supervisor review.");
      void fetchConsultationData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit for review.");
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleAcknowledgeAlert(alertId: number) {
    try {
      await api.post(`/alerts/${alertId}/acknowledge`, {}, token);
      setCriticalAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch {}
  }

  const pendingLabCount = orders.filter(
    (o) =>
      o.order_type?.toLowerCase() === "lab" &&
      !["completed", "cancelled"].includes(o.status?.toLowerCase() ?? "")
  ).length;

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
            {activeEncounterId && (!isStudent || verification?.status === "approved") ? (
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
            <StatusBadge label={statusLabel[encounterStatus] ?? encounterStatus} variant={statusVariant[encounterStatus] ?? "neutral"} pulse={encounterStatus === "in_consultation"} />
            {patient.patient_category && <Badge variant="outline">{patient.patient_category}</Badge>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isStudent && encounterStatus === "in_consultation" && verification?.status !== "approved" && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleSubmitReview}
                disabled={submitLoading}
                className="border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                {submitLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Submit for Review
              </Button>
            )}
            {(transitionTargets[encounterStatus] ?? []).map((t) => (
              <Button
                key={t.target}
                size="sm"
                variant="outline"
                onClick={() => handleTransition(t.target)}
                disabled={submitLoading}
              >
                {submitLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                {t.label}
              </Button>
            ))}
            {can("consultation.sign_off") && (
              <Button
                size="sm"
                variant="default"
                onClick={handleSignOff}
                disabled={submitLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitLoading && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                Sign Off
              </Button>
            )}
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

      {verification?.status === "pending" && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" /> Pending supervisor review. Disposal is locked until approved.
        </div>
      )}
      {verification?.status === "approved" && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 font-semibold flex items-center gap-2">
          <Check className="h-4 w-4" /> Verified by supervisor. You may now dispose the patient.
        </div>
      )}
      {verification?.status === "rejected" && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 font-semibold flex items-center gap-2">
          <TriangleAlert className="h-4 w-4" /> Sent back: {verification.comments ?? "No comment provided."}
        </div>
      )}

      {criticalAlerts.length > 0 && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-red-800">
            <TriangleAlert className="h-4 w-4" />
            Critical Alerts ({criticalAlerts.length})
          </div>
          {criticalAlerts.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between gap-3 text-xs text-red-700 bg-white/60 rounded-md p-2.5 border border-red-200">
              <div className="min-w-0">
                <span className="font-semibold">{alert.message}</span>
                <span className="ml-2 text-red-500">{new Date(alert.created_at).toLocaleString()}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-red-700 border-red-300 hover:bg-red-100"
                onClick={() => handleAcknowledgeAlert(alert.id)}
              >
                Acknowledge
              </Button>
            </div>
          ))}
        </div>
      )}

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

                    {Object.keys(vitalTrends).length > 0 && (
                      <div className="bg-muted/30 rounded-lg p-4">
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">7-Day Trends</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[
                            { key: "temperature", label: "Temp (°C)", color: "bg-red-400" },
                            { key: "pulse_rate", label: "Pulse (bpm)", color: "bg-blue-400" },
                            { key: "oxygen_saturation", label: "SpO₂ (%)", color: "bg-cyan-400" },
                            { key: "ews_score", label: "EWS Score", color: "bg-amber-400" },
                          ].map(({ key, label, color }) =>
                            vitalTrends[key] ? (
                              <div key={key} className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
                                <Sparkline data={vitalTrends[key]} color={color} />
                                <div className="flex justify-between text-[9px] text-muted-foreground font-mono">
                                  <span>{vitalTrends[key][0]?.value}</span>
                                  <span>{vitalTrends[key][vitalTrends[key].length - 1]?.value}</span>
                                </div>
                              </div>
                            ) : null
                          )}
                        </div>
                      </div>
                    )}

                    <Separator />

                    <form onSubmit={handleSavePhysicalExam} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide">Physical Exam Findings</label>
                        <select
                          className="text-xs border border-input rounded-md px-2 py-1 bg-background text-muted-foreground"
                          onChange={(e) => {
                            const tpl = getTemplatesByCategory("objective").find((t) => t.id === e.target.value);
                            if (tpl) setPhysicalExam(tpl.content);
                            e.target.value = "";
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Load template...</option>
                          {getTemplatesByCategory("objective").map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
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
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold text-foreground uppercase tracking-wide">Clinician&apos;s Plan</label>
                        <select
                          className="text-xs border border-input rounded-md px-2 py-1 bg-background text-muted-foreground"
                          onChange={(e) => {
                            const tpl = getTemplatesByCategory("plan").find((t) => t.id === e.target.value);
                            if (tpl) setPlanInstructions(tpl.content);
                            e.target.value = "";
                          }}
                          defaultValue=""
                        >
                          <option value="" disabled>Load template...</option>
                          {getTemplatesByCategory("plan").map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                          ))}
                        </select>
                      </div>
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
                          {orders.map((order) => {
                            const labReqs = order.lab_requests ?? [];
                            const hasResults = labReqs.some((lr) => (lr.results?.length ?? 0) > 0);
                            return (
                              <div key={order.id} className="px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                    <span className="font-medium text-sm capitalize">{order.order_type}</span>
                                    {order.ordered_at && (
                                      <span className="ml-2 text-xs text-muted-foreground">
                                        {new Date(order.ordered_at).toLocaleString(undefined, {
                                          dateStyle: "medium",
                                          timeStyle: "short",
                                        })}
                                      </span>
                                    )}
                                    {order.priority && order.priority.toLowerCase() !== "routine" && (
                                      <Badge variant={order.priority.toLowerCase() === "stat" ? "destructive" : "secondary"} className="ml-2 text-[10px]">{order.priority}</Badge>
                                    )}
                                    {order.clinical_indication && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{order.clinical_indication}</p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <StatusBadge
                                      label={order.status}
                                      variant={order.status?.toLowerCase() === "completed" ? "success" : "warning"}
                                      size="sm"
                                    />
                                    {hasResults && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          const result = labReqs.flatMap((lr) => lr.results ?? [])[0];
                                          if (result) openResult(result.id);
                                        }}
                                      >
                                        View Result
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {labReqs.length > 0 && (
                                  <div className="mt-2 space-y-1">
                                    {labReqs.map((lr) => (
                                      <div key={lr.id}>
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="font-medium text-sm text-foreground/90">
                                            {lr.test_name || "Untitled test"}
                                          </span>
                                          <span className="text-muted-foreground capitalize">{lr.status}</span>
                                        </div>
                                        {lr.results && lr.results.length > 0 && (
                                          <div className="ml-4 mt-0.5 space-y-1">
                                            {lr.results.map((result) => (
                                              <div key={result.id} className="flex items-center gap-2 text-xs flex-wrap">
                                                <span className="font-medium text-foreground">{lr.test_name}:</span>
                                                <span className={`font-mono ${result.is_abnormal ? "text-amber-600 font-bold" : "text-muted-foreground"}`}>
                                                  {result.result_value_numeric ?? result.result_value_text}
                                                  {result.unit ? ` ${result.unit}` : ""}
                                                </span>
                                                {result.reference_range && (
                                                  <span className="text-muted-foreground">(ref: {result.reference_range})</span>
                                                )}
                                                {result.is_critical && <Badge variant="destructive" className="text-[9px] px-1 py-0">CRITICAL</Badge>}
                                                {result.is_abnormal && !result.is_critical && <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-amber-100 text-amber-800">Abnormal</Badge>}
                                                <Badge variant="outline" className="text-[9px] px-1 py-0">{result.status}</Badge>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
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

                {activeSubTab === "results" && (
                  <LabResultsPanel
                    encounterId={activeEncounterId ?? null}
                    token={token}
                    pendingCount={pendingLabCount}
                    refreshSignal={resultsRefreshKey}
                  />
                )}

                {activeSubTab === "prescriptions" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Prescriptions</h3>
                      <p className="text-sm text-muted-foreground">Medication orders for this patient.</p>
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Patient Allergies</h4>
                      {summary?.allergies && summary.allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {summary.allergies.map((a) => (
                            <span
                              key={a.id}
                              title={a.reaction ? `Reaction: ${a.reaction}` : "No reaction recorded"}
                              className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800"
                            >
                              <TriangleAlert className="h-3 w-3" />
                              {a.allergen} ({a.severity})
                            </span>
                          ))}
                        </div>
                      ) : summary?.allergies_confirmed ? (
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                          <Check className="h-3.5 w-3.5" /> No Known Allergies (NKA)
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-600">
                          <TriangleAlert className="h-3.5 w-3.5" /> Allergies Unconfirmed
                        </div>
                      )}
                    </div>

                    <div className="bg-muted/30 rounded-lg p-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Active Prescriptions</h4>
                      {prescriptions.length > 0 ? (
                        <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
                          {prescriptions.map((rx) => (
                            <div key={rx.id} className="px-4 py-3 flex items-center justify-between">
                              <div className="min-w-0">
                                <span className="font-medium text-sm">{rx.drug?.name ?? `Drug #${rx.drug_id}`}</span>
                                <span className="ml-2 font-mono text-xs text-muted-foreground">{rx.dosage} {rx.route} — {rx.frequency}</span>
                                {rx.drug?.current_stock != null && rx.drug.current_stock <= 0 && (
                                  <Badge variant="destructive" className="ml-2 text-[10px]">Out of Stock</Badge>
                                )}
                                {rx.is_controlled && (
                                  <Badge variant="destructive" className="ml-2 text-[10px]">Controlled</Badge>
                                )}
                                {rx.allergy_check && (
                                  <Badge variant="destructive" className="ml-2 text-[10px]">Allergy Alert</Badge>
                                )}
                                {rx.allergy_override_reason && (
                                  <span
                                    title={`Override reason: ${rx.allergy_override_reason}`}
                                    className="ml-2 text-[10px] font-semibold text-amber-600"
                                  >
                                    Overridden
                                  </span>
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
                          onChange={(e) => { setDrugQuery(e.target.value); setSelectedDrug(null); setAllergyWarnings([]); setOverrideReason(""); }}
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
                                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                                    {drug.current_stock != null && (
                                      <span className={drug.current_stock <= 0 ? "text-destructive font-bold" : drug.current_stock <= (drug.reorder_level ?? 0) ? "text-amber-600" : ""}>
                                        Stock: {drug.current_stock}
                                      </span>
                                    )}
                                    <span>{drug.formulation} {drug.strength}</span>
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {selectedDrug && (
                        <div className={`rounded-lg border p-3 flex items-center justify-between ${selectedDrug.current_stock != null && selectedDrug.current_stock <= 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                          <div>
                            <span className={`text-xs font-bold uppercase tracking-wider ${selectedDrug.current_stock != null && selectedDrug.current_stock <= 0 ? "text-red-800" : "text-emerald-800"}`}>Selected: </span>
                            <span className={`text-sm font-semibold ${selectedDrug.current_stock != null && selectedDrug.current_stock <= 0 ? "text-red-950" : "text-emerald-950"}`}>{selectedDrug.name}</span>
                            {selectedDrug.formulation && <span className={`ml-2 text-xs ${selectedDrug.current_stock != null && selectedDrug.current_stock <= 0 ? "text-red-700" : "text-emerald-700"}`}>{selectedDrug.formulation} {selectedDrug.strength}</span>}
                            {selectedDrug.current_stock != null && (
                              <span className={`ml-3 text-xs font-bold ${selectedDrug.current_stock <= 0 ? "text-red-700" : selectedDrug.current_stock <= (selectedDrug.reorder_level ?? 0) ? "text-amber-700" : "text-emerald-700"}`}>
                                {selectedDrug.current_stock <= 0 ? "OUT OF STOCK" : `Stock: ${selectedDrug.current_stock}`}
                              </span>
                            )}
                          </div>
                          <button type="button" onClick={() => { setSelectedDrug(null); setDrugQuery(""); setAllergyWarnings([]); setOverrideReason(""); }} className="text-xs text-muted-foreground hover:text-foreground font-bold uppercase">Clear</button>
                        </div>
                      )}

                      {allergyWarnings.length > 0 && (
                        <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-800 uppercase tracking-wider">
                            <TriangleAlert className="h-3.5 w-3.5" />
                            Allergy Warning — Prescription Blocked
                          </div>
                          {allergyWarnings.map((w, i) => (
                            <div key={i} className="text-xs text-red-700">
                              Patient has recorded allergy to <span className="font-bold">{w.allergen}</span>
                              {w.severity && <span className="ml-1">— Severity: {w.severity}</span>}
                              {w.reaction && <span className="ml-1">— Reaction: {w.reaction}</span>}
                            </div>
                          ))}
                          <label className="block text-xs font-semibold text-red-800 uppercase tracking-wide">
                            Override Reason <span className="text-destructive">*</span>
                          </label>
                          <textarea
                            rows={2}
                            className="block w-full rounded-lg border border-red-200 bg-background px-3 py-2 text-sm"
                            placeholder="Type the clinical reason to prescribe this medication despite the allergy — it will be recorded for audit."
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                          />
                          <div className="text-[10px] text-red-600 italic">Prescription stays blocked until a reason is provided.</div>
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
                        <Button
                          type="submit"
                          disabled={submitLoading || !selectedDrug || (allergyWarnings.length > 0 && !overrideReason.trim())}
                        >
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

                {activeSubTab === "billing" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-bold">Billing</h3>
                      <p className="text-sm text-muted-foreground">Charges attached to this encounter.</p>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Running bill</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {billLoading ? (
                          <Skeleton className="h-24 w-full" />
                        ) : !bill ? (
                          <p className="text-sm text-muted-foreground">No bill for this encounter yet.</p>
                        ) : bill.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No charges yet. Add services below.</p>
                        ) : (
                          <ul className="divide-y divide-border text-sm">
                            {bill.items.map((item) => (
                              <li key={item.id} className="flex justify-between py-2">
                                <span>{item.item_name} × {item.quantity}</span>
                                <span className="font-mono">MK {Number(item.total).toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <div className="flex justify-between border-t border-border pt-3 font-semibold">
                          <span>Total</span>
                          <span className="font-mono">MK {Number(bill?.total_amount ?? 0).toLocaleString()}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {can("billing.manual") && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Add billable service</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              className="pl-9"
                              placeholder="Search services..."
                              value={serviceQuery}
                              onChange={(e) => void searchServices(e.target.value)}
                            />
                          </div>

                          <section
                            role="tablist"
                            aria-label="Service category filter"
                            className="flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-muted p-1"
                          >
                            {SERVICE_CATEGORIES.map(([key, label]) => (
                              <button
                                key={key}
                                role="tab"
                                aria-selected={serviceCategory === key}
                                onClick={() => {
                                  setServiceCategory(key);
                                  setServiceQuery("");
                                  setServiceResults([]);
                                }}
                                className={cn(
                                  "flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all",
                                  serviceCategory === key
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </section>

                          {serviceResults.length > 0 ? (
                            <ul className="max-h-56 divide-y divide-border overflow-y-auto rounded-md border border-border">
                              {serviceResults.map((s) => (
                                <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                  <div>
                                    <p className="font-medium">{s.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {s.category || "—"} · MK {Number(s.unit_price).toLocaleString()}
                                    </p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={addingBillItem}
                                    onClick={() => void addServiceToBill(s)}
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add
                                  </Button>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="max-h-64 overflow-y-auto space-y-1">
                              {getFilteredServices().map((s) => (
                                <div
                                  key={s.id}
                                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer"
                                  onClick={() => void addServiceToBill(s)}
                                >
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{s.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {s.category || "—"} · MK {Number(s.unit_price).toLocaleString()}
                                    </p>
                                  </div>
                                  {addingBillItem ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Plus className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              ))}
                              {getFilteredServices().length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                  No services found.
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
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
        onBilling={(billing) => {
          setBillingSummary(billing);
          setPendingNav(`/patients/${patientId}`);
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {billingSummary && (
        <BillingConfirmation
          billing={billingSummary}
          onDone={() => {
            const to = pendingNav;
            setBillingSummary(null);
            setPendingNav(null);
            if (to) router.push(to);
          }}
        />
      )}
    </div>
  );
}
