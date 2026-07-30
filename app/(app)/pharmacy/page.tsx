"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";
import Modal from "../../../components/ui/Modal";
import { Pill, Search, CheckCircle, Clock, AlertTriangle } from "lucide-react";

interface Prescription {
  id: number;
  patient_id: number;
  encounter_id: number;
  drug_id: number;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity_dispensed: number | null;
  status: string;
  notes: string | null;
  dispensed_at: string | null;
  dispensed_by: number | null;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  drug?: {
    name: string;
    is_controlled: boolean;
    formulation: string;
    strength: string;
  };
  prescribedBy?: {
    name: string;
  };
}

interface StockBatch {
  id: number;
  batch_number: string;
  expiry_date: string;
  quantity_remaining: number;
}

export default function PharmacyPage() {
  const { token } = useAuth();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [dispensing, setDispensing] = useState(false);

  const [stockBatches, setStockBatches] = useState<StockBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  const [dispenseQuantity, setDispenseQuantity] = useState<number>(1);
  const [batchesLoading, setBatchesLoading] = useState(false);

  async function fetchPrescriptions() {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get("/prescriptions", token);
      if (res && res.data) {
        setPrescriptions(Array.isArray(res.data) ? res.data : res.data.data || []);
      }
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 404) {
        setError("Prescription management is not yet configured on the backend. The pharmacy module will be available once the backend is updated.");
      } else {
        setError(apiError.message || "Failed to load prescriptions");
      }
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (token) fetchPrescriptions();
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const filteredPrescriptions = prescriptions.filter((rx) => {
    const matchesSearch = !searchQuery ||
      rx.drug?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.patient?.hospital_number?.includes(searchQuery) ||
      rx.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.patient?.last_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || rx.status?.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  const pendingCount = prescriptions.filter((rx) => rx.status?.toLowerCase() === "prescribed" || rx.status?.toLowerCase() === "active").length;
  const verifiedCount = prescriptions.filter((rx) => rx.status?.toLowerCase() === "verified").length;
  const dispensedCount = prescriptions.filter((rx) => rx.status?.toLowerCase() === "dispensed").length;
  const controlledCount = prescriptions.filter((rx) => rx.drug?.is_controlled && rx.status?.toLowerCase() !== "dispensed").length;

  const openDispenseModal = async (rx: Prescription) => {
    setSelectedPrescription(rx);
    setSelectedBatchId(null);
    setDispenseQuantity(1);
    setDispenseModalOpen(true);

    if (rx.drug_id) {
      setBatchesLoading(true);
      try {
        const res = await api.get(`/stock/${rx.drug_id}/batches`, token);
        const batches = res?.data?.data ?? res?.data ?? [];
        setStockBatches(Array.isArray(batches) ? batches : []);
        if (batches.length > 0) {
          setSelectedBatchId(batches[0].id);
        }
      } catch {
        setStockBatches([]);
      } finally {
        setBatchesLoading(false);
      }
    }
  };

  const handleDispense = async () => {
    if (!selectedPrescription || !selectedBatchId) return;
    setDispensing(true);
    try {
      if (selectedPrescription.status?.toLowerCase() === "prescribed") {
        await api.post(`/prescriptions/${selectedPrescription.id}/verify`, {}, token);
      }
      await api.post(`/prescriptions/${selectedPrescription.id}/dispense`, {
        items: [
          {
            stock_batch_id: selectedBatchId,
            quantity: dispenseQuantity,
          },
        ],
      }, token);
      setDispenseModalOpen(false);
      setSelectedPrescription(null);
      fetchPrescriptions();
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      if (apiError.status === 404) {
        setError("Dispensing endpoint is not yet configured on the backend.");
      } else {
        setError(apiError.message || "Failed to dispense");
      }
    } finally {
      setDispensing(false);
    }
  };

  const handleVerify = async (rx: Prescription) => {
    try {
      setError(null);
      await api.post(`/prescriptions/${rx.id}/verify`, {}, token);
      fetchPrescriptions();
    } catch (err: unknown) {
      const apiError = err as { status?: number; message?: string };
      setError(apiError.message || "Failed to verify");
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Pharmacy</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Prescription Queue</h1>
          <p className="text-sm text-[#5f5e5e] mt-1">View, verify, and dispense patient prescriptions</p>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">{error}</div>
      )}

      {/* Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-amber-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : pendingCount}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Verified</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : verifiedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Dispensed</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : dispensedCount}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Controlled</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : controlledCount}</p>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="bg-white rounded border border-[#becab7]/50 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by drug name, patient name, or hospital #..."
              aria-label="Search prescriptions"
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
            <option value="prescribed">Prescribed</option>
            <option value="verified">Verified</option>
            <option value="active">Active</option>
            <option value="dispensed">Dispensed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </section>

      {/* Prescriptions Table */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">Prescriptions</h2>
        </div>

        {loading ? (
          <LoadingState message="Loading prescriptions..." />
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : filteredPrescriptions.length === 0 ? (
          <EmptyState
            icon={<Pill className="h-6 w-6 text-gray-400" />}
            title="No prescriptions found"
            description={searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "No prescriptions have been created yet"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Drug</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider hidden md:table-cell">Dosage &amp; Route</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider hidden lg:table-cell">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredPrescriptions.map((rx) => (
                  <tr key={rx.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">
                        {rx.patient ? `${rx.patient.first_name} ${rx.patient.last_name}` : `Patient #${rx.patient_id}`}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{rx.patient?.hospital_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{rx.drug?.name || "—"}</div>
                      {rx.drug?.is_controlled && (
                        <StatusBadge label="Controlled" variant="error" size="sm" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono hidden md:table-cell">{rx.dosage} {rx.route}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">{rx.frequency}</td>
                    <td className="px-6 py-4">
                      <StatusBadge label={rx.status} variant={
                        rx.status?.toLowerCase() === "dispensed" ? "success" :
                        rx.status?.toLowerCase() === "verified" ? "info" :
                        rx.status?.toLowerCase() === "prescribed" || rx.status?.toLowerCase() === "active" ? "warning" : "neutral"
                      } />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {rx.status?.toLowerCase() === "prescribed" && (
                          <button
                            onClick={() => handleVerify(rx)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider cursor-pointer"
                          >
                            Verify
                          </button>
                        )}
                        {(rx.status?.toLowerCase() === "verified" || rx.status?.toLowerCase() === "prescribed") && (
                          <button
                            onClick={() => openDispenseModal(rx)}
                            className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider cursor-pointer"
                          >
                            Dispense
                          </button>
                        )}
                        <Link
                          href={`/patients/${rx.patient_id}`}
                          className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider"
                        >
                          Profile
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Dispense Modal */}
      <Modal
        open={dispenseModalOpen}
        onClose={() => { setDispenseModalOpen(false); setSelectedPrescription(null); }}
        title="Confirm Dispensing"
        subtitle="Select stock batch and quantity to dispense"
        footer={
          <>
            <button
              onClick={() => { setDispenseModalOpen(false); setSelectedPrescription(null); }}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDispense}
              disabled={dispensing || !selectedBatchId || dispenseQuantity < 1}
              className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover transition-colors disabled:opacity-50"
            >
              {dispensing ? "Dispensing..." : "Confirm Dispense"}
            </button>
          </>
        }
      >
        {selectedPrescription && (
          <div className="space-y-4">
            <div className="bg-[#fcf9f8] rounded p-4 border border-gray-200/50">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Prescription Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-400 text-xs">Patient:</span>
                  <p className="font-semibold text-gray-900">
                    {selectedPrescription.patient ? `${selectedPrescription.patient.first_name} ${selectedPrescription.patient.last_name}` : `#${selectedPrescription.patient_id}`}
                  </p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Hospital #:</span>
                  <p className="font-semibold text-gray-900 font-mono">{selectedPrescription.patient?.hospital_number}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Drug:</span>
                  <p className="font-semibold text-gray-900">{selectedPrescription.drug?.name || "—"}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Dosage:</span>
                  <p className="font-semibold text-gray-900 font-mono">{selectedPrescription.dosage} {selectedPrescription.route}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Frequency:</span>
                  <p className="font-semibold text-gray-900">{selectedPrescription.frequency}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Duration:</span>
                  <p className="font-semibold text-gray-900">{selectedPrescription.duration}</p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200/50 rounded p-4 space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Dispense Details</h4>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Stock Batch</label>
                {batchesLoading ? (
                  <div className="text-sm text-gray-400">Loading batches...</div>
                ) : stockBatches.length === 0 ? (
                  <div className="text-sm text-red-500">No stock batches available for this drug.</div>
                ) : (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:border-clinical-primary"
                    value={selectedBatchId ?? ""}
                    onChange={(e) => setSelectedBatchId(Number(e.target.value))}
                  >
                    {stockBatches.map((batch) => (
                      <option key={batch.id} value={batch.id}>
                        {batch.batch_number} — {batch.quantity_remaining} units
                        {new Date(batch.expiry_date) < new Date() ? " (EXPIRED)" : ` (exp: ${new Date(batch.expiry_date).toLocaleDateString()})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Quantity to Dispense</label>
                <input
                  type="number"
                  min={1}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary"
                  value={dispenseQuantity}
                  onChange={(e) => setDispenseQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              {selectedPrescription.drug?.is_controlled && (
                <div>
                  <StatusBadge label="Controlled Substance — Audit Trail Required" variant="error" size="md" />
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
