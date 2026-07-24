"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import { ReferralStatusBadge } from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";
import Modal from "../../../components/ui/Modal";
import { Stethoscope, Search, Plus, ArrowRight } from "lucide-react";

interface Referral {
  id: number;
  patient_id: number;
  encounter_id: number | null;
  referral_type: string;
  urgency: string;
  clinical_summary: string | null;
  reason: string | null;
  destination_facility: string | null;
  destination_department: string | null;
  status: string;
  accepted_by: number | null;
  accepted_at: string | null;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  referring_clinician?: { name: string };
}

interface Department {
  id: number;
  name: string;
  code: string;
}

export default function ReferralsPage() {
  const { token } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    patient_id: "",
    referral_type: "internal",
    urgency: "routine",
    clinical_summary: "",
    reason: "",
    destination_department: "",
    destination_facility: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [referralsRes, deptsRes] = await Promise.allSettled([
        api.get("/referrals", token),
        api.get("/departments", token),
      ]);
      if (referralsRes.status === "fulfilled" && referralsRes.value?.data) {
        setReferrals(Array.isArray(referralsRes.value.data) ? referralsRes.value.data : referralsRes.value.data.data || []);
      }
      if (deptsRes.status === "fulfilled" && deptsRes.value?.data) {
        setDepartments(Array.isArray(deptsRes.value.data) ? deptsRes.value.data : deptsRes.value.data.data || []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (token) fetchData();
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const filtered = referrals.filter((r) => {
    const matchesSearch = !searchQuery ||
      r.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.patient?.hospital_number?.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || r.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/referrals", {
        patient_id: parseInt(form.patient_id),
        referral_type: form.referral_type,
        urgency: form.urgency,
        clinical_summary: form.clinical_summary || null,
        reason: form.reason || null,
        destination_department: form.destination_department || null,
        destination_facility: form.destination_facility || null,
      }, token);
      setCreateModalOpen(false);
      setForm({ patient_id: "", referral_type: "internal", urgency: "routine", clinical_summary: "", reason: "", destination_department: "", destination_facility: "" });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create referral");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Referrals</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Referral Management</h1>
          <p className="text-sm text-[#5f5e5e] mt-1">Create and track inter-department and inter-facility referrals</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-bold rounded bg-clinical-primary text-white hover:bg-clinical-primary-hover shadow-sm transition-all"
        >
          <Plus className="h-4 w-4 mr-2" /> New Referral
        </button>
      </section>

      {/* Filters */}
      <section className="bg-white rounded border border-[#becab7]/50 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by patient name or hospital #..."
              aria-label="Search referrals"
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-clinical-primary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </section>

      {/* Referrals Table */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">Referrals</h2>
        </div>

        {loading ? (
          <LoadingState message="Loading referrals..." />
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Stethoscope className="h-6 w-6 text-gray-400" />}
            title="No referrals found"
            description={searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "No referrals have been created yet"}
            action={
              <button onClick={() => setCreateModalOpen(true)} className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider">
                Create First Referral
              </button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8]">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Urgency</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filtered.map((ref) => (
                  <tr key={ref.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {ref.patient ? `${ref.patient.first_name} ${ref.patient.last_name}` : `Patient #${ref.patient_id}`}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{ref.patient?.hospital_number}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{ref.referral_type}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        {ref.destination_department && <span>{ref.destination_department}</span>}
                        {ref.destination_facility && (
                          <>
                            <ArrowRight className="h-3 w-3 text-gray-400" />
                            <span>{ref.destination_facility}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold uppercase ${
                        ref.urgency === "emergency" ? "text-red-600" :
                        ref.urgency === "urgent" ? "text-amber-600" : "text-gray-500"
                      }`}>{ref.urgency}</span>
                    </td>
                    <td className="px-6 py-4"><ReferralStatusBadge status={ref.status} /></td>
                    <td className="px-6 py-4 text-xs text-gray-500 font-mono">{new Date(ref.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <Link href={`/patients/${ref.patient_id}`} className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider">
                        Profile
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create Referral Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Referral"
        subtitle="Refer patient to another department or facility"
        size="lg"
        footer={
          <>
            <button onClick={() => setCreateModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreate} disabled={submitting || !form.patient_id} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">
              {submitting ? "Creating..." : "Create Referral"}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Patient ID *</label>
            <input type="number" required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.patient_id} onChange={(e) => setForm({ ...form, patient_id: e.target.value })} placeholder="Enter patient ID" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Referral Type</label>
              <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary" value={form.referral_type} onChange={(e) => setForm({ ...form, referral_type: e.target.value })}>
                <option value="internal">Internal (Same Facility)</option>
                <option value="external">External (Different Facility)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Urgency</label>
              <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary" value={form.urgency} onChange={(e) => setForm({ ...form, urgency: e.target.value })}>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
          {form.referral_type === "internal" ? (
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Destination Department</label>
              <select className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary" value={form.destination_department} onChange={(e) => setForm({ ...form, destination_department: e.target.value })}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Destination Facility</label>
              <input type="text" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.destination_facility} onChange={(e) => setForm({ ...form, destination_facility: e.target.value })} placeholder="Facility name" />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Clinical Summary</label>
            <textarea rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.clinical_summary} onChange={(e) => setForm({ ...form, clinical_summary: e.target.value })} placeholder="Key clinical findings, diagnoses, and treatment to date" />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Reason for Referral</label>
            <textarea rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Specific question or reason for referral" />
          </div>
        </form>
      </Modal>
    </div>
  );
}
