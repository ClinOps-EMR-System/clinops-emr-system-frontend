"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../store/RoleContext";
import { api } from "../../../lib/api";
import StatusBadge from "../../../components/ui/StatusBadge";
import EmptyState from "../../../components/ui/EmptyState";
import LoadingState from "../../../components/ui/LoadingState";
import Modal from "../../../components/ui/Modal";
import { FlaskConical, Search, Clock, AlertTriangle, Plus } from "lucide-react";

interface LabOrder {
  id: number;
  patient_id: number;
  encounter_id: number;
  order_type: string;
  clinical_indication: string | null;
  priority: string;
  status: string;
  created_at: string;
  patient?: {
    first_name: string;
    last_name: string;
    hospital_number: string;
  };
  lab_request?: {
    id: number;
    test_name: string;
    loinc_code: string | null;
    specimen_type: string | null;
    status: string;
  };
}

interface LabResult {
  id: number;
  lab_request_id: number;
  result_value_text: string | null;
  result_value_numeric: number | null;
  unit: string | null;
  reference_range: string | null;
  is_abnormal: boolean;
  is_critical: boolean;
  verified_by: number | null;
  verified_at: string | null;
  created_at: string;
  lab_request?: {
    id: number;
    test_name: string;
    patient_id: number;
    patient?: {
      first_name: string;
      last_name: string;
      hospital_number: string;
    };
  };
}

export default function LabPage() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "results" | "verified">("pending");
  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<LabOrder | null>(null);
  const [resultForm, setResultForm] = useState({ result_value_text: "", result_value_numeric: "", unit: "", reference_range: "", interpretation: "", is_abnormal: false, is_critical: false });
  const [submitting, setSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);
      const [ordersRes, resultsRes] = await Promise.all([
        api.get("/orders", token),
        api.get("/lab-results", token),
      ]);
      if (ordersRes && ordersRes.data) {
        const allOrders = ordersRes.data.data || ordersRes.data;
        const labOrders = (Array.isArray(allOrders) ? allOrders : []).filter(
          (o: LabOrder) => o.order_type?.toLowerCase() === "lab"
        );
        setOrders(labOrders);
      }
      if (resultsRes && resultsRes.data) {
        const allResults = resultsRes.data.data || resultsRes.data;
        setResults(Array.isArray(allResults) ? allResults : []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load lab data");
    } finally {
      setLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (token) fetchData();
  }, [token]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = !searchQuery ||
      o.lab_request?.test_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.patient?.hospital_number?.includes(searchQuery) ||
      o.patient?.first_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const pendingOrders = filteredOrders.filter((o) => o.status?.toLowerCase() === "pending" || o.status?.toLowerCase() === "ordered");
  const inProgressOrders = filteredOrders.filter((o) => o.status?.toLowerCase() === "in_progress" || o.status?.toLowerCase() === "collected");

  const handleSubmitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    const labRequestId = selectedOrder.lab_request?.id;
    if (!labRequestId) {
      setError("No lab request found for this order.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        lab_request_id: labRequestId,
        unit: resultForm.unit || null,
        reference_range: resultForm.reference_range || null,
        is_abnormal: resultForm.is_abnormal,
        is_critical: resultForm.is_critical,
      };
      if (resultForm.result_value_numeric && !isNaN(parseFloat(resultForm.result_value_numeric))) {
        payload.result_value_numeric = parseFloat(resultForm.result_value_numeric);
      } else {
        payload.result_value_text = resultForm.result_value_text;
      }
      await api.post("/lab-results", payload, token);
      setResultModalOpen(false);
      setSelectedOrder(null);
      setResultForm({ result_value_text: "", result_value_numeric: "", unit: "", reference_range: "", interpretation: "", is_abnormal: false, is_critical: false });
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit result");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 font-sans">
      <section className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <span className="text-xs font-bold text-brand-green tracking-widest uppercase">Laboratory</span>
          <h1 className="text-3xl font-bold text-[#1b1c1c] mt-1">Lab Orders & Results</h1>
          <p className="text-sm text-[#5f5e5e] mt-1">Process orders, enter results, and verify reports</p>
        </div>
        <Link
          href="/lab/request"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover"
        >
          <Plus className="h-4 w-4" /> New Lab Request
        </Link>
      </section>

      {/* Metric Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-amber-100 flex items-center justify-center">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Pending Orders</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : pendingOrders.length}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-sky-100 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">In Progress</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">{loading ? "..." : inProgressOrders.length}</p>
          </div>
        </div>
        <div className="bg-white rounded border border-[#becab7]/50 p-5 flex items-center gap-4">
          <div className="h-10 w-10 rounded bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Critical Results</p>
            <p className="text-2xl font-extrabold text-[#1b1c1c] font-mono">
              {loading ? "..." : results.filter((r) => r.is_critical && !r.verified_at).length}
            </p>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="flex gap-1 bg-white rounded border border-[#becab7]/50 p-1" role="tablist" aria-label="Lab orders views">
        {[
          { key: "pending" as const, label: "Pending Orders", count: pendingOrders.length },
          { key: "results" as const, label: "Results Entry", count: inProgressOrders.length },
          { key: "verified" as const, label: "Verified Results", count: results.filter((r) => r.verified_at).length },
        ].map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-3 text-sm font-bold rounded transition-all min-h-[44px] ${
              activeTab === tab.key
                ? "bg-clinical-primary text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </section>

      {/* Search */}
      <section className="bg-white rounded border border-[#becab7]/50 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by test name, patient name, or hospital #..."
            aria-label="Search lab orders"
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </section>

      {/* Content */}
      <section className="bg-white rounded border border-[#becab7]/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center">
          <div className="w-1.5 h-6 bg-brand-green rounded-full mr-3"></div>
          <h2 className="text-lg font-bold text-gray-900">
            {activeTab === "pending" ? "Pending Lab Orders" : activeTab === "results" ? "Results Entry" : "Verified Results"}
          </h2>
        </div>

        {loading ? (
          <LoadingState message="Loading lab data..." />
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-[#fcf9f8] sticky top-0 z-10">
                <tr className="divide-x divide-gray-200/50">
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Patient</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Test</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-[#5f5e5e] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {activeTab === "pending" && (
                  pendingOrders.length === 0 ? (
                    <tr><td colSpan={5}><EmptyState icon={<FlaskConical className="h-6 w-6 text-gray-400" />} title="No pending orders" description="All lab orders have been processed" /></td></tr>
                  ) : pendingOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : `Patient #${order.patient_id}`}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{order.patient?.hospital_number}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{order.lab_request?.test_name || "—"}</div>
                        {order.lab_request?.loinc_code && <div className="text-xs text-gray-400 font-mono">LOINC: {order.lab_request.loinc_code}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge label={order.priority} variant={order.priority?.toLowerCase() === "stat" ? "error" : order.priority?.toLowerCase() === "urgent" ? "warning" : "info"} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge label={order.status} variant="warning" pulse />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => { setSelectedOrder(order); setResultModalOpen(true); }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider cursor-pointer"
                          >
                            <Plus className="h-3 w-3" /> Enter Result
                          </button>
                          <Link href={`/patients/${order.patient_id}`} className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider">
                            Profile
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

                {activeTab === "results" && (
                  inProgressOrders.length === 0 ? (
                    <tr><td colSpan={5}><EmptyState title="No results pending entry" description="All collected samples have results entered" /></td></tr>
                  ) : inProgressOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {order.patient ? `${order.patient.first_name} ${order.patient.last_name}` : `Patient #${order.patient_id}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{order.lab_request?.test_name || "—"}</td>
                      <td className="px-6 py-4"><StatusBadge label={order.priority} variant="info" /></td>
                      <td className="px-6 py-4"><StatusBadge label={order.status} variant="info" /></td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => { setSelectedOrder(order); setResultModalOpen(true); }}
                          className="text-xs font-bold text-clinical-primary hover:text-clinical-primary-hover uppercase tracking-wider cursor-pointer"
                        >
                          Enter Result
                        </button>
                      </td>
                    </tr>
                  ))
                )}

                {activeTab === "verified" && (
                  results.filter((r) => r.verified_at).length === 0 ? (
                    <tr><td colSpan={5}><EmptyState title="No verified results" description="Results will appear here after verification" /></td></tr>
                  ) : results.filter((r) => r.verified_at).map((result) => (
                    <tr key={result.id} className="hover:bg-[#fcf9f8]/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {result.lab_request?.patient ? `${result.lab_request.patient.first_name} ${result.lab_request.patient.last_name}` : `Patient #${result.lab_request?.patient_id}`}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">{result.lab_request?.test_name}</td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-bold">{result.result_value_numeric ?? result.result_value_text ?? "—"}</span>
                        {result.unit && <span className="text-xs text-gray-400 ml-1">{result.unit}</span>}
                        {result.is_abnormal && <StatusBadge label="Abnormal" variant="warning" className="ml-2" />}
                        {result.is_critical && <StatusBadge label="Critical" variant="error" pulse className="ml-2" />}
                      </td>
                      <td className="px-6 py-4"><StatusBadge label="Verified" variant="success" /></td>
                      <td className="px-6 py-4">
                        <Link href={`/patients/${result.lab_request?.patient_id}`} className="text-xs font-bold text-teal-600 hover:text-teal-800 uppercase tracking-wider">
                          Profile
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Enter Result Modal */}
      <Modal
        open={resultModalOpen}
        onClose={() => { setResultModalOpen(false); setSelectedOrder(null); }}
        title="Enter Lab Result"
        subtitle={selectedOrder ? `${selectedOrder.lab_request?.test_name || "Lab Test"} for Patient #${selectedOrder.patient_id}` : ""}
        size="lg"
        footer={
          <>
            <button onClick={() => { setResultModalOpen(false); setSelectedOrder(null); }} className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSubmitResult} disabled={submitting || (!resultForm.result_value_text.trim() && !resultForm.result_value_numeric.trim())} className="px-4 py-2 text-sm font-bold text-white bg-clinical-primary rounded hover:bg-clinical-primary-hover disabled:opacity-50">
              {submitting ? "Submitting..." : "Submit Result"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSubmitResult} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Numeric Result</label>
              <input
                type="number"
                step="any"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={resultForm.result_value_numeric}
                onChange={(e) => setResultForm({ ...resultForm, result_value_numeric: e.target.value })}
                placeholder="e.g., 12.5, 120"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Text Result</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={resultForm.result_value_text}
                onChange={(e) => setResultForm({ ...resultForm, result_value_text: e.target.value })}
                placeholder="e.g., Positive, 120/80"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Unit</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={resultForm.unit}
                onChange={(e) => setResultForm({ ...resultForm, unit: e.target.value })}
                placeholder="e.g., g/dL, mmol/L"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Reference Range</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={resultForm.reference_range}
                onChange={(e) => setResultForm({ ...resultForm, reference_range: e.target.value })}
                placeholder="e.g., 12.0-16.0"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#3e4a3b] uppercase tracking-wide">Interpretation</label>
              <input
                type="text"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-clinical-primary focus:ring-1 focus:ring-clinical-primary"
                value={resultForm.interpretation}
                onChange={(e) => setResultForm({ ...resultForm, interpretation: e.target.value })}
                placeholder="Clinical interpretation"
              />
            </div>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={resultForm.is_abnormal}
                onChange={(e) => setResultForm({ ...resultForm, is_abnormal: e.target.checked })}
                className="rounded border-gray-300 text-clinical-primary focus:ring-clinical-primary"
              />
              <span className="font-semibold text-gray-700">Abnormal Result</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={resultForm.is_critical}
                onChange={(e) => setResultForm({ ...resultForm, is_critical: e.target.checked })}
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
              />
              <span className="font-semibold text-gray-700">Critical Result</span>
            </label>
          </div>
          {resultForm.is_critical && (
            <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 font-semibold">
              Critical results require immediate clinician notification and acknowledgment workflow.
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
