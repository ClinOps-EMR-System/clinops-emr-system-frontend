"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import type { WardSummary as Ward } from "../../types/admission";
import type { TransferFormData } from "../../types/admission";

interface TransferFormProps {
  admissionId: number;
  currentWardId: number;
  currentBedId: number;
  wards: Ward[];
  onSubmit: (data: TransferFormData) => void;
  onClose: () => void;
  submitting: boolean;
}

export function TransferForm({
  admissionId,
  currentWardId,
  currentBedId,
  wards,
  onSubmit,
  onClose,
  submitting,
}: TransferFormProps) {
  const [wardId, setWardId] = useState(currentWardId.toString());
  const [bedId, setBedId] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ward_id: wardId, bed_id: bedId, notes });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Transfer Patient"
      subtitle={`Moving admission #${admissionId}`}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !bedId} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">
            {submitting ? "Transferring..." : "Transfer Patient"}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Target Ward *</label>
          <select
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary"
            value={wardId}
            onChange={(e) => setWardId(e.target.value)}
          >
            {wards.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Target Bed *</label>
          <input
            type="number"
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
            value={bedId}
            onChange={(e) => setBedId(e.target.value)}
            placeholder="Bed number"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Transfer Notes</label>
          <textarea
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for transfer, patient condition, etc."
          />
        </div>
      </form>
    </Modal>
  );
}