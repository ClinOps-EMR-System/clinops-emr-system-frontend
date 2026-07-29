"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/store/RoleContext";
import { api } from "@/lib/api";

interface NewAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  hospital_number: string;
}

interface Provider {
  id: number;
  name: string;
  email: string;
  department?: { id: number; name: string };
}

interface Department {
  id: number;
  name: string;
  code: string | null;
}

export function NewAppointmentModal({ open, onClose, onCreated }: NewAppointmentModalProps) {
  const { token } = useAuth();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [providerQuery, setProviderQuery] = useState("");
  const [providerResults, setProviderResults] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState(() => {
    const now = new Date();
    const defaultTime = new Date(now.getTime() + 60 * 60 * 1000);
    return {
      appointment_type: "Consultation",
      scheduled_date: now.toISOString().split("T")[0],
      scheduled_time: `${String(defaultTime.getHours()).padStart(2, "0")}:${String(defaultTime.getMinutes()).padStart(2, "0")}`,
      reason: "",
      notes: "",
      department_id: "",
    };
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function searchPatients(query: string) {
    setPatientQuery(query);
    if (query.length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const res = await api.get(`/patients?search=${encodeURIComponent(query)}`, token);
      setPatientResults(res?.data ?? []);
    } catch {
      setPatientResults([]);
    }
  }

  async function searchProviders(query: string) {
    setProviderQuery(query);
    if (query.length < 2) {
      setProviderResults([]);
      return;
    }
    try {
      const res = await api.get(`/users?search=${encodeURIComponent(query)}&is_active=true`, token);
      const data = res?.data ?? [];
      setProviderResults(Array.isArray(data) ? data : data.data || []);
    } catch {
      setProviderResults([]);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await api.get("/departments", token);
      const data = res?.data ?? [];
      setDepartments(Array.isArray(data) ? data : data.data || []);
    } catch {
      setDepartments([]);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { if (open) fetchDepartments(); }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Please select a patient");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/appointments", {
        patient_id: selectedPatient.id,
        provider_id: selectedProvider?.id ?? undefined,
        department_id: formData.department_id || undefined,
        appointment_type: formData.appointment_type,
        scheduled_for: `${formData.scheduled_date}T${formData.scheduled_time}:00`,
        reason: formData.reason,
        notes: formData.notes || undefined,
      }, token);
      onCreated();
      onClose();
      setPatientQuery("");
      setSelectedPatient(null);
      setProviderQuery("");
      setSelectedProvider(null);
      const now = new Date();
      const defaultTime = new Date(now.getTime() + 60 * 60 * 1000);
      setFormData({ appointment_type: "Consultation", scheduled_date: now.toISOString().split("T")[0], scheduled_time: `${String(defaultTime.getHours()).padStart(2, "0")}:${String(defaultTime.getMinutes()).padStart(2, "0")}`, reason: "", notes: "", department_id: "" });
    } catch (err: unknown) {
      const apiErr = err as { message?: string; errors?: Record<string, string[]> };
      if (apiErr.errors && Object.keys(apiErr.errors).length > 0) {
        const messages = Object.values(apiErr.errors).flat().join(". ");
        setError(messages);
      } else {
        setError(apiErr.message || "Failed to create appointment");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Appointment"
      subtitle="Schedule a patient appointment"
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting || !selectedPatient} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">
            {submitting ? "Creating..." : "Create Appointment"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">{error}</div>
        )}

        {/* Patient Search */}
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Patient *</label>
          {selectedPatient ? (
            <div className="mt-1 flex items-center gap-2 p-2 bg-[#fcf9f8] border border-brand-green/30 rounded">
              <span className="text-sm font-semibold text-gray-900">
                {selectedPatient.first_name} {selectedPatient.last_name}
              </span>
              <span className="text-xs text-gray-400 font-mono">{selectedPatient.hospital_number}</span>
              <button type="button" onClick={() => { setSelectedPatient(null); setPatientQuery(""); }} className="ml-auto text-xs text-red-600 hover:text-red-800">
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={patientQuery}
                onChange={(e) => searchPatients(e.target.value)}
                placeholder="Search by name or hospital number..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              />
              {patientResults.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded bg-white max-h-40 overflow-y-auto">
                  {patientResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedPatient(p); setPatientResults([]); setPatientQuery(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#fcf9f8] flex items-center justify-between"
                    >
                      <span className="font-semibold">{p.first_name} {p.last_name}</span>
                      <span className="text-xs text-gray-400 font-mono">{p.hospital_number}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Appointment Type */}
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Type</label>
          <select
            value={formData.appointment_type}
            onChange={(e) => setFormData({ ...formData, appointment_type: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-clinical-primary"
          >
            <option value="Consultation">Consultation</option>
            <option value="Follow-up">Follow-up</option>
            <option value="Lab Review">Lab Review</option>
            <option value="Emergency">Emergency</option>
          </select>
        </div>

        {/* Provider */}
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Provider</label>
          {selectedProvider ? (
            <div className="mt-1 flex items-center gap-2 p-2 bg-[#fcf9f8] border border-brand-green/30 rounded">
              <span className="text-sm font-semibold text-gray-900">{selectedProvider.name}</span>
              {selectedProvider.department && (
                <span className="text-xs text-gray-400">{selectedProvider.department.name}</span>
              )}
              <button type="button" onClick={() => { setSelectedProvider(null); setProviderQuery(""); }} className="ml-auto text-xs text-red-600 hover:text-red-800">
                Clear
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={providerQuery}
                onChange={(e) => searchProviders(e.target.value)}
                placeholder="Search by provider name..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
              />
              {providerResults.length > 0 && (
                <div className="mt-1 border border-gray-200 rounded bg-white max-h-40 overflow-y-auto">
                  {providerResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setSelectedProvider(p); setProviderResults([]); setProviderQuery(""); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#fcf9f8] flex items-center justify-between"
                    >
                      <span className="font-semibold">{p.name}</span>
                      <span className="text-xs text-gray-400">{p.department?.name ?? ""}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Department */}
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Department</label>
          <select
            value={formData.department_id}
            onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-clinical-primary"
          >
            <option value="">Select department (optional)</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.code ? ` (${d.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Date *</label>
            <input
              type="date"
              required
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Time *</label>
            <input
              type="time"
              required
              value={formData.scheduled_time}
              onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
            />
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Reason *</label>
          <input
            type="text"
            required
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            placeholder="Reason for appointment"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Additional notes (optional)"
            rows={2}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
          />
        </div>
      </form>
    </Modal>
  );
}
