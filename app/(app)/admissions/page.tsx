"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";
import Modal from "../../../components/ui/Modal";
import { BedDouble, Search, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

interface Admission {
  id: number;
  patient_id: number;
  encounter_id: number | null;
  ward_id: number | null;
  bed_id: number | null;
  admission_diagnosis: string | null;
  acuity_level: string | null;
  isolation_required: boolean;
  admission_date: string;
  discharge_date: string | null;
  discharge_diagnosis: string | null;
  discharge_summary: string | null;
  status: string;
  patient?: { first_name: string; last_name: string; hospital_number: string };
  ward?: { name: string; code: string };
  bed?: { bed_number: string };
}

interface Ward {
  id: number;
  name: string;
  code: string;
  ward_type: string;
  total_beds: number;
  occupied_beds?: number;
}

export default function AdmissionsPage() {
  usePageTitle("Admissions");
  const { token } = useAuth();
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<"active" | "discharged" | "wards">("active");
  const [admitModalOpen, setAdmitModalOpen] = useState(false);
  const [form, setForm] = useState({ patient_id: "", encounter_id: "", ward_id: "", bed_id: "", admission_diagnosis: "", acuity_level: "Medium", isolation_required: false });
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [admRes, wardsRes] = await Promise.all([
        api.get("/admissions", token),
        api.get("/wards", token),
      ]);
      if (admRes && admRes.data) {
        const items = admRes.data.data || admRes.data;
        setAdmissions(Array.isArray(items) ? items : []);
      }
      if (wardsRes && wardsRes.data) {
        const items = wardsRes.data.data || wardsRes.data;
        setWards(Array.isArray(items) ? items : []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load admissions data");
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (token) fetchData(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = admissions.filter((a) => {
    const matchSearch = !searchQuery || a.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.patient?.hospital_number?.includes(searchQuery);
    return matchSearch;
  });

  const activeAdmissions = filtered.filter((a) => !a.discharge_date);
  const dischargedAdmissions = filtered.filter((a) => a.discharge_date);

  const handleAdmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/admissions", {
        patient_id: parseInt(form.patient_id),
        encounter_id: parseInt(form.encounter_id),
        ward_id: parseInt(form.ward_id),
        bed_id: parseInt(form.bed_id),
        admission_diagnosis: form.admission_diagnosis || null,
        acuity_level: form.acuity_level,
        isolation_required: form.isolation_required,
      }, token);
      setAdmitModalOpen(false);
      setForm({ patient_id: "", encounter_id: "", ward_id: "", bed_id: "", admission_diagnosis: "", acuity_level: "Medium", isolation_required: false });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to admit patient");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischarge = async (admissionId: number, diagnosis: string, summary: string) => {
    try {
      await api.put(`/admissions/${admissionId}`, {
        discharge_date: new Date().toISOString(),
        discharge_diagnosis: diagnosis || null,
        discharge_summary: summary || null,
      }, token);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to discharge patient");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Inpatient</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Admissions & Wards</h1>
          <p className="text-sm text-[#5f5e5e] mt-1">Manage patient admissions, bed assignments, and discharges</p>
        </div>
        <button onClick={() => setAdmitModalOpen(true)} className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all">
          <Plus className="h-4 w-4 mr-2" /> Admit Patient
        </button>
      </section>

      {/* Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-sky-100 flex items-center justify-center"><BedDouble className="h-5 w-5 text-sky-600" /></div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Active Admissions</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : activeAdmissions.length}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-amber-100 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Isolation Required</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : activeAdmissions.filter((a) => a.isolation_required).length}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-emerald-100 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Wards</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : wards.length}</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="flex gap-1 bg-white rounded border border-[#becab7]/50 p-1" role="tablist" aria-label="Admissions views">
        {[
          { key: "active" as const, label: "Active Admissions" },
          { key: "discharged" as const, label: "Discharged" },
          { key: "wards" as const, label: "Ward Overview" },
        ].map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`flex-1 px-4 py-2.5 text-sm font-bold rounded transition-all ${tab === t.key ? "bg-clinical-primary text-white" : "text-gray-600 hover:bg-gray-50"}`}>
            {t.label}
          </button>
        ))}
      </section>

      {/* Search */}
      {tab !== "wards" && (
        <section className="bg-white rounded border border-[#becab7]/50 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input type="text" placeholder="Search by patient name or hospital #..." aria-label="Search admissions" className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
        </section>
      )}

      {/* Content */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">{tab === "active" ? "Active Admissions" : tab === "discharged" ? "Discharged Patients" : "Ward Bed Occupancy"}</h2>
        </div>

        {loading ? <LoadingState message="Loading admissions..." /> : error ? <div className="p-8 text-center text-sm text-red-600">{error}</div> : (
          <>
            {tab === "wards" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {wards.length === 0 ? (
                  <EmptyState title="No wards configured" description="Ward and bed data needs to be set up" />
                ) : wards.map((ward) => (
                  <div key={ward.id} className="bg-[#fcf9f8] rounded border border-gray-200/50 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">{ward.name}</h3>
                      <StatusBadge label={ward.ward_type} variant="info" />
                    </div>
                    <div className="text-xs text-gray-500 font-mono mb-2">Code: {ward.code}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div className="bg-brand-green h-2 rounded-full transition-all" style={{ width: `${ward.total_beds ? ((ward.occupied_beds || 0) / ward.total_beds) * 100 : 0}%` }} />
                      </div>
                      <span className="text-xs font-bold font-mono text-gray-600">{ward.occupied_beds || 0}/{ward.total_beds}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                    <tr className="divide-x divide-gray-200/50">
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Ward / Bed</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Diagnosis</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Acuity</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Isolation</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Admitted</th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(tab === "active" ? activeAdmissions : dischargedAdmissions).length === 0 ? (
                      <tr><td colSpan={7}><EmptyState title={`No ${tab} admissions`} description="Admissions will appear here" /></td></tr>
                    ) : (tab === "active" ? activeAdmissions : dischargedAdmissions).map((adm) => (
                      <tr key={adm.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{adm.patient ? `${adm.patient.first_name} ${adm.patient.last_name}` : `#${adm.patient_id}`}</div>
                          <div className="text-xs text-gray-500 font-mono">{adm.patient?.hospital_number}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{adm.ward?.name || "—"} {adm.bed?.bed_number ? `/ Bed ${adm.bed.bed_number}` : ""}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{adm.admission_diagnosis || "—"}</td>
                        <td className="px-6 py-4"><StatusBadge label={adm.acuity_level || "standard"} variant={adm.acuity_level === "critical" ? "error" : adm.acuity_level === "high" ? "warning" : "info"} /></td>
                        <td className="px-6 py-4">{adm.isolation_required ? <StatusBadge label="Isolation" variant="error" /> : <span className="text-gray-300">—</span>}</td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-mono">{new Date(adm.admission_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Link href={`/patients/${adm.patient_id}`} className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider">Profile</Link>
                            {!adm.discharge_date && (
                              <button onClick={() => handleDischarge(adm.id, "", "")} className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider cursor-pointer">Discharge</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      {/* Admit Modal */}
      <Modal open={admitModalOpen} onClose={() => setAdmitModalOpen(false)} title="Admit Patient" subtitle="Register a new inpatient admission" footer={
        <>
          <button onClick={() => setAdmitModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={handleAdmit} disabled={submitting || !form.patient_id} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">{submitting ? "Admitting..." : "Admit Patient"}</button>
        </>
      }>
        <form onSubmit={handleAdmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Patient ID *</label>
              <input type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Encounter ID *</label>
              <input type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.encounter_id} onChange={(e) => setForm({ ...form, encounter_id: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Ward *</label>
              <select required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary" value={form.ward_id} onChange={(e) => setForm({ ...form, ward_id: e.target.value })}>
                <option value="">Select ward</option>
                {wards.map((w) => <option key={w.id} value={w.id}>{w.name} ({w.code})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Bed ID *</label>
              <input type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.bed_id} onChange={(e) => setForm({ ...form, bed_id: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Admission Diagnosis</label>
            <textarea rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.admission_diagnosis} onChange={(e) => setForm({ ...form, admission_diagnosis: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Acuity Level</label>
              <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary" value={form.acuity_level} onChange={(e) => setForm({ ...form, acuity_level: e.target.value })}>
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
