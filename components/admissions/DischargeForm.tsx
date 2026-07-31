"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import type { DischargeFormData } from "../../types/admission";

interface DischargeFormProps {
  admissionId: number;
  onSubmit: (data: DischargeFormData) => void;
  onClose: () => void;
  submitting: boolean;
}

export function DischargeForm({ admissionId, onSubmit, onClose, submitting }: DischargeFormProps) {
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split("T")[0]);
  const [dischargeDiagnosis, setDischargeDiagnosis] = useState("");
  const [dischargeSummary, setDischargeSummary] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      discharge_date: dischargeDate,
      discharge_diagnosis: dischargeDiagnosis || null,
      discharge_summary: dischargeSummary || null,
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Discharge Patient"
      subtitle={`Completing admission #${admissionId}`}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 rounded hover:bg-emerald-700 disabled:opacity-50">
            {submitting ? "Processing..." : "Confirm Discharge"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Discharge Date</label>
          <input
            type="date"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
            value={dischargeDate}
            onChange={(e) => setDischargeDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Discharge Diagnosis</label>
          <input
            type="text"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
            value={dischargeDiagnosis}
            onChange={(e) => setDischargeDiagnosis(e.target.value)}
            placeholder="Primary diagnosis at discharge"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Discharge Summary</label>
          <textarea
            rows={4}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
            value={dischargeSummary}
            onChange={(e) => setDischargeSummary(e.target.value)}
            placeholder="Summary of hospital course, treatment provided, follow-up instructions..."
          />
        </div>
      </form>
    </Modal>
  );
}