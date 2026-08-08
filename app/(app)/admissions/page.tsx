"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";
import { useFetch } from "@/lib/useFetch";
import { AdmissionDetail } from "@/components/admissions/AdmissionDetail";
import { TransferHistoryModal } from "@/components/admissions/TransferHistoryModal";
import { BedMap } from "@/components/admissions/BedMap";
import { AdmissionStats } from "@/components/admissions/AdmissionStats";
import AdmissionsToolbar from "@/components/admissions/AdmissionsToolbar";
import AdmissionsTable from "@/components/admissions/AdmissionsTable";
import { SectionHeader } from "@/components/ui/PageLayout";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/button";
import { BedDouble, Plus } from "lucide-react";
import type { Admission, AdmissionFormData, AdmissionStats as AdmissionStatsType, WardSummary as Ward } from "@/types/admission";

const TABS = [
  { key: "active" as const, label: "Active Admissions" },
  { key: "discharged" as const, label: "Discharged" },
  { key: "wards" as const, label: "Ward Overview" },
];

export default function AdmissionsPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [tab, setTab] = useState<"active" | "discharged" | "wards">("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [acuityFilter, setAcuityFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAdmission, setDetailAdmission] = useState<Admission | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAdmission, setTransferAdmission] = useState<Admission | null>(null);
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [form, setForm] = useState<AdmissionFormData>({
    patient_id: "",
    encounter_id: "",
    ward_id: "",
    bed_id: "",
    admission_type: "Emergency",
    admission_diagnosis: "",
    acuity_level: "Medium",
    isolation_required: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const { data: admissionsData, loading, error: fetchError, refetch } = useFetch<Admission[]>("/admissions", { interval: 30000 });
  const { data: stats } = useFetch<AdmissionStatsType>("/admissions/stats", { interval: 30000 });

  const admissions = useMemo(() => admissionsData ?? [], [admissionsData]);

  const filtered = useMemo(() => {
    let list = admissions;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) =>
        a.patient?.first_name?.toLowerCase().includes(q) ||
        a.patient?.last_name?.toLowerCase().includes(q) ||
        a.patient?.hospital_number?.includes(q)
      );
    }

    if (statusFilter) {
      list = list.filter((a) => a.status === statusFilter);
    }

    if (acuityFilter) {
      list = list.filter((a) => a.acuity_level === acuityFilter);
    }

    if (typeFilter) {
      list = list.filter((a) => a.admission_type === typeFilter);
    }

    return list;
  }, [admissions, searchQuery, statusFilter, acuityFilter, typeFilter]);

  const activeAdmissions = useMemo(() => filtered.filter((a) => !a.discharge_date), [filtered]);
  const dischargedAdmissions = useMemo(() => filtered.filter((a) => a.discharge_date), [filtered]);

  const hasFilters = !!(searchQuery || statusFilter || acuityFilter || typeFilter);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("");
    setAcuityFilter("");
    setTypeFilter("");
  };

  function openDetail(admission: Admission) {
    setDetailAdmission(admission);
    setDetailOpen(true);
  }

  const fetchWards = useCallback(async () => {
    try {
      const res = await api.get("/wards", token);
      if (res?.data) {
        setWards(Array.isArray(res.data) ? res.data : Array.isArray(res.data.data) ? res.data.data : []);
      }
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    if (admitModalOpen || transferOpen) fetchWards(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [admitModalOpen, transferOpen, fetchWards]);

  async function handleAdmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      await api.post(
        "/admissions",
        {
          patient_id: parseInt(form.patient_id),
          encounter_id: parseInt(form.encounter_id),
          ward_id: parseInt(form.ward_id),
          bed_id: parseInt(form.bed_id),
          admission_type: form.admission_type,
          admission_diagnosis: form.admission_diagnosis || null,
          acuity_level: form.acuity_level,
          isolation_required: form.isolation_required,
        },
        token
      );
      setAdmitModalOpen(false);
      setForm({
        patient_id: "",
        encounter_id: "",
        ward_id: "",
        bed_id: "",
        admission_type: "Emergency",
        admission_diagnosis: "",
        acuity_level: "Medium",
        isolation_required: false,
      });
      refetch();
      fetchWards();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to admit patient");
    } finally {
      setSubmitting(false);
    }
  }

  function handleTransferred() {
    setTransferOpen(false);
    setTransferAdmission(null);
    refetch();
    fetchWards();
  }

  const displayedAdmissions = tab === "active" ? activeAdmissions : dischargedAdmissions;

  return (
    <div className="flex flex-col gap-6">
      <SectionHeader
        title="Admissions & Wards"
        description="Manage patient admissions, bed assignments, and discharges"
        action={
          <Button onClick={() => router.push("/admissions/new")}>
            <Plus data-icon="inline-start" />
            Admit Patient
          </Button>
        }
      />

      {stats && <AdmissionStats stats={stats} />}

      <div className="flex gap-1 bg-card rounded-xl ring-1 ring-foreground/10 p-1" role="tablist" aria-label="Admissions views">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => { setTab(t.key); setCurrentPage(1); }}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
              tab === t.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== "wards" ? (
        <>
          <AdmissionsToolbar
            search={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            acuityFilter={acuityFilter}
            onAcuityFilterChange={setAcuityFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            onClear={clearFilters}
            hasFilters={hasFilters}
          />

          <AdmissionsTable
            admissions={displayedAdmissions}
            loading={loading}
            error={fetchError}
            currentPage={currentPage}
            totalPages={1}
            onPageChange={setCurrentPage}
            onView={openDetail}
            onTransfer={(adm) => { setTransferAdmission(adm); setTransferOpen(true); }}
            onDischarge={(adm) => router.push(`/admissions/${adm.id}/discharge`)}
          />
        </>
      ) : (
        <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
          <div className="flex items-center gap-2 mb-5">
            <BedDouble className="h-4 w-4 text-muted-foreground/60" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ward Bed Occupancy
            </h2>
          </div>
          {loading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading wards...</div>
          ) : wards.length === 0 ? (
            <EmptyState title="No wards configured" description="Ward and bed data needs to be set up" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wards.map((ward) => {
                const wardAdmissions = admissions.filter((a) => a.ward_id === ward.id);
                return (
                  <BedMap
                    key={ward.id}
                    ward={ward}
                    admissions={wardAdmissions}
                    onBedClick={(bedId) => {
                      const admission = admissions.find((a) => a.bed_id === bedId && !a.discharge_date);
                      if (admission) openDetail(admission);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {detailOpen && detailAdmission && (
        <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Admission Details" subtitle={`Admission #${detailAdmission.id}`}>
          <AdmissionDetail admission={detailAdmission} onClose={() => setDetailOpen(false)} />
        </Modal>
      )}

      {transferOpen && transferAdmission && (
        <TransferHistoryModal
          open
          admission={transferAdmission}
          wards={wards}
          onTransferred={handleTransferred}
          onClose={() => setTransferOpen(false)}
        />
      )}

      <Modal open={admitModalOpen} onClose={() => setAdmitModalOpen(false)} title="Admit Patient" subtitle="Register a new inpatient admission" footer={
        <>
          <button onClick={() => setAdmitModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={handleAdmit} disabled={submitting || !form.patient_id} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">{submitting ? "Admitting..." : "Admit Patient"}</button>
        </>
      }>
        <form onSubmit={handleAdmit} className="space-y-4">
          {formError && <div className="p-3 rounded bg-red-50 text-red-700 text-sm">{formError}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-admit-patient-id" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Patient ID *</label>
              <input id="field-admit-patient-id" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} />
            </div>
            <div>
              <label htmlFor="field-admit-encounter-id" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Encounter ID *</label>
              <input id="field-admit-encounter-id" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.encounter_id} onChange={(e) => setForm({ ...form, encounter_id: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-admit-ward" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Ward *</label>
              <select id="field-admit-ward" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary" value={form.ward_id} onChange={(e) => setForm({ ...form, ward_id: e.target.value })}>
                <option value="">Select ward</option>
                {wards.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="field-admit-bed-id" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Bed ID *</label>
              <input id="field-admit-bed-id" type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.bed_id} onChange={(e) => setForm({ ...form, bed_id: e.target.value })} />
            </div>
          </div>
          <div>
            <label htmlFor="field-admit-type" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Admission Type</label>
            <select id="field-admit-type" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary" value={form.admission_type} onChange={(e) => setForm({ ...form, admission_type: e.target.value as "Emergency" | "Elective" })}>
              <option value="Emergency">Emergency</option>
              <option value="Elective">Elective</option>
            </select>
          </div>
          <div>
            <label htmlFor="field-admit-diagnosis" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Admission Diagnosis</label>
            <textarea id="field-admit-diagnosis" rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.admission_diagnosis} onChange={(e) => setForm({ ...form, admission_diagnosis: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="field-admit-acuity" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Acuity Level</label>
              <select id="field-admit-acuity" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary" value={form.acuity_level} onChange={(e) => setForm({ ...form, acuity_level: e.target.value as "Critical" | "High" | "Medium" | "Low" })}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isolation_required} onChange={(e) => setForm({ ...form, isolation_required: e.target.checked })} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />
                <span className="font-semibold text-gray-700">Isolation Required</span>
              </label>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}