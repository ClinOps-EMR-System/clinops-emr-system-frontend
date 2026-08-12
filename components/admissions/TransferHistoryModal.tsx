"use client";

import { useState, useEffect, useCallback } from "react";
import Modal from "../ui/Modal";
import { api } from "@/lib/api";
import { useAuth } from "@/store/RoleContext";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { MapPin, User, Clock, AlertCircle } from "lucide-react";
import type { Admission, AdmissionTransfer, WardSummary as Ward, BedSummary as Bed } from "../../types/admission";

interface TransferHistoryModalProps {
  open: boolean;
  admission: Admission;
  wards: Ward[];
  onClose: () => void;
  onTransferred: () => void;
}

interface JourneyStep {
  ward?: Ward | null;
  bed?: Bed | null;
  date?: string;
  reason?: string | null;
  by?: string | null;
  isCurrent?: boolean;
}

export function TransferHistoryModal({ open, admission, wards, onClose, onTransferred }: TransferHistoryModalProps) {
  const { token } = useAuth();

  const [transfers, setTransfers] = useState<AdmissionTransfer[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [wardId, setWardId] = useState(admission.ward_id?.toString() ?? "");
  const [bedId, setBedId] = useState("");
  const [reason, setReason] = useState("");
  const [beds, setBeds] = useState<Bed[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.get(`/admissions/${admission.id}/transfers`, token);
      const list = Array.isArray(res?.data) ? res.data : [];
      setTransfers(list);
    } catch (err: unknown) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load transfer history");
    } finally {
      setHistoryLoading(false);
    }
  }, [token, admission.id]);

  const fetchBeds = useCallback(async () => {
    if (!token || !wardId) return;
    try {
      const res = await api.get(`/wards/${wardId}/beds`, token);
      const list = Array.isArray(res?.data) ? res.data : [];
      setBeds(list.filter((b: Bed) => b.occupancy_status === "Available"));
    } catch {
      setBeds([]);
    }
  }, [token, wardId]);

  useEffect(() => {
    if (!open) return;
    fetchHistory(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [open, fetchHistory]);

  useEffect(() => {
    if (!open || !wardId) return;
    setBedId(""); // eslint-disable-line react-hooks/set-state-in-effect
    fetchBeds();
  }, [open, wardId, fetchBeds]);

  const journeySteps: JourneyStep[] = (() => {
    if (transfers.length === 0) {
      return [{
        ward: admission.ward,
        bed: admission.bed,
        date: admission.admission_date,
        reason: "Admitted",
        isCurrent: true,
      }];
    }

    const first = transfers[0];
    const steps: JourneyStep[] = [{
      ward: first.from_ward ?? admission.ward,
      bed: first.from_bed ?? admission.bed,
      date: admission.admission_date,
      reason: "Admitted",
    }];

    transfers.forEach((t, i) => {
      steps.push({
        ward: t.to_ward,
        bed: t.to_bed,
        date: t.transferred_at,
        reason: t.reason,
        by: t.transferred_by_name,
        isCurrent: i === transfers.length - 1,
      });
    });

    return steps;
  })();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bedId) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await api.post(
        `/admissions/${admission.id}/transfer`,
        { ward_id: Number(wardId), bed_id: Number(bedId), reason },
        token
      );
      onTransferred();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to transfer patient");
    } finally {
      setSubmitting(false);
    }
  }

  const patientName = admission.patient
    ? `${admission.patient.first_name} ${admission.patient.last_name}`
    : `Admission #${admission.id}`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Transfer Patient"
      subtitle={patientName}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || !bedId} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">
            {submitting ? "Transferring..." : "Transfer Patient"}
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Location Journey Line */}
        <div>
          <h4 className="text-xs font-bold text-[#3e4a3b] uppercase tracking-wide mb-3 flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-clinical-primary" />
            Location Journey
          </h4>

          {historyLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-5 w-5 rounded-full shrink-0" />
                  <Skeleton className="h-14 w-full rounded-md" />
                </div>
              ))}
            </div>
          ) : historyError ? (
            <div className="p-3 rounded bg-red-50 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {historyError}
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-clinical-primary/30 space-y-4">
              {journeySteps.map((step, i) => {
                const stepDate = step.date ? parseISO(step.date) : null;
                return (
                  <div key={i} className="relative">
                    <div className={`absolute -left-[31px] top-1 size-5 rounded-full border-2 flex items-center justify-center ${
                      step.isCurrent
                        ? "bg-clinical-primary border-clinical-primary"
                        : "bg-white border-clinical-primary/40"
                    }`}>
                      <div className={`size-2 rounded-full ${step.isCurrent ? "bg-white" : "bg-clinical-primary/50"}`} />
                    </div>
                    <div className={`rounded-md border px-3 py-2.5 ${step.isCurrent ? "bg-clinical-primary/5 border-clinical-primary/30" : "bg-white border-gray-200"}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-800">
                          {step.ward?.name ?? "Unknown Ward"} / Bed {step.bed?.bed_number ?? "—"}
                        </span>
                        {step.isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-clinical-primary">Current</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                        {stepDate && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(stepDate, "PPP 'at' p")}
                          </span>
                        )}
                        {step.by && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {step.by}
                          </span>
                        )}
                      </div>
                      {step.reason && (
                        <p className="mt-1.5 text-xs text-gray-600">{step.reason}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Transfer Form */}
        <form onSubmit={handleSubmit} className="space-y-4 border-t border-gray-100 pt-4">
          {submitError && <div className="p-3 rounded bg-red-50 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {submitError}
          </div>}

          <div>
            <label htmlFor="field-transfer-ward" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Target Ward *</label>
            <select
              id="field-transfer-ward"
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
            <label htmlFor="field-transfer-bed" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Target Bed *</label>
            <select
              id="field-transfer-bed"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm focus:outline-none focus:border-clinical-primary disabled:bg-gray-50 disabled:text-gray-500"
              value={bedId}
              onChange={(e) => setBedId(e.target.value)}
              disabled={!wardId || beds.length === 0}
            >
              <option value="">{beds.length === 0 ? "No available beds in this ward" : "Select an available bed"}</option>
              {beds.map((b) => (
                <option key={b.id} value={b.id}>Bed {b.bed_number}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="field-transfer-reason" className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Transfer Reason</label>
            <textarea
              id="field-transfer-reason"
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason for transfer, patient condition, etc."
            />
          </div>
        </form>
      </div>
    </Modal>
  );
}
